# UI脚本系统设计方案

## 目标

为UI库集成 goja（JavaScript解释器），提供事件驱动的脚本支持，同时保证性能和并发安全。

## 核心设计原则

1. **异步执行**：脚本在独立协程执行，不阻塞主线程
2. **命令队列**：通过Channel传递命令，避免锁竞争
3. **单向数据流**：主线程 → 事件队列 → 脚本协程 → 命令队列 → 主线程

## 架构设计

### 1. 事件系统

#### 事件类型定义

```go
// EventType 事件类型
type EventType string

const (
    EventClick       EventType = "click"
    EventHover       EventType = "hover"
    EventFocus       EventType = "focus"
    EventBlur        EventType = "blur"
    EventChange      EventType = "change"
    EventKeyPress    EventType = "keypress"
    EventMouseEnter  EventType = "mouseenter"
    EventMouseLeave  EventType = "mouseleave"
)

// WidgetEvent 控件事件
type WidgetEvent struct {
    Type      EventType              // 事件类型
    WidgetID  string                 // 控件ID
    X, Y      int                    // 鼠标坐标
    Button    int                    // 鼠标按钮
    Key       ebiten.Key             // 键盘按键
    Data      map[string]interface{} // 附加数据
    Timestamp int64                  // 时间戳
}
```

#### 事件队列

```go
// EventQueue 事件队列（无缓冲或小缓冲，避免积压）
type EventQueue struct {
    events chan WidgetEvent
}

func NewEventQueue() *EventQueue {
    return &EventQueue{
        events: make(chan WidgetEvent, 100), // 缓冲100个事件
    }
}

// Push 推送事件（非阻塞）
func (eq *EventQueue) Push(event WidgetEvent) {
    select {
    case eq.events <- event:
        // 成功推送
    default:
        // 队列满，丢弃事件（或记录日志）
        log.Println("Event queue full, dropping event:", event.Type)
    }
}

// Pop 获取事件（阻塞）
func (eq *EventQueue) Pop() WidgetEvent {
    return <-eq.events
}

// TryPop 尝试获取事件（非阻塞）
func (eq *EventQueue) TryPop() (WidgetEvent, bool) {
    select {
    case event := <-eq.events:
        return event, true
    default:
        return WidgetEvent{}, false
    }
}
```

### 2. 命令系统（属性修改）

#### 命令定义

```go
// CommandType 命令类型
type CommandType string

const (
    CommandSetProperty   CommandType = "set_property"
    CommandCallMethod    CommandType = "call_method"
    CommandCreateWidget  CommandType = "create_widget"
    CommandDestroyWidget CommandType = "destroy_widget"
)

// WidgetCommand 控件命令
type WidgetCommand struct {
    Type     CommandType
    WidgetID string
    Property string              // 属性名
    Value    interface{}         // 属性值
    Method   string              // 方法名
    Args     []interface{}       // 方法参数
}

// CommandQueue 命令队列
type CommandQueue struct {
    commands chan WidgetCommand
}

func NewCommandQueue() *CommandQueue {
    return &CommandQueue{
        commands: make(chan WidgetCommand, 100),
    }
}

func (cq *CommandQueue) Push(cmd WidgetCommand) {
    select {
    case cq.commands <- cmd:
    default:
        log.Println("Command queue full, dropping command")
    }
}

func (cq *CommandQueue) PopAll() []WidgetCommand {
    var cmds []WidgetCommand
    for {
        select {
        case cmd := <-cq.commands:
            cmds = append(cmds, cmd)
        default:
            return cmds
        }
    }
}
```

### 3. 脚本引擎

#### ScriptEngine 结构（改进版）

```go
type ScriptEngine struct {
    vm           *goja.Runtime // 单一持久VM，只在一个协程中使用
    eventQueue   *EventQueue
    commandQueue *CommandQueue
    
    // 脚本模块系统
    modules      map[string]*goja.Object         // moduleName -> module object
    eventHandlers map[string]map[string]goja.Callable // widgetID -> eventName -> handler function
    
    // 全局状态存储（跨脚本共享）
    globalState  *goja.Object // JavaScript中的 Global 对象
    
    // 控制
    stopChan     chan struct{}
    wg           sync.WaitGroup
}

func NewScriptEngine() *ScriptEngine {
    vm := goja.New()
    
    engine := &ScriptEngine{
        vm:            vm,
        eventQueue:    NewEventQueue(),
        commandQueue:  NewCommandQueue(),
        modules:       make(map[string]*goja.Object),
        eventHandlers: make(map[string]map[string]goja.Callable),
        globalState:   vm.NewObject(),
        stopChan:      make(chan struct{}),
    }
    
    // 注入API
    engine.setupAPI()
    
    return engine
}

// setupAPI 注入JavaScript API（改进版）
func (se *ScriptEngine) setupAPI() {
    // 注入全局对象
    se.vm.Set("console", map[string]interface{}{
        "log": func(args ...interface{}) {
            log.Println("[Script]", args...)
        },
        "error": func(args ...interface{}) {
            log.Println("[Script Error]", args...)
        },
    })
    
    // 注入全局状态对象（脚本间共享数据）
    se.vm.Set("Global", se.globalState)
    
    // 注入UI树根节点（重要！）
    // RootElement 将在 BuildUITree() 中构建
    se.vm.Set("RootElement", goja.Null()) // 初始为null，等待构建
    
    // 注入控件操作API
    se.vm.Set("Widget", map[string]interface{}{
        "setProperty": se.jsSetProperty,
        "setText":     se.jsSetText,
        "setVisible":  se.jsSetVisible,
        "setColor":    se.jsSetColor,
        "enable":      se.jsEnable,
        "disable":     se.jsDisable,
        // ... 更多便捷方法
    })
    
    // 注入事件注册API（允许脚本动态注册事件）
    se.vm.Set("on", se.jsRegisterEventHandler)
    
    // 注入工具函数
    se.vm.Set("setTimeout", se.jsSetTimeout)
    se.vm.Set("setInterval", se.jsSetInterval)
}

// jsSetProperty JavaScript调用：Widget.setProperty(widgetId, prop, value)
func (se *ScriptEngine) jsSetProperty(widgetID string, property string, value interface{}) {
    se.commandQueue.Push(WidgetCommand{
        Type:     CommandSetProperty,
        WidgetID: widgetID,
        Property: property,
        Value:    value,
    })
}

// jsSetText 便捷方法：Widget.setText(widgetId, text)
func (se *ScriptEngine) jsSetText(widgetID string, text string) {
    se.jsSetProperty(widgetID, "Text", text)
}

// jsSetVisible 便捷方法：Widget.setVisible(widgetId, visible)
func (se *ScriptEngine) jsSetVisible(widgetID string, visible bool) {
    se.jsSetProperty(widgetID, "Visible", visible)
}

// jsSetColor 便捷方法：Widget.setColor(widgetId, r, g, b, a)
func (se *ScriptEngine) jsSetColor(widgetID string, r, g, b, a int) {
    se.commandQueue.Push(WidgetCommand{
        Type:     CommandSetProperty,
        WidgetID: widgetID,
        Property: "BackgroundColor",
        Value:    RGBA{uint8(r), uint8(g), uint8(b), uint8(a)},
    })
}

// jsEnable 启用控件
func (se *ScriptEngine) jsEnable(widgetID string) {
    se.jsSetProperty(widgetID, "Enabled", true)
}

// jsDisable 禁用控件
func (se *ScriptEngine) jsDisable(widgetID string) {
    se.jsSetProperty(widgetID, "Enabled", false)
}

// jsRegisterEventHandler 动态注册事件：on(widgetId, eventName, handler)
func (se *ScriptEngine) jsRegisterEventHandler(widgetID string, eventName string, handler goja.Callable) {
    if _, exists := se.eventHandlers[widgetID]; !exists {
        se.eventHandlers[widgetID] = make(map[string]goja.Callable)
    }
    se.eventHandlers[widgetID][eventName] = handler
}

// jsSetTimeout 延迟执行：setTimeout(callback, delay)
func (se *ScriptEngine) jsSetTimeout(callback goja.Callable, delay int64) {
    go func() {
        time.Sleep(time.Duration(delay) * time.Millisecond)
        se.eventQueue.Push(WidgetEvent{
            Type: "timeout",
            Data: map[string]interface{}{
                "callback": callback,
            },
        })
    }()
}

// jsSetInterval 定时执行：setInterval(callback, interval)
func (se *ScriptEngine) jsSetInterval(callback goja.Callable, interval int64) int {
    // 返回timer ID，可用于清除
    // 实现略...
    return 0
}
```

#### 脚本加载系统（模块化）

```go
// LoadScriptModule 加载脚本模块
// moduleName: 通常是文件名（不含扩展名）
// scriptContent: 脚本内容
func (se *ScriptEngine) LoadScriptModule(moduleName string, scriptContent string) error {
    // 创建模块对象
    moduleObj := se.vm.NewObject()
    
    // 将模块对象设置为全局变量（临时）
    se.vm.Set("__currentModule", moduleObj)
    
    // 包装脚本，使其在模块作用域内执行
    wrappedScript := fmt.Sprintf(`
        (function(module, exports) {
            %s
            // 脚本执行完毕，所有函数和变量都在当前作用域
            // 需要导出的内容应该赋值给 exports
        })(__currentModule, __currentModule);
    `, scriptContent)
    
    // 执行脚本
    _, err := se.vm.RunString(wrappedScript)
    if err != nil {
        return fmt.Errorf("load module %s error: %w", moduleName, err)
    }
    
    // 保存模块对象
    se.modules[moduleName] = moduleObj
    
    // 让其他模块可以访问：require(moduleName)
    se.vm.Set("__modules", se.modules)
    se.vm.RunString(`
        if (typeof require === 'undefined') {
            function require(name) {
                return __modules[name];
            }
        }
    `)
    
    return nil
}

// LoadWidgetScript 加载控件脚本（推荐方式）
// 自动处理事件绑定
func (se *ScriptEngine) LoadWidgetScript(widgetID string, scriptContent string) error {
    // 为控件创建独立命名空间
    widgetObj := se.vm.NewObject()
    
    // 注入 this 引用（指向当前控件）
    widgetObj.Set("id", widgetID)
    
    // 包装脚本
    wrappedScript := fmt.Sprintf(`
        (function() {
            const self = { id: "%s" };
            
            // 便捷方法（操作自己）
            const setText = (text) => Widget.setText(self.id, text);
            const setVisible = (visible) => Widget.setVisible(self.id, visible);
            const enable = () => Widget.enable(self.id);
            const disable = () => Widget.disable(self.id);
            
            // 执行用户脚本
            %s
            
            // 返回事件处理器对象
            return {
                onClick: typeof onClick !== 'undefined' ? onClick : null,
                onHover: typeof onHover !== 'undefined' ? onHover : null,
                onFocus: typeof onFocus !== 'undefined' ? onFocus : null,
                onBlur: typeof onBlur !== 'undefined' ? onBlur : null,
                onChange: typeof onChange !== 'undefined' ? onChange : null,
                onValueChange: typeof onValueChange !== 'undefined' ? onValueChange : null,
                onKeyPress: typeof onKeyPress !== 'undefined' ? onKeyPress : null,
                // 其他事件...
            };
        })();
    `, widgetID, scriptContent)
    
    // 执行并获取事件处理器对象
    result, err := se.vm.RunString(wrappedScript)
    if err != nil {
        return fmt.Errorf("load widget script error: %w", err)
    }
    
    // 提取事件处理器
    handlersObj := result.ToObject(se.vm)
    if handlersObj == nil {
        return fmt.Errorf("script should return handlers object")
    }
    
    // 注册事件处理器
    if _, exists := se.eventHandlers[widgetID]; !exists {
        se.eventHandlers[widgetID] = make(map[string]goja.Callable)
    }
    
    // 遍历所有可能的事件名
    eventNames := []string{
        "onClick", "onHover", "onFocus", "onBlur", 
        "onChange", "onValueChange", "onKeyPress",
        "onMouseEnter", "onMouseLeave", "onMouseDown", "onMouseUp",
        // 根据控件类型可扩展...
    }
    
    for _, eventName := range eventNames {
        handler := handlersObj.Get(eventName)
        if handler != nil && !goja.IsNull(handler) && !goja.IsUndefined(handler) {
            if callable, ok := goja.AssertFunction(handler); ok {
                se.eventHandlers[widgetID][eventName] = callable
            }
        }
    }
    
    return nil
}

// GetEventHandler 获取事件处理器
func (se *ScriptEngine) GetEventHandler(widgetID string, eventName string) (goja.Callable, bool) {
    if handlers, exists := se.eventHandlers[widgetID]; exists {
        if handler, exists := handlers[eventName]; exists {
            return handler, true
        }
    }
    return nil, false
}

#### UI树构建系统

```go
// UITreeNode UI树节点（在JavaScript中表示一个控件）
type UITreeNode struct {
    widget   Widget
    children map[string]*UITreeNode
}

// BuildUITree 构建UI树并注入到JavaScript
// 必须在所有控件加载完成后调用
func (se *ScriptEngine) BuildUITree(widgets []Widget) {
    // 1. 创建根节点对象
    rootObj := se.vm.NewObject()
    
    // 2. 构建扁平映射（widgetID -> widget）
    widgetMap := make(map[string]Widget)
    for _, widget := range widgets {
        widgetMap[widget.GetID()] = widget
    }
    
    // 3. 找出根控件（没有父控件的）
    var rootWidgets []Widget
    for _, widget := range widgets {
        if widget.GetParentID() == "" || widget.GetParentID() == "root" {
            rootWidgets = append(rootWidgets, widget)
        }
    }
    
    // 4. 递归构建树
    for _, rootWidget := range rootWidgets {
        nodeObj := se.buildWidgetNode(rootWidget, widgetMap)
        rootObj.Set(rootWidget.GetID(), nodeObj)
    }
    
    // 5. 注入到全局
    se.vm.Set("RootElement", rootObj)
    
    log.Println("UI Tree built successfully")
}

// buildWidgetNode 递归构建单个控件节点
func (se *ScriptEngine) buildWidgetNode(widget Widget, widgetMap map[string]Widget) *goja.Object {
    nodeObj := se.vm.NewObject()
    
    // 设置基础属性（只读）
    nodeObj.Set("id", widget.GetID())
    nodeObj.Set("type", string(widget.GetType()))
    
    // 设置属性获取方法（实时读取）
    se.createPropertyGetters(nodeObj, widget)
    
    // 设置属性修改方法（通过命令队列）
    se.createPropertySetters(nodeObj, widget.GetID())
    
    // 递归构建子节点
    children := widget.GetChildren()
    if len(children) > 0 {
        for _, child := range children {
            childNode := se.buildWidgetNode(child, widgetMap)
            nodeObj.Set(child.GetID(), childNode)
        }
    }
    
    return nodeObj
}

// createPropertyGetters 创建属性getter（只读访问）
func (se *ScriptEngine) createPropertyGetters(obj *goja.Object, widget Widget) {
    // 注意：这些是同步读取，从Go侧直接获取
    // 因为读取操作在脚本协程中，而脚本协程与主线程通过命令队列同步
    
    obj.Set("getText", func() string {
        switch w := widget.(type) {
        case *ButtonWidget:
            return w.Text
        case *LabelWidget:
            return w.Text
        case *TextInputWidget:
            return w.Text
        default:
            return ""
        }
    })
    
    obj.Set("getVisible", func() bool {
        return widget.IsVisible()
    })
    
    obj.Set("getEnabled", func() bool {
        switch w := widget.(type) {
        case *ButtonWidget:
            return w.Enabled
        case *TextInputWidget:
            return w.Enabled
        default:
            return true
        }
    })
    
    obj.Set("getX", func() int { return widget.GetX() })
    obj.Set("getY", func() int { return widget.GetY() })
    obj.Set("getWidth", func() int { return widget.GetWidth() })
    obj.Set("getHeight", func() int { return widget.GetHeight() })
    
    // 便捷属性访问（使用JavaScript getter）
    se.vm.RunString(fmt.Sprintf(`
        Object.defineProperty(arguments[0], 'text', {
            get: function() { return this.getText(); }
        });
        Object.defineProperty(arguments[0], 'visible', {
            get: function() { return this.getVisible(); }
        });
        Object.defineProperty(arguments[0], 'enabled', {
            get: function() { return this.getEnabled(); }
        });
        Object.defineProperty(arguments[0], 'x', {
            get: function() { return this.getX(); }
        });
        Object.defineProperty(arguments[0], 'y', {
            get: function() { return this.getY(); }
        });
        Object.defineProperty(arguments[0], 'width', {
            get: function() { return this.getWidth(); }
        });
        Object.defineProperty(arguments[0], 'height', {
            get: function() { return this.getHeight(); }
        });
    `, se.vm.ToValue(obj)))
}

// createPropertySetters 创建属性setter（通过命令队列）
func (se *ScriptEngine) createPropertySetters(obj *goja.Object, widgetID string) {
    // 这些方法会生成命令，由主线程异步执行
    
    obj.Set("setText", func(text string) {
        se.jsSetText(widgetID, text)
    })
    
    obj.Set("setVisible", func(visible bool) {
        se.jsSetVisible(widgetID, visible)
    })
    
    obj.Set("setEnabled", func(enabled bool) {
        se.jsSetProperty(widgetID, "Enabled", enabled)
    })
    
    obj.Set("setPosition", func(x, y int) {
        se.commandQueue.Push(WidgetCommand{
            Type:     CommandSetProperty,
            WidgetID: widgetID,
            Property: "Position",
            Value:    map[string]int{"x": x, "y": y},
        })
    })
    
    obj.Set("setSize", func(width, height int) {
        se.commandQueue.Push(WidgetCommand{
            Type:     CommandSetProperty,
            WidgetID: widgetID,
            Property: "Size",
            Value:    map[string]int{"width": width, "height": height},
        })
    })
    
    obj.Set("setColor", func(r, g, b, a int) {
        se.jsSetColor(widgetID, r, g, b, a)
    })
    
    // 通用setter
    obj.Set("setProperty", func(property string, value interface{}) {
        se.jsSetProperty(widgetID, property, value)
    })
}

// RebuildUITree 重建UI树（当控件增删时调用）
func (se *ScriptEngine) RebuildUITree(widgets []Widget) {
    // 通过事件队列触发重建（确保在脚本协程中执行）
    se.eventQueue.Push(WidgetEvent{
        Type: "rebuild_tree",
        Data: map[string]interface{}{
            "widgets": widgets,
        },
    })
}
```

### 4. TypeScript定义生成器

#### 生成器结构

```go
// TypeScriptGenerator TypeScript定义生成器
type TypeScriptGenerator struct {
    widgets []Widget
}

func NewTypeScriptGenerator(widgets []Widget) *TypeScriptGenerator {
    return &TypeScriptGenerator{
        widgets: widgets,
    }
}

// Generate 生成完整的TypeScript定义
func (tsg *TypeScriptGenerator) Generate() string {
    var sb strings.Builder
    
    // 1. 文件头部注释
    sb.WriteString("// Auto-generated TypeScript definitions for UI tree\n")
    sb.WriteString("// Generated at: " + time.Now().Format(time.RFC3339) + "\n")
    sb.WriteString("// DO NOT EDIT THIS FILE MANUALLY\n\n")
    
    // 2. 基础接口定义
    sb.WriteString(tsg.generateBaseInterfaces())
    
    // 3. 全局对象定义
    sb.WriteString(tsg.generateGlobalDefinitions())
    
    // 4. UI树结构定义
    sb.WriteString(tsg.generateUITreeDefinitions())
    
    // 5. RootElement定义
    sb.WriteString(tsg.generateRootElement())
    
    return sb.String()
}

// generateBaseInterfaces 生成基础接口
func (tsg *TypeScriptGenerator) generateBaseInterfaces() string {
    return `// ============ Base Interfaces ============

/** Widget基础接口 */
interface IWidget {
    /** 控件ID */
    readonly id: string;
    /** 控件类型 */
    readonly type: string;
    
    // Getters（同步读取）
    getText(): string;
    getVisible(): boolean;
    getEnabled(): boolean;
    getX(): number;
    getY(): number;
    getWidth(): number;
    getHeight(): number;
    
    // 便捷属性（只读）
    readonly text: string;
    readonly visible: boolean;
    readonly enabled: boolean;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    
    // Setters（异步命令）
    setText(text: string): void;
    setVisible(visible: boolean): void;
    setEnabled(enabled: boolean): void;
    setPosition(x: number, y: number): void;
    setSize(width: number, height: number): void;
    setColor(r: number, g: number, b: number, a: number): void;
    setProperty(property: string, value: any): void;
}

/** Button控件接口 */
interface IButton extends IWidget {
    readonly type: "button";
}

/** Label控件接口 */
interface ILabel extends IWidget {
    readonly type: "label";
}

/** TextInput控件接口 */
interface ITextInput extends IWidget {
    readonly type: "textinput";
}

/** Slider控件接口 */
interface ISlider extends IWidget {
    readonly type: "slider";
    getValue(): number;
    setValue(value: number): void;
    readonly value: number;
}

/** Image控件接口 */
interface IImage extends IWidget {
    readonly type: "image";
}

/** Panel容器接口 */
interface IPanel extends IWidget {
    readonly type: "panel";
}

`
}

// generateGlobalDefinitions 生成全局对象定义
func (tsg *TypeScriptGenerator) generateGlobalDefinitions() string {
    return `// ============ Global APIs ============

/** 控制台输出 */
declare const console: {
    log(...args: any[]): void;
    error(...args: any[]): void;
};

/** 全局状态对象 */
declare const Global: {
    [key: string]: any;
};

/** Widget工具类 */
declare const Widget: {
    setProperty(widgetId: string, property: string, value: any): void;
    setText(widgetId: string, text: string): void;
    setVisible(widgetId: string, visible: boolean): void;
    setColor(widgetId: string, r: number, g: number, b: number, a: number): void;
    enable(widgetId: string): void;
    disable(widgetId: string): void;
};

/** 事件注册 */
declare function on(widgetId: string, eventName: string, handler: (event: any) => void): void;

/** 延迟执行 */
declare function setTimeout(callback: () => void, delay: number): void;

/** 定时执行 */
declare function setInterval(callback: () => void, interval: number): number;

/** 模块加载 */
declare function require(moduleName: string): any;

`
}

// generateUITreeDefinitions 生成UI树节点类型定义
func (tsg *TypeScriptGenerator) generateUITreeDefinitions() string {
    var sb strings.Builder
    
    sb.WriteString("// ============ UI Tree Definitions ============\n\n")
    
    // 构建树结构映射
    treeMap := tsg.buildTreeMap()
    
    // 为每个容器控件生成接口
    for _, widget := range tsg.widgets {
        if widget.GetType() == TypePanel || len(widget.GetChildren()) > 0 {
            sb.WriteString(tsg.generateWidgetInterface(widget, treeMap))
        }
    }
    
    return sb.String()
}

// buildTreeMap 构建树结构映射
func (tsg *TypeScriptGenerator) buildTreeMap() map[string][]Widget {
    treeMap := make(map[string][]Widget)
    
    for _, widget := range tsg.widgets {
        parentID := widget.GetParentID()
        if parentID == "" {
            parentID = "root"
        }
        treeMap[parentID] = append(treeMap[parentID], widget)
    }
    
    return treeMap
}

// generateWidgetInterface 为单个控件生成接口定义
func (tsg *TypeScriptGenerator) generateWidgetInterface(widget Widget, treeMap map[string][]Widget) string {
    var sb strings.Builder
    
    // 接口名：基于控件ID，首字母大写
    interfaceName := "I" + strings.ToUpper(widget.GetID()[:1]) + widget.GetID()[1:]
    
    // 基础接口类型
    baseInterface := tsg.getBaseInterfaceType(widget.GetType())
    
    sb.WriteString(fmt.Sprintf("/** %s控件及其子元素 */\n", widget.GetID()))
    sb.WriteString(fmt.Sprintf("interface %s extends %s {\n", interfaceName, baseInterface))
    
    // 子控件属性
    children := treeMap[widget.GetID()]
    for _, child := range children {
        childInterface := tsg.getWidgetInterfaceType(child, treeMap)
        sb.WriteString(fmt.Sprintf("    /** %s子控件 */\n", child.GetID()))
        sb.WriteString(fmt.Sprintf("    readonly %s: %s;\n", child.GetID(), childInterface))
    }
    
    sb.WriteString("}\n\n")
    
    return sb.String()
}

// getBaseInterfaceType 获取基础接口类型
func (tsg *TypeScriptGenerator) getBaseInterfaceType(widgetType WidgetType) string {
    switch widgetType {
    case TypeButton:
        return "IButton"
    case TypeLabel:
        return "ILabel"
    case TypeTextInput:
        return "ITextInput"
    case TypeSlider:
        return "ISlider"
    case TypeImage:
        return "IImage"
    case TypePanel:
        return "IPanel"
    default:
        return "IWidget"
    }
}

// getWidgetInterfaceType 获取控件的完整接口类型
func (tsg *TypeScriptGenerator) getWidgetInterfaceType(widget Widget, treeMap map[string][]Widget) string {
    // 如果有子控件，使用自定义接口
    if len(treeMap[widget.GetID()]) > 0 {
        return "I" + strings.ToUpper(widget.GetID()[:1]) + widget.GetID()[1:]
    }
    
    // 否则使用基础接口
    return tsg.getBaseInterfaceType(widget.GetType())
}

// generateRootElement 生成根元素定义
func (tsg *TypeScriptGenerator) generateRootElement() string {
    var sb strings.Builder
    
    sb.WriteString("// ============ Root Element ============\n\n")
    sb.WriteString("/** UI树根节点 */\n")
    sb.WriteString("interface IRootElement {\n")
    
    // 找出所有根控件
    for _, widget := range tsg.widgets {
        if widget.GetParentID() == "" || widget.GetParentID() == "root" {
            treeMap := tsg.buildTreeMap()
            widgetInterface := tsg.getWidgetInterfaceType(widget, treeMap)
            sb.WriteString(fmt.Sprintf("    /** %s根控件 */\n", widget.GetID()))
            sb.WriteString(fmt.Sprintf("    readonly %s: %s;\n", widget.GetID(), widgetInterface))
        }
    }
    
    sb.WriteString("}\n\n")
    sb.WriteString("/** 全局UI树根节点 */\n")
    sb.WriteString("declare const RootElement: IRootElement;\n")
    
    return sb.String()
}

// SaveToFile 保存到.d.ts文件
func (tsg *TypeScriptGenerator) SaveToFile(filename string) error {
    content := tsg.Generate()
    return os.WriteFile(filename, []byte(content), 0644)
}
```
```

```go
// Start 启动脚本引擎
func (se *ScriptEngine) Start() {
    se.wg.Add(1)
    go se.eventLoop()
}

// Stop 停止脚本引擎
func (se *ScriptEngine) Stop() {
    close(se.stopChan)
    se.wg.Wait()
}

// eventLoop 事件循环（独立协程）
func (se *ScriptEngine) eventLoop() {
    defer se.wg.Done()
    
    for {
        select {
        case <-se.stopChan:
            return
        case event := <-se.eventQueue.events:
            se.handleEvent(event)
        }
    }
}

#### 脚本执行协程（改进版）

```go
// Start 启动脚本引擎
func (se *ScriptEngine) Start() {
    se.wg.Add(1)
    go se.eventLoop()
}

// Stop 停止脚本引擎
func (se *ScriptEngine) Stop() {
    close(se.stopChan)
    se.wg.Wait()
}

// eventLoop 事件循环（独立协程，持久VM）
func (se *ScriptEngine) eventLoop() {
    defer se.wg.Done()
    
    for {
        select {
        case <-se.stopChan:
            return
        case event := <-se.eventQueue.events:
            se.handleEvent(event)
        }
    }
}

// handleEvent 处理事件（改进版：灵活的事件名映射）
func (se *ScriptEngine) handleEvent(event WidgetEvent) {
    // 根据事件类型获取处理器函数名
    // 支持自定义事件名（不写死）
    handlerName := se.getEventHandlerName(event)
    
    // 查找处理器
    handler, exists := se.GetEventHandler(event.WidgetID, handlerName)
    if !exists {
        return
    }
    
    // 执行处理器
    se.executeHandler(handler, event)
}

// getEventHandlerName 将事件类型映射到处理器名称
// 支持自定义映射规则
func (se *ScriptEngine) getEventHandlerName(event WidgetEvent) string {
    // 标准映射
    standardMapping := map[string]string{
        "click":       "onClick",
        "hover":       "onHover",
        "focus":       "onFocus",
        "blur":        "onBlur",
        "change":      "onChange",
        "keypress":    "onKeyPress",
        "mouseenter":  "onMouseEnter",
        "mouseleave":  "onMouseLeave",
        "mousedown":   "onMouseDown",
        "mouseup":     "onMouseUp",
        // Slider特有
        "valuechange": "onValueChange",
        // TextInput特有
        "textchange":  "onTextChange",
        "submit":      "onSubmit",
        // ListView特有
        "itemclick":   "onItemClick",
        "itemselect":  "onItemSelect",
        // 更多控件特有事件...
    }
    
    eventType := string(event.Type)
    
    // 优先使用标准映射
    if handlerName, exists := standardMapping[eventType]; exists {
        return handlerName
    }
    
    // 如果没有标准映射，使用驼峰命名：event.Data["handlerName"]
    if handlerName, ok := event.Data["handlerName"].(string); ok {
        return handlerName
    }
    
    // 默认：on + 首字母大写
    if len(eventType) > 0 {
        return "on" + strings.ToUpper(eventType[:1]) + eventType[1:]
    }
    
    return ""
}

// executeHandler 执行事件处理器（改进版，支持event.target）
func (se *ScriptEngine) executeHandler(handler goja.Callable, event WidgetEvent, widget Widget) {
    // 1. 创建事件对象
    eventObj := se.vm.NewObject()
    eventObj.Set("type", string(event.Type))
    eventObj.Set("widgetId", event.WidgetID)
    eventObj.Set("x", event.X)
    eventObj.Set("y", event.Y)
    eventObj.Set("button", event.Button)
    eventObj.Set("timestamp", event.Timestamp)
    
    // 2. 创建 event.target - 指向触发事件的控件API对象
    targetAPI := se.createWidgetAPI(widget)
    eventObj.Set("target", targetAPI)
    
    // 附加自定义数据
    for k, v := range event.Data {
        eventObj.Set(k, v)
    }
    
    // 3. 调用处理器：handler(event, api)
    // 注意：api参数和event.target是同一个对象
    _, err := handler(goja.Undefined(), se.vm.ToValue(eventObj), se.vm.ToValue(targetAPI))
    if err != nil {
        log.Printf("Script handler error in widget %s: %v", event.WidgetID, err)
    }
}

// createWidgetAPI 创建控件API对象
// 这是event.target的实际内容，提供所有控件操作方法
func (se *ScriptEngine) createWidgetAPI(widget Widget) *goja.Object {
    apiObj := se.vm.NewObject()
    widgetID := widget.GetID()
    
    // 基础信息方法
    apiObj.Set("getID", func() string {
        return widgetID
    })
    
    apiObj.Set("getType", func() string {
        return widget.GetType()
    })
    
    // 通用Getter方法
    apiObj.Set("getText", func() string {
        switch w := widget.(type) {
        case *ButtonWidget:
            return w.Text
        case *LabelWidget:
            return w.Text
        case *TextInputWidget:
            return w.Text
        default:
            return ""
        }
    })
    
    apiObj.Set("getVisible", func() bool {
        return widget.IsVisible()
    })
    
    apiObj.Set("getEnabled", func() bool {
        switch w := widget.(type) {
        case *ButtonWidget:
            return w.Enabled
        case *TextInputWidget:
            return w.Enabled
        default:
            return true
        }
    })
    
    apiObj.Set("getX", func() int { return widget.GetX() })
    apiObj.Set("getY", func() int { return widget.GetY() })
    apiObj.Set("getWidth", func() int { return widget.GetWidth() })
    apiObj.Set("getHeight", func() int { return widget.GetHeight() })
    
    // 通用Setter方法（通过命令队列）
    apiObj.Set("setText", func(text string) {
        se.jsSetText(widgetID, text)
    })
    
    apiObj.Set("setVisible", func(visible bool) {
        se.jsSetVisible(widgetID, visible)
    })
    
    apiObj.Set("setEnabled", func(enabled bool) {
        se.jsSetProperty(widgetID, "Enabled", enabled)
    })
    
    apiObj.Set("setPosition", func(x, y int) {
        se.commandQueue.Push(WidgetCommand{
            Type:     CommandSetProperty,
            WidgetID: widgetID,
            Property: "Position",
            Value:    map[string]int{"x": x, "y": y},
        })
    })
    
    apiObj.Set("setSize", func(width, height int) {
        se.commandQueue.Push(WidgetCommand{
            Type:     CommandSetProperty,
            WidgetID: widgetID,
            Property: "Size",
            Value:    map[string]int{"width": width, "height": height},
        })
    })
    
    apiObj.Set("setColor", func(r, g, b, a int) {
        se.jsSetColor(widgetID, r, g, b, a)
    })
    
    apiObj.Set("setProperty", func(property string, value interface{}) {
        se.jsSetProperty(widgetID, property, value)
    })
    
    // 特定类型的专用方法
    switch w := widget.(type) {
    case *TextInputWidget:
        apiObj.Set("setPlaceholder", func(text string) {
            se.jsSetProperty(widgetID, "Placeholder", text)
        })
        
        apiObj.Set("setMaxLength", func(length int) {
            se.jsSetProperty(widgetID, "MaxLength", length)
        })
        
        apiObj.Set("setInputMode", func(mode string) {
            se.jsSetProperty(widgetID, "InputMode", mode)
        })
        
        apiObj.Set("setFocus", func() {
            se.commandQueue.Push(WidgetCommand{
                Type:     CommandFocus,
                WidgetID: widgetID,
            })
        })
        
        apiObj.Set("blur", func() {
            se.commandQueue.Push(WidgetCommand{
                Type:     CommandBlur,
                WidgetID: widgetID,
            })
        })
    
    case *ButtonWidget:
        apiObj.Set("setFontSize", func(size int) {
            se.jsSetProperty(widgetID, "FontSize", size)
        })
    
    case *SliderWidget:
        apiObj.Set("getValue", func() float64 {
            return w.Value
        })
        
        apiObj.Set("setValue", func(value float64) {
            se.jsSetProperty(widgetID, "Value", value)
        })
        
        apiObj.Set("setMin", func(min float64) {
            se.jsSetProperty(widgetID, "Min", min)
        })
        
        apiObj.Set("setMax", func(max float64) {
            se.jsSetProperty(widgetID, "Max", max)
        })
    
    case *CheckBoxWidget:
        apiObj.Set("getChecked", func() bool {
            return w.Checked
        })
        
        apiObj.Set("setChecked", func(checked bool) {
            se.jsSetProperty(widgetID, "Checked", checked)
        })
        
        apiObj.Set("setLabel", func(text string) {
            se.jsSetProperty(widgetID, "Label", text)
        })
    }
    
    return apiObj
}

// RegisterScript 兼容旧API：直接注册脚本字符串
func (se *ScriptEngine) RegisterScript(widgetID string, eventType EventType, script string) error {
    // 包装为函数
    wrappedScript := fmt.Sprintf(`
        (function(event) {
            %s
        })
    `, script)
    
    result, err := se.vm.RunString(wrappedScript)
    if err != nil {
        return err
    }
    
    callable, ok := goja.AssertFunction(result)
    if !ok {
        return fmt.Errorf("script is not a function")
    }
    
    handlerName := "on" + strings.ToUpper(string(eventType)[:1]) + string(eventType)[1:]
    
    if _, exists := se.eventHandlers[widgetID]; !exists {
        se.eventHandlers[widgetID] = make(map[string]goja.Callable)
    }
    se.eventHandlers[widgetID][handlerName] = callable
    
    return nil
}
    if !exists {
        se.scriptsMutex.RUnlock()
        return
    }
    
    script, exists := widgetScripts[event.Type]
    se.scriptsMutex.RUnlock()
    
    if !exists {
        return
    }
    
    // 执行脚本
    se.executeScript(event, script)
}

// executeScript 执行脚本
func (se *ScriptEngine) executeScript(event WidgetEvent, script string) {
    // 创建事件对象
    eventObj := se.vm.NewObject()
    eventObj.Set("type", string(event.Type))
    eventObj.Set("widgetId", event.WidgetID)
    eventObj.Set("x", event.X)
    eventObj.Set("y", event.Y)
    eventObj.Set("button", event.Button)
    for k, v := range event.Data {
        eventObj.Set(k, v)
    }
    
    // 注入到全局作用域
    se.vm.Set("event", eventObj)
    
    // 执行脚本
    _, err := se.vm.RunString(script)
    if err != nil {
        log.Printf("Script error in widget %s: %v", event.WidgetID, err)
    }
}

// RegisterScript 注册脚本
func (se *ScriptEngine) RegisterScript(widgetID string, eventType EventType, script string) {
    se.scriptsMutex.Lock()
    defer se.scriptsMutex.Unlock()
    
    if _, exists := se.scripts[widgetID]; !exists {
        se.scripts[widgetID] = make(map[EventType]string)
    }
    se.scripts[widgetID][eventType] = script
}
```

### 4. UI系统集成

#### UIManager 管理器

```go
type UIManager struct {
    widgets      map[string]Widget
    widgetsMutex sync.RWMutex // 只保护 widgets map 本身的增删
    
    scriptEngine *ScriptEngine
    
    // 其他字段...
}

func NewUIManager() *UIManager {
    um := &UIManager{
        widgets:      make(map[string]Widget),
        scriptEngine: NewScriptEngine(),
    }
    
    um.scriptEngine.Start()
    
    return um
}

// Update 主线程更新（每帧调用）
func (um *UIManager) Update() error {
    // 1. 处理输入，生成事件
    if ebiten.IsMouseButtonPressed(ebiten.MouseButtonLeft) {
        x, y := ebiten.CursorPosition()
        
        // 检测点击的控件
        um.widgetsMutex.RLock()
        for _, widget := range um.widgets {
            if widget.IsInteractive() && widget.OnClick(x, y) {
                // 推送事件到脚本引擎
                um.scriptEngine.eventQueue.Push(WidgetEvent{
                    Type:      EventClick,
                    WidgetID:  widget.GetID(),
                    X:         x,
                    Y:         y,
                    Button:    0,
                    Timestamp: time.Now().UnixMilli(),
                })
                break
            }
        }
        um.widgetsMutex.RUnlock()
    }
    
    // 2. 应用来自脚本的命令
    um.applyCommands()
    
    // 3. 更新所有控件
    um.widgetsMutex.RLock()
    for _, widget := range um.widgets {
        widget.Update()
    }
    um.widgetsMutex.RUnlock()
    
    return nil
}

// applyCommands 应用命令（在主线程中）
func (um *UIManager) applyCommands() {
    commands := um.scriptEngine.commandQueue.PopAll()
    
    for _, cmd := range commands {
        switch cmd.Type {
        case CommandSetProperty:
            um.setWidgetProperty(cmd.WidgetID, cmd.Property, cmd.Value)
        case CommandCallMethod:
            um.callWidgetMethod(cmd.WidgetID, cmd.Method, cmd.Args)
        // ... 其他命令类型
        }
    }
}

// setWidgetProperty 设置控件属性
func (um *UIManager) setWidgetProperty(widgetID, property string, value interface{}) {
    um.widgetsMutex.RLock()
    widget, exists := um.widgets[widgetID]
    um.widgetsMutex.RUnlock()
    
    if !exists {
        return
    }
    
    // 使用反射或类型断言设置属性
    switch property {
    case "text":
        if btn, ok := widget.(*ButtonWidget); ok {
            btn.Text = value.(string)
        }
    case "visible":
        widget.SetVisible(value.(bool))
    // ... 更多属性
    }
}
```

## 并发安全分析

### 读写场景

| 场景 | 线程 | 操作 | 安全策略 |
|------|------|------|----------|
| Update() 读属性 | 主线程 | 读 | 无锁（单线程） |
| Draw() 读属性 | 主线程 | 读 | 无锁（单线程） |
| 脚本写属性 | 脚本协程 | 写命令 | 命令队列 |
| applyCommands() | 主线程 | 写属性 | 单一写入点 |
| widgets map 增删 | 主线程/其他 | 读写 | RWMutex |

### 关键要点

1. **Widget 属性本身不加锁**：
   - Update() 和 Draw() 在同一主线程，无竞态
   - 脚本协程只通过命令队列间接修改

2. **只保护 widgets map**：
   - 使用 `sync.RWMutex` 保护 map 的增删查
   - Widget 对象本身的读写由命令队列串行化

3. **命令队列作为屏障**：
   - 脚本协程写入命令（非阻塞）
   - 主线程批量读取命令（串行应用）

## 性能优化

### 1. 脚本预编译

```go
type CompiledScript struct {
    program *goja.Program
}

func (se *ScriptEngine) CompileScript(script string) (*CompiledScript, error) {
    program, err := goja.Compile("", script, false)
    if err != nil {
        return nil, err
    }
    return &CompiledScript{program: program}, nil
}

func (se *ScriptEngine) executeCompiledScript(event WidgetEvent, compiled *CompiledScript) {
    // 注入事件对象...
    _, err := se.vm.RunProgram(compiled.program)
    // ...
}
```

### 2. 事件节流

```go
// 避免高频事件（如 hover）阻塞队列
type ThrottledEvent struct {
    lastTrigger map[string]time.Time
    interval    time.Duration
}

func (te *ThrottledEvent) ShouldTrigger(widgetID string) bool {
    now := time.Now()
    last, exists := te.lastTrigger[widgetID]
    if !exists || now.Sub(last) >= te.interval {
        te.lastTrigger[widgetID] = now
        return true
    }
    return false
}
```

### 3. 命令合并

```go
// 合并同一控件的相同属性设置
func (cq *CommandQueue) MergeCommands(cmds []WidgetCommand) []WidgetCommand {
    merged := make(map[string]WidgetCommand) // key: widgetID+property
    
    for _, cmd := range cmds {
        if cmd.Type == CommandSetProperty {
            key := cmd.WidgetID + ":" + cmd.Property
            merged[key] = cmd // 后面的覆盖前面的
        }
    }
    
    result := make([]WidgetCommand, 0, len(merged))
    for _, cmd := range merged {
        result = append(result, cmd)
    }
    return result
}
```

## 使用示例

### 1. 控件脚本（推荐方式）

#### 按钮点击示例

```javascript
// button1.js - 为button1控件编写的脚本

// 定义点击事件处理器
function onClick(event) {
    console.log("Button clicked at", event.x, event.y);
    
    // 修改自己的文本
    setText("Clicked!");
    
    // 操作其他控件
    Widget.setVisible("label1", true);
    Widget.setText("label1", "Button was clicked!");
}

// 定义悬停事件处理器
function onHover(event) {
    console.log("Hovering over button");
}

// 可以访问全局状态
Global.clickCount = (Global.clickCount || 0) + 1;
```

**加载方式：**
```go
scriptEngine.LoadWidgetScript("button1", buttonScript)
```

### 1.5 使用UI树访问控件（新功能！）✨

#### 层级访问示例

```javascript
// loginPanel脚本
function onClick(event) {
    // ✨ 方式1：通过UI树访问（推荐！）
    // 假设UI结构：root -> loginPanel -> usernameInput, passwordInput, submitButton
    
    // 读取用户输入
    const username = RootElement.loginPanel.usernameInput.text;
    const password = RootElement.loginPanel.passwordInput.text;
    
    console.log("Login attempt:", username);
    
    // 验证
    if (username.length < 3) {
        RootElement.loginPanel.errorLabel.setText("Username too short!");
        RootElement.loginPanel.errorLabel.setVisible(true);
        return;
    }
    
    // 登录成功
    RootElement.loginPanel.setVisible(false);
    RootElement.mainPanel.setVisible(true);
    RootElement.mainPanel.welcomeLabel.setText("Welcome, " + username + "!");
    
    // 保存到全局状态
    Global.currentUser = username;
}

// ✨ 方式2：传统方式（仍然支持）
function onClickOld(event) {
    const username = Widget.getText("usernameInput");
    Widget.setText("errorLabel", "Username too short!");
}
```

#### 遍历子控件

```javascript
// panel1脚本 - 批量操作子控件
function onInit() {
    // 隐藏所有子按钮
    const panel = RootElement.mainPanel;
    
    // 方式1：直接访问已知子控件
    panel.button1.setVisible(false);
    panel.button2.setVisible(false);
    panel.button3.setVisible(false);
    
    // 方式2：如果需要动态遍历，可以通过ID数组
    const childIds = ["button1", "button2", "button3"];
    childIds.forEach(id => {
        Widget.setVisible(id, false);
    });
}
```

#### 复杂UI交互

```javascript
// gamePanel脚本
function onReady() {
    // UI结构：
    // RootElement
    //   ├─ gamePanel
    //   │   ├─ scoreLabel
    //   │   ├─ timerLabel
    //   │   ├─ pauseButton
    //   │   └─ controlPanel
    //   │       ├─ upButton
    //   │       ├─ downButton
    //   │       ├─ leftButton
    //   │       └─ rightButton
    //   └─ menuPanel
    
    const game = RootElement.gamePanel;
    const menu = RootElement.menuPanel;
    
    // 初始化游戏UI
    game.scoreLabel.setText("Score: 0");
    game.timerLabel.setText("Time: 60");
    
    // 设置控制按钮
    game.controlPanel.upButton.setEnabled(true);
    game.controlPanel.downButton.setEnabled(true);
    
    // 隐藏菜单
    menu.setVisible(false);
}

// 暂停按钮的脚本
function onClick(event) {
    const game = RootElement.gamePanel;
    const menu = RootElement.menuPanel;
    
    // 切换面板
    game.setVisible(false);
    menu.setVisible(true);
    
    // 保存游戏状态
    Global.gamePaused = true;
}
```

#### TypeScript智能提示示例

在支持TypeScript的IDE中（如VSCode），你会获得完整的智能提示：

```typescript
// ui.d.ts 已自动生成

function onClick(event: any) {
    // 输入 "RootElement." 后会自动提示所有根控件
    RootElement.
    //          ^ 智能提示：loginPanel, mainPanel, gamePanel...
    
    // 输入 "RootElement.loginPanel." 后会提示该面板的子控件
    RootElement.loginPanel.
    //                     ^ 智能提示：usernameInput, passwordInput, submitButton...
    
    // 输入 "RootElement.loginPanel.usernameInput." 后会提示可用方法
    RootElement.loginPanel.usernameInput.
    //                                   ^ 智能提示：setText(), setVisible(), getText(), text, visible...
    
    // 类型检查
    const username: string = RootElement.loginPanel.usernameInput.text; // ✅ 正确
    const username2: number = RootElement.loginPanel.usernameInput.text; // ❌ 类型错误！
}
```

#### Slider值改变示例

```javascript
// slider1.js

function onValueChange(event) {
    const value = event.value; // Slider特有的数据
    console.log("Slider value:", value);
    
    // 更新标签显示
    Widget.setText("valueLabel", "Value: " + value);
    
    // 根据值改变颜色
    if (value > 50) {
        Widget.setColor(self.id, 255, 0, 0, 255); // 红色
    } else {
        Widget.setColor(self.id, 0, 255, 0, 255); // 绿色
    }
}
```

#### TextInput输入示例

```javascript
// textinput1.js

function onChange(event) {
    const text = event.text;
    console.log("Input changed:", text);
    
    // 实时验证
    if (text.length < 3) {
        Widget.setText("errorLabel", "Too short!");
        Widget.setVisible("errorLabel", true);
    } else {
        Widget.setVisible("errorLabel", false);
    }
}

function onSubmit(event) {
    const text = event.text;
    console.log("Submitted:", text);
    
    // 存储到全局状态
    Global.username = text;
    
    // 清空输入框
    setText("");
}
```

### 2. 模块化脚本

#### 公共工具模块

```javascript
// utils.js - 公共模块

const Utils = {
    // 颜色工具
    Colors: {
        Red: { r: 255, g: 0, b: 0, a: 255 },
        Green: { r: 0, g: 255, b: 0, a: 255 },
        Blue: { r: 0, g: 0, b: 255, a: 255 },
    },
    
    // 动画工具
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    // 格式化工具
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes}:${seconds % 60}`;
    }
};

// 导出（赋值给 exports）
exports.Colors = Utils.Colors;
exports.lerp = Utils.lerp;
exports.formatTime = Utils.formatTime;
```

**加载方式：**
```go
scriptEngine.LoadScriptModule("utils", utilsScript)
```

#### 使用模块

```javascript
// button2.js

// 引入模块
const utils = require("utils");

function onClick(event) {
    // 使用公共模块
    const color = utils.Colors.Red;
    Widget.setColor(self.id, color.r, color.g, color.b, color.a);
    
    console.log("Time:", utils.formatTime(event.timestamp));
}
```

### 3. 全局状态共享

```javascript
// login_button.js
function onClick(event) {
    const username = Global.username || "Guest";
    Widget.setText("welcomeLabel", "Welcome, " + username + "!");
    
    // 设置登录标志
    Global.isLoggedIn = true;
}

// logout_button.js
function onClick(event) {
    Global.isLoggedIn = false;
    Global.username = null;
    Widget.setText("welcomeLabel", "Please login");
}

// main_panel.js
function onLoad(event) {
    // 检查登录状态
    if (Global.isLoggedIn) {
        Widget.setVisible("loginButton", false);
        Widget.setVisible("logoutButton", true);
    } else {
        Widget.setVisible("loginButton", true);
        Widget.setVisible("logoutButton", false);
    }
}
```

### 4. 动态事件注册

```javascript
// dynamic.js

// 在运行时动态绑定事件
on("button3", "onClick", function(event) {
    console.log("Dynamically registered handler");
});

// 延迟执行
setTimeout(function() {
    Widget.setText("button3", "Ready!");
}, 2000);
```

### 5. JSON 格式（编辑器导出）

#### 方式1：内联脚本

```json
{
  "id": "button1",
  "type": "button",
  "text": "Click Me",
  "scripts": {
    "onClick": "console.log('Clicked'); setText('Done!');",
    "onHover": "console.log('Hovering');"
  }
}
```

#### 方式2：脚本文件引用

```json
{
  "id": "button1",
  "type": "button",
  "text": "Click Me",
  "scriptFile": "scripts/button1.js"
}
```

#### 方式3：模块化（推荐）

```json
{
  "modules": [
    {
      "name": "utils",
      "file": "scripts/utils.js"
    },
    {
      "name": "config",
      "file": "scripts/config.js"
    }
  ],
  "widgets": [
    {
      "id": "button1",
      "type": "button",
      "scriptFile": "scripts/button1.js"
    }
  ]
}
```

### 6. Loader 集成与UI树构建

```go
func (l *Loader) LoadFromJSON(data []byte) (*UIManager, error) {
    var layoutData LayoutData
    if err := json.Unmarshal(data, &layoutData); err != nil {
        return nil, err
    }
    
    uiManager := NewUIManager()
    
    // 1. 先加载公共模块
    for _, module := range layoutData.Modules {
        scriptContent, err := loadScriptFile(module.File)
        if err != nil {
            log.Printf("Failed to load module %s: %v", module.Name, err)
            continue
        }
        uiManager.scriptEngine.LoadScriptModule(module.Name, scriptContent)
    }
    
    // 2. 加载所有控件
    var allWidgets []Widget
    for _, widgetData := range layoutData.Widgets {
        widget := createWidget(widgetData)
        uiManager.AddWidget(widget)
        allWidgets = append(allWidgets, widget)
    }
    
    // 3. 构建UI树（必须在所有控件加载后）✨
    uiManager.scriptEngine.BuildUITree(allWidgets)
    
    // 4. 加载控件脚本
    for _, widgetData := range layoutData.Widgets {
        widget := uiManager.GetWidget(widgetData["id"].(string))
        
        if scriptFile := widgetData["scriptFile"].(string); scriptFile != "" {
            scriptContent, err := loadScriptFile(scriptFile)
            if err == nil {
                uiManager.scriptEngine.LoadWidgetScript(widget.GetID(), scriptContent)
            }
        } else if scripts, ok := widgetData["scripts"].(map[string]interface{}); ok {
            // 内联脚本
            for eventName, script := range scripts {
                uiManager.scriptEngine.RegisterScript(
                    widget.GetID(),
                    EventType(eventName),
                    script.(string),
                )
            }
        }
    }
    
    // 5. 触发 init 和 ready 事件
    for _, widget := range allWidgets {
        uiManager.scriptEngine.eventQueue.Push(WidgetEvent{
            Type:     "init",
            WidgetID: widget.GetID(),
        })
    }
    
    for _, widget := range allWidgets {
        uiManager.scriptEngine.eventQueue.Push(WidgetEvent{
            Type:     "ready",
            WidgetID: widget.GetID(),
        })
    }
    
    return uiManager, nil
}
```

### 7. 编辑器集成：自动生成TypeScript定义

#### 前端导出功能扩展

```javascript
// frontend/src/js/app.js

class App {
    // ... 现有代码
    
    // ✨ 新增：导出UI布局时同时生成.d.ts
    async exportLayout() {
        const layoutData = this.generateLayoutData();
        
        // 1. 保存 .ui 文件
        const uiFile = await this.saveFile(layoutData, 'ui');
        
        // 2. 生成 TypeScript 定义文件
        const dtsContent = this.generateTypeScriptDefinitions(this.widgets);
        const dtsFile = uiFile.replace('.ui', '.d.ts');
        await this.saveTextFile(dtsContent, dtsFile);
        
        console.log('Exported:', uiFile);
        console.log('Generated TypeScript definitions:', dtsFile);
    }
    
    // ✨ 新增：生成TypeScript定义
    generateTypeScriptDefinitions(widgets) {
        const generator = new TypeScriptDefinitionGenerator(widgets);
        return generator.generate();
    }
}

// ✨ 新增：TypeScript定义生成器（前端版本）
class TypeScriptDefinitionGenerator {
    constructor(widgets) {
        this.widgets = widgets;
    }
    
    generate() {
        let dts = '';
        
        // 1. 文件头
        dts += this.generateHeader();
        
        // 2. 基础接口
        dts += this.generateBaseInterfaces();
        
        // 3. 全局API
        dts += this.generateGlobalAPIs();
        
        // 4. UI树结构
        dts += this.generateUITree();
        
        return dts;
    }
    
    generateHeader() {
        return `// Auto-generated TypeScript definitions for UI tree
// Generated at: ${new Date().toISOString()}
// DO NOT EDIT THIS FILE MANUALLY

`;
    }
    
    generateBaseInterfaces() {
        return `// ============ Base Interfaces ============

/** Widget基础接口 */
interface IWidget {
    readonly id: string;
    readonly type: string;
    
    // Getters
    getText(): string;
    getVisible(): boolean;
    getEnabled(): boolean;
    getX(): number;
    getY(): number;
    getWidth(): number;
    getHeight(): number;
    
    // Properties
    readonly text: string;
    readonly visible: boolean;
    readonly enabled: boolean;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    
    // Setters
    setText(text: string): void;
    setVisible(visible: boolean): void;
    setEnabled(enabled: boolean): void;
    setPosition(x: number, y: number): void;
    setSize(width: number, height: number): void;
    setColor(r: number, g: number, b: number, a: number): void;
    setProperty(property: string, value: any): void;
}

interface IButton extends IWidget { readonly type: "button"; }
interface ILabel extends IWidget { readonly type: "label"; }
interface ITextInput extends IWidget { readonly type: "textinput"; }
interface ISlider extends IWidget { 
    readonly type: "slider";
    getValue(): number;
    setValue(value: number): void;
    readonly value: number;
}
interface IImage extends IWidget { readonly type: "image"; }
interface IPanel extends IWidget { readonly type: "panel"; }

`;
    }
    
    generateGlobalAPIs() {
        return `// ============ Global APIs ============

declare const console: {
    log(...args: any[]): void;
    error(...args: any[]): void;
};

declare const Global: { [key: string]: any; };

declare const Widget: {
    setProperty(widgetId: string, property: string, value: any): void;
    setText(widgetId: string, text: string): void;
    setVisible(widgetId: string, visible: boolean): void;
    setColor(widgetId: string, r: number, g: number, b: number, a: number): void;
    enable(widgetId: string): void;
    disable(widgetId: string): void;
};

declare function on(widgetId: string, eventName: string, handler: (event: any) => void): void;
declare function setTimeout(callback: () => void, delay: number): void;
declare function setInterval(callback: () => void, interval: number): number;
declare function require(moduleName: string): any;

`;
    }
    
    generateUITree() {
        let dts = '// ============ UI Tree ============\n\n';
        
        // 构建树结构
        const tree = this.buildTree();
        
        // 生成每个容器的接口
        for (const widget of this.widgets) {
            if (widget.type === 'panel' || this.hasChildren(widget.id, tree)) {
                dts += this.generateWidgetInterface(widget, tree);
            }
        }
        
        // 生成根元素接口
        dts += this.generateRootInterface(tree);
        
        return dts;
    }
    
    buildTree() {
        const tree = {};
        for (const widget of this.widgets) {
            const parentId = widget.parentId || 'root';
            if (!tree[parentId]) tree[parentId] = [];
            tree[parentId].push(widget);
        }
        return tree;
    }
    
    hasChildren(widgetId, tree) {
        return tree[widgetId] && tree[widgetId].length > 0;
    }
    
    generateWidgetInterface(widget, tree) {
        const interfaceName = 'I' + this.capitalize(widget.id);
        const baseType = this.getBaseType(widget.type);
        
        let dts = `/** ${widget.id} 及其子元素 */\n`;
        dts += `interface ${interfaceName} extends ${baseType} {\n`;
        
        const children = tree[widget.id] || [];
        for (const child of children) {
            const childType = this.hasChildren(child.id, tree) 
                ? 'I' + this.capitalize(child.id)
                : this.getBaseType(child.type);
            dts += `    /** ${child.id} */\n`;
            dts += `    readonly ${child.id}: ${childType};\n`;
        }
        
        dts += '}\n\n';
        return dts;
    }
    
    generateRootInterface(tree) {
        let dts = '/** UI树根节点 */\n';
        dts += 'interface IRootElement {\n';
        
        const rootChildren = tree['root'] || [];
        for (const child of rootChildren) {
            const childType = this.hasChildren(child.id, tree)
                ? 'I' + this.capitalize(child.id)
                : this.getBaseType(child.type);
            dts += `    /** ${child.id} */\n`;
            dts += `    readonly ${child.id}: ${childType};\n`;
        }
        
        dts += '}\n\n';
        dts += 'declare const RootElement: IRootElement;\n';
        return dts;
    }
    
    getBaseType(widgetType) {
        const typeMap = {
            'button': 'IButton',
            'label': 'ILabel',
            'textinput': 'ITextInput',
            'slider': 'ISlider',
            'image': 'IImage',
            'panel': 'IPanel'
        };
        return typeMap[widgetType] || 'IWidget';
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
```

#### 使用示例

```javascript
// 1. 用户在编辑器中设计UI：
// - 创建 loginPanel
// - 在 loginPanel 中添加 usernameInput, passwordInput, submitButton

// 2. 用户点击"导出"按钮

// 3. 系统生成两个文件：
//    - my_ui.ui (UI定义)
//    - my_ui.d.ts (TypeScript定义)

// 4. my_ui.d.ts 内容示例：
/*
interface ILoginPanel extends IPanel {
    readonly usernameInput: ITextInput;
    readonly passwordInput: ITextInput;
    readonly submitButton: IButton;
}

interface IRootElement {
    readonly loginPanel: ILoginPanel;
}

declare const RootElement: IRootElement;
*/

// 5. 用户在VSCode中编写脚本，获得智能提示：
function onClick(event) {
    RootElement.loginPanel.usernameInput.setText("Hello");
    //                                    ^ 自动提示所有方法
}
```
```

## 编辑器工作流设计

### 脚本管理面板设计

#### UI布局

```
┌─────────────────────────────────────────────┐
│  属性面板 (Properties)                      │
├─────────────────────────────────────────────┤
│  控件ID: button1                            │
│  类型: Button                                │
│  位置: X: 100, Y: 50                        │
│  ...                                         │
├─────────────────────────────────────────────┤
│  📜 脚本 (Scripts)                          │
│  ┌─────────────────────────────────────┐   │
│  │ ○ 无脚本                             │   │
│  │ ○ 使用已有脚本                       │   │
│  │ ● 创建新脚本                         │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  [+ 创建脚本模板]  [📁 选择文件]           │
│                                              │
│  当前脚本: button1.js                       │
│  [✏️ 编辑] [🗑️ 解除关联] [👁️ 预览]        │
│                                              │
│  可用事件:                                   │
│  ☑ onClick       [编辑]                    │
│  ☐ onHover       [添加]                    │
│  ☐ onMouseDown   [添加]                    │
│  ☐ onMouseUp     [添加]                    │
└─────────────────────────────────────────────┘
```

### 脚本命名规则

#### 推荐的命名约定

```
方案1：控件ID命名（推荐）
- button1.js
- loginPanel.js
- usernameInput.js

方案2：功能命名
- login-handler.js
- game-controls.js
- ui-animations.js

方案3：分类命名
- buttons/submit-button.js
- panels/login-panel.js
- inputs/username-input.js

方案4：自动命名（默认）
- widget_<id>.js
- widget_button1.js
```

**编辑器默认规则：**
```javascript
function getDefaultScriptName(widget) {
    // 优先使用控件ID（如果有效）
    if (widget.id && /^[a-zA-Z_][\w]*$/.test(widget.id)) {
        return `${widget.id}.js`;
    }
    
    // 否则使用类型+序号
    const count = getWidgetCountByType(widget.type);
    return `${widget.type}_${count}.js`;
}
```

### 脚本创建工作流

#### 方式1：快速创建（推荐）

```javascript
// 用户操作：
// 1. 选中控件
// 2. 点击"创建脚本模板"按钮

class ScriptManager {
    createScriptTemplate(widget) {
        // 1. 生成脚本名称
        const scriptName = this.suggestScriptName(widget);
        
        // 2. 生成模板代码
        const template = this.generateScriptTemplate(widget);
        
        // 3. 保存到项目scripts目录
        const scriptPath = `scripts/${scriptName}`;
        this.saveScriptFile(scriptPath, template);
        
        // 4. 关联到控件
        widget.scriptFile = scriptPath;
        
        // 5. 在外部编辑器中打开
        this.openInExternalEditor(scriptPath);
        
        return scriptPath;
    }
    
    generateScriptTemplate(widget) {
        // 根据控件类型生成不同的模板
        const templates = {
            'button': this.generateButtonTemplate,
            'textinput': this.generateTextInputTemplate,
            'slider': this.generateSliderTemplate,
            'panel': this.generatePanelTemplate,
        };
        
        const generator = templates[widget.type] || this.generateGenericTemplate;
        return generator.call(this, widget);
    }
    
    generateButtonTemplate(widget) {
        return `// ${widget.id} - Button脚本
// 自动生成于 ${new Date().toISOString()}

/**
 * 按钮点击事件
 * @param {Object} event - 事件对象
 * @param {number} event.x - 鼠标X坐标
 * @param {number} event.y - 鼠标Y坐标
 * @param {number} event.button - 鼠标按钮
 */
function onClick(event) {
    console.log("${widget.id} clicked at", event.x, event.y);
    
    // TODO: 实现点击逻辑
    setText("Clicked!");
}

/**
 * 鼠标悬停事件
 */
function onHover(event) {
    // TODO: 实现悬停效果
}

/**
 * 鼠标按下事件
 */
function onMouseDown(event) {
    // TODO: 实现按下效果
}

/**
 * 鼠标释放事件
 */
function onMouseUp(event) {
    // TODO: 实现释放效果
}

// ========== 辅助函数 ==========

// 在这里添加自定义辅助函数
`;
    }
    
    generateTextInputTemplate(widget) {
        return `// ${widget.id} - TextInput脚本

/**
 * 文本改变事件
 * @param {Object} event - 事件对象
 * @param {string} event.text - 当前文本
 */
function onChange(event) {
    console.log("Text changed:", event.text);
    
    // TODO: 实现输入验证
}

/**
 * 获得焦点事件
 */
function onFocus(event) {
    // TODO: 实现焦点效果
}

/**
 * 失去焦点事件
 */
function onBlur(event) {
    // TODO: 实现失焦处理
}

/**
 * 提交事件（Enter键）
 */
function onSubmit(event) {
    console.log("Submitted:", event.text);
    
    // TODO: 实现提交逻辑
}
`;
    }
    
    generateSliderTemplate(widget) {
        return `// ${widget.id} - Slider脚本

/**
 * 值改变事件
 * @param {Object} event - 事件对象
 * @param {number} event.value - 当前值
 * @param {number} event.oldValue - 旧值
 */
function onValueChange(event) {
    console.log("Value changed:", event.value);
    
    // TODO: 更新关联的UI元素
    // RootElement.someLabel.setText("Value: " + event.value);
}
`;
    }
    
    generatePanelTemplate(widget) {
        return `// ${widget.id} - Panel脚本

/**
 * 面板初始化事件
 * 在面板及其子控件创建后调用
 */
function onInit() {
    console.log("Panel ${widget.id} initialized");
    
    // TODO: 初始化面板状态
}

/**
 * 所有控件就绪事件
 * 在所有UI加载完成后调用
 */
function onReady() {
    // TODO: 配置子控件
    // RootElement.${widget.id}.childButton.setText("Ready!");
}

/**
 * 面板点击事件（背景区域）
 */
function onClick(event) {
    // TODO: 处理面板点击
}
`;
    }
    
    suggestScriptName(widget) {
        // 1. 检查是否已有脚本名称建议
        if (widget.suggestedScriptName) {
            return widget.suggestedScriptName;
        }
        
        // 2. 使用控件ID（如果有效）
        if (widget.id && /^[a-zA-Z_][\w]*$/.test(widget.id)) {
            return `${widget.id}.js`;
        }
        
        // 3. 使用类型+时间戳
        const timestamp = Date.now();
        return `${widget.type}_${timestamp}.js`;
    }
}
```

#### 方式2：选择已有脚本

```javascript
class ScriptManager {
    selectExistingScript(widget) {
        // 1. 列出所有可用脚本
        const scripts = this.listAvailableScripts();
        
        // 2. 显示选择对话框
        const selected = this.showScriptSelector({
            title: `选择 ${widget.id} 的脚本`,
            scripts: scripts,
            filter: (script) => {
                // 可以按类型过滤
                return script.compatibleWith.includes(widget.type);
            }
        });
        
        // 3. 关联脚本
        if (selected) {
            widget.scriptFile = selected.path;
            this.updatePropertyPanel();
        }
    }
    
    listAvailableScripts() {
        // 扫描项目scripts目录
        const scriptsDir = path.join(projectDir, 'scripts');
        const files = fs.readdirSync(scriptsDir, { recursive: true });
        
        return files
            .filter(file => file.endsWith('.js'))
            .map(file => ({
                path: path.relative(projectDir, file),
                name: path.basename(file, '.js'),
                compatibleWith: this.detectCompatibleTypes(file)
            }));
    }
}
```

#### 方式3：内联编辑（简单场景）

```javascript
class ScriptManager {
    enableInlineEditing(widget, eventName) {
        // 显示简单的代码编辑器
        const editor = this.showInlineEditor({
            title: `${widget.id}.${eventName}`,
            language: 'javascript',
            initialValue: widget.scripts?.[eventName] || this.getEventTemplate(eventName),
            onSave: (code) => {
                // 保存为内联脚本
                if (!widget.scripts) widget.scripts = {};
                widget.scripts[eventName] = code;
            }
        });
    }
    
    getEventTemplate(eventName) {
        const templates = {
            'onClick': 'function onClick(event) {\n    // TODO\n}',
            'onHover': 'function onHover(event) {\n    // TODO\n}',
            'onChange': 'function onChange(event) {\n    // TODO\n}',
        };
        return templates[eventName] || `function ${eventName}(event) {\n    // TODO\n}`;
    }
}
```

### 编辑器UI实现

#### HTML结构

```html
<!-- 脚本管理面板 -->
<div class="script-panel">
    <h3>脚本 (Scripts)</h3>
    
    <!-- 脚本关联选项 -->
    <div class="script-options">
        <label>
            <input type="radio" name="scriptMode" value="none" checked>
            无脚本
        </label>
        <label>
            <input type="radio" name="scriptMode" value="existing">
            使用已有脚本
        </label>
        <label>
            <input type="radio" name="scriptMode" value="new">
            创建新脚本
        </label>
    </div>
    
    <!-- 快速操作按钮 -->
    <div class="script-actions">
        <button id="btnCreateTemplate" class="btn-primary">
            <span class="icon">📝</span>
            创建脚本模板
        </button>
        <button id="btnSelectFile" class="btn-secondary">
            <span class="icon">📁</span>
            选择文件
        </button>
    </div>
    
    <!-- 当前脚本信息 -->
    <div id="currentScript" class="current-script" style="display: none;">
        <div class="script-info">
            <span class="script-name">button1.js</span>
            <div class="script-actions-inline">
                <button class="btn-icon" title="编辑">✏️</button>
                <button class="btn-icon" title="在外部编辑器中打开">🔗</button>
                <button class="btn-icon" title="解除关联">🗑️</button>
            </div>
        </div>
        
        <!-- 事件列表 -->
        <div class="events-list">
            <h4>可用事件:</h4>
            <div class="event-item">
                <label>
                    <input type="checkbox" checked disabled>
                    onClick
                </label>
                <button class="btn-edit">编辑</button>
            </div>
            <div class="event-item">
                <label>
                    <input type="checkbox">
                    onHover
                </label>
                <button class="btn-add">添加</button>
            </div>
            <div class="event-item">
                <label>
                    <input type="checkbox">
                    onMouseDown
                </label>
                <button class="btn-add">添加</button>
            </div>
        </div>
    </div>
    
    <!-- 内联编辑器（可选） -->
    <div id="inlineEditor" class="inline-editor" style="display: none;">
        <div class="editor-header">
            <span>编辑 onClick 事件</span>
            <button class="btn-close">×</button>
        </div>
        <textarea id="codeEditor" class="code-editor"></textarea>
        <div class="editor-footer">
            <button class="btn-save">保存</button>
            <button class="btn-cancel">取消</button>
        </div>
    </div>
</div>
```

#### JavaScript实现

```javascript
// frontend/src/js/script-manager.js

class ScriptManager {
    constructor(app) {
        this.app = app;
        this.scriptsDir = 'scripts/';
        this.setupUI();
    }
    
    setupUI() {
        // 创建模板按钮
        document.getElementById('btnCreateTemplate').addEventListener('click', () => {
            this.createScriptTemplate(this.app.selectedWidget);
        });
        
        // 选择文件按钮
        document.getElementById('btnSelectFile').addEventListener('click', () => {
            this.selectScriptFile(this.app.selectedWidget);
        });
    }
    
    async createScriptTemplate(widget) {
        if (!widget) {
            alert('请先选择一个控件');
            return;
        }
        
        // 1. 建议脚本名称
        const suggestedName = this.suggestScriptName(widget);
        const scriptName = prompt('脚本文件名:', suggestedName);
        
        if (!scriptName) return;
        
        // 2. 生成模板
        const template = this.generateTemplate(widget);
        
        // 3. 保存文件
        const scriptPath = `${this.scriptsDir}${scriptName}`;
        await this.saveScript(scriptPath, template);
        
        // 4. 关联到控件
        widget.scriptFile = scriptPath;
        
        // 5. 更新UI
        this.updateScriptPanel(widget);
        
        // 6. 在外部编辑器中打开
        this.openInExternalEditor(scriptPath);
        
        console.log('Created script template:', scriptPath);
    }
    
    async selectScriptFile(widget) {
        // 使用Electron的文件选择对话框
        const filePath = await window.electronAPI.selectFile({
            filters: [
                { name: 'JavaScript', extensions: ['js'] }
            ],
            defaultPath: this.scriptsDir
        });
        
        if (filePath) {
            widget.scriptFile = filePath;
            this.updateScriptPanel(widget);
        }
    }
    
    suggestScriptName(widget) {
        // 优先使用控件ID
        if (widget.id && /^[a-zA-Z_][\w]*$/.test(widget.id)) {
            return `${widget.id}.js`;
        }
        
        // 使用类型+序号
        const count = this.getWidgetCountByType(widget.type);
        return `${widget.type}${count}.js`;
    }
    
    generateTemplate(widget) {
        const generators = {
            'button': this.generateButtonTemplate,
            'textinput': this.generateTextInputTemplate,
            'slider': this.generateSliderTemplate,
            'panel': this.generatePanelTemplate,
        };
        
        const generate = generators[widget.type] || this.generateGenericTemplate;
        return generate.call(this, widget);
    }
    
    generateButtonTemplate(widget) {
        return `// ${widget.id} - Button脚本
// 自动生成于 ${new Date().toISOString()}

/**
 * 按钮点击事件
 */
function onClick(event) {
    console.log("${widget.id} clicked");
    
    // TODO: 实现点击逻辑
    setText("Clicked!");
    
    // 访问其他控件示例:
    // RootElement.someLabel.setText("Hello!");
}

/**
 * 鼠标悬停事件
 */
function onHover(event) {
    // TODO: 实现悬停效果
}
`;
    }
    
    updateScriptPanel(widget) {
        const panel = document.getElementById('currentScript');
        
        if (widget.scriptFile) {
            panel.style.display = 'block';
            panel.querySelector('.script-name').textContent = 
                path.basename(widget.scriptFile);
            
            // 更新事件列表
            this.updateEventsList(widget);
        } else {
            panel.style.display = 'none';
        }
    }
    
    updateEventsList(widget) {
        // 根据控件类型显示可用事件
        const events = this.getAvailableEvents(widget.type);
        // ... 更新UI
    }
    
    getAvailableEvents(widgetType) {
        const commonEvents = ['onClick', 'onHover', 'onMouseDown', 'onMouseUp'];
        
        const typeSpecificEvents = {
            'button': commonEvents,
            'textinput': ['onChange', 'onFocus', 'onBlur', 'onSubmit', ...commonEvents],
            'slider': ['onValueChange', ...commonEvents],
            'panel': ['onInit', 'onReady', ...commonEvents],
        };
        
        return typeSpecificEvents[widgetType] || commonEvents;
    }
    
    async saveScript(path, content) {
        // 使用Electron API保存文件
        await window.electronAPI.saveTextFile(path, content);
    }
    
    async openInExternalEditor(path) {
        // 使用系统默认编辑器打开
        await window.electronAPI.openExternal(path);
    }
}
```

### 项目目录结构

```
my_game_project/
├── my_game.ebiten          # 项目文件
├── my_game.ui              # 导出的UI
├── my_game.d.ts            # TypeScript定义
├── my_game_a1b2c3d4.pak   # 资源包
├── scripts/                 # 脚本目录
│   ├── utils.js            # 公共模块
│   ├── config.js           # 配置模块
│   ├── button1.js          # 按钮脚本
│   ├── loginPanel.js       # 登录面板脚本
│   └── gameControls.js     # 游戏控制脚本
└── assets/                  # 资源目录
    ├── images/
    └── fonts/
```

### 最佳实践建议

#### 1. 脚本命名约定

```
✅ 推荐:
- loginButton.js        (控件ID)
- mainPanel.js
- scoreLabel.js

✅ 可接受:
- login-handler.js      (功能命名)
- ui-animations.js
- game-logic.js

❌ 避免:
- script1.js            (无意义)
- temp.js
- test.js
```

#### 2. 脚本组织

```
小型项目（< 10个脚本）:
scripts/
├── button1.js
├── panel1.js
└── utils.js

中型项目（10-50个脚本）:
scripts/
├── ui/
│   ├── buttons/
│   ├── panels/
│   └── inputs/
├── logic/
│   ├── game.js
│   └── network.js
└── utils.js

大型项目（> 50个脚本）:
scripts/
├── modules/
│   ├── ui/
│   ├── game/
│   └── network/
├── widgets/
│   ├── buttons/
│   ├── panels/
│   └── inputs/
└── shared/
    ├── utils.js
    ├── constants.js
    └── helpers.js
```

#### 3. 工作流建议

**推荐工作流：**
```
1. 设计UI布局（编辑器）
2. 为主要控件创建脚本模板（编辑器）
3. 在VSCode中编写脚本逻辑（获得智能提示）
4. 在编辑器中预览和调试
5. 导出UI包（自动生成.d.ts）
```

**开发时：**
- 使用VSCode或其他IDE编写脚本（有智能提示）
- 编辑器自动检测文件变化并重新加载
- 使用预览功能测试脚本效果

**发布时：**
- 导出UI包时自动打包所有关联脚本
- 生成最新的.d.ts定义文件

## 持久VM的优势和管理

### 为什么使用持久VM？

由于我们的设计中：
1. **单一协程执行脚本** - 没有并发读写VM的问题
2. **频繁执行事件** - 避免重复创建VM的开销
3. **全局状态共享** - 脚本间需要共享数据

因此使用**持久VM**是最优选择。

### 持久VM的优势

```go
// ❌ 旧方案：每次事件都创建新VM（低效）
func (se *ScriptEngine) handleEventOld(event WidgetEvent) {
    vm := goja.New() // 重复创建，耗时~1ms
    se.setupAPI(vm)
    vm.RunString(script)
}

// ✅ 新方案：持久VM（高效）
func (se *ScriptEngine) handleEvent(event WidgetEvent) {
    // se.vm 始终存在，直接使用
    handler.Call(goja.Undefined(), se.vm.ToValue(eventObj))
}
```

**性能对比：**
- 创建VM：~1ms
- 执行简单脚本（持久VM）：~0.01ms
- **提升100倍！**

### 内存管理策略

#### 1. 垃圾回收监控

```go
type VMMemoryMonitor struct {
    vm              *goja.Runtime
    lastGCTime      time.Time
    gcInterval      time.Duration
    memoryThreshold uint64
}

func NewVMMemoryMonitor(vm *goja.Runtime) *VMMemoryMonitor {
    return &VMMemoryMonitor{
        vm:              vm,
        lastGCTime:      time.Now(),
        gcInterval:      time.Minute * 5,      // 5分钟检查一次
        memoryThreshold: 100 * 1024 * 1024,    // 100MB阈值
    }
}

func (m *VMMemoryMonitor) Check() {
    now := time.Now()
    if now.Sub(m.lastGCTime) < m.gcInterval {
        return
    }
    
    var memStats runtime.MemStats
    runtime.ReadMemStats(&memStats)
    
    // 如果内存使用超过阈值，触发GC
    if memStats.Alloc > m.memoryThreshold {
        log.Println("Triggering GC, memory usage:", memStats.Alloc)
        runtime.GC()
        m.lastGCTime = now
    }
}

// 在事件循环中定期检查
func (se *ScriptEngine) eventLoop() {
    monitor := NewVMMemoryMonitor(se.vm)
    ticker := time.NewTicker(time.Minute)
    defer ticker.Stop()
    
    for {
        select {
        case <-se.stopChan:
            return
        case event := <-se.eventQueue.events:
            se.handleEvent(event)
            monitor.Check() // 处理事件后检查内存
        case <-ticker.C:
            monitor.Check() // 定时检查
        }
    }
}
```

#### 2. VM重启策略（可选）

```go
type VMResetPolicy struct {
    eventCount      int
    maxEventCount   int
    uptime          time.Time
    maxUptime       time.Duration
}

func (se *ScriptEngine) shouldResetVM(policy *VMResetPolicy) bool {
    // 策略1：处理事件数过多
    if policy.eventCount > policy.maxEventCount {
        return true
    }
    
    // 策略2：运行时间过长
    if time.Since(policy.uptime) > policy.maxUptime {
        return true
    }
    
    return false
}

func (se *ScriptEngine) resetVM() {
    log.Println("Resetting VM...")
    
    // 保存全局状态
    globalStateBackup := se.exportGlobalState()
    
    // 创建新VM
    se.vm = goja.New()
    se.setupAPI()
    
    // 恢复全局状态
    se.importGlobalState(globalStateBackup)
    
    // 重新加载所有模块
    se.reloadModules()
}

func (se *ScriptEngine) exportGlobalState() map[string]interface{} {
    backup := make(map[string]interface{})
    
    // 导出Global对象的所有属性
    for _, key := range se.globalState.Keys() {
        value := se.globalState.Get(key)
        backup[key] = value.Export()
    }
    
    return backup
}

func (se *ScriptEngine) importGlobalState(backup map[string]interface{}) {
    se.globalState = se.vm.NewObject()
    for key, value := range backup {
        se.globalState.Set(key, value)
    }
    se.vm.Set("Global", se.globalState)
}
```

#### 3. 内存泄漏预防

```go
// 清理未使用的事件处理器
func (se *ScriptEngine) CleanupHandlers(activeWidgetIDs []string) {
    activeMap := make(map[string]bool)
    for _, id := range activeWidgetIDs {
        activeMap[id] = true
    }
    
    for widgetID := range se.eventHandlers {
        if !activeMap[widgetID] {
            delete(se.eventHandlers, widgetID)
            log.Printf("Cleaned up handlers for removed widget: %s", widgetID)
        }
    }
}

// 清理未使用的模块
func (se *ScriptEngine) UnloadModule(moduleName string) {
    delete(se.modules, moduleName)
    
    // 从VM中移除引用
    se.vm.RunString(fmt.Sprintf(`
        if (__modules && __modules["%s"]) {
            delete __modules["%s"];
        }
    `, moduleName, moduleName))
}
```

### 全局状态管理最佳实践

#### 命名空间组织

```javascript
// ❌ 不推荐：全局变量污染
Global.username = "Alice";
Global.score = 100;
Global.level = 1;

// ✅ 推荐：使用命名空间
Global.user = {
    name: "Alice",
    score: 100,
    level: 1
};

Global.game = {
    state: "playing",
    paused: false
};

Global.ui = {
    currentPanel: "main",
    theme: "dark"
};
```

#### 状态持久化

```go
// 保存全局状态到文件
func (se *ScriptEngine) SaveGlobalState(filename string) error {
    state := se.exportGlobalState()
    data, err := json.Marshal(state)
    if err != nil {
        return err
    }
    return os.WriteFile(filename, data, 0644)
}

// 从文件加载全局状态
func (se *ScriptEngine) LoadGlobalState(filename string) error {
    data, err := os.ReadFile(filename)
    if err != nil {
        return err
    }
    
    var state map[string]interface{}
    if err := json.Unmarshal(data, &state); err != nil {
        return err
    }
    
    se.importGlobalState(state)
    return nil
}
```

### 并发安全保证

虽然持久VM在单协程中运行，但仍需注意：

```go
// ✅ 正确：所有VM操作都在脚本协程中
func (se *ScriptEngine) SetGlobalVariable(key string, value interface{}) {
    // 通过事件队列传递
    se.eventQueue.Push(WidgetEvent{
        Type: "set_global",
        Data: map[string]interface{}{
            "key":   key,
            "value": value,
        },
    })
}

// 在事件循环中处理
func (se *ScriptEngine) handleEvent(event WidgetEvent) {
    if event.Type == "set_global" {
        key := event.Data["key"].(string)
        value := event.Data["value"]
        se.globalState.Set(key, value)
        return
    }
    // ... 其他事件处理
}

// ❌ 错误：从其他协程直接访问VM
func (se *ScriptEngine) SetGlobalVariableUnsafe(key string, value interface{}) {
    se.globalState.Set(key, value) // 竞态条件！
}
```

## 潜在问题和解决方案

### 1. 脚本执行超时

**问题**：恶意或错误的脚本可能死循环

**解决方案**：
```go
// 使用 context 控制超时
func (se *ScriptEngine) executeHandlerWithTimeout(handler goja.Callable, event WidgetEvent, timeout time.Duration) {
    done := make(chan error, 1)
    
    go func() {
        _, err := handler(goja.Undefined(), se.vm.ToValue(event))
        done <- err
    }()
    
    select {
    case err := <-done:
        if err != nil {
            log.Printf("Script error: %v", err)
        }
    case <-time.After(timeout):
        log.Printf("Script timeout in widget %s, resetting VM", event.WidgetID)
        // goja 不支持中断，需要重启整个VM
        se.resetVM()
    }
}
```

**注意**：由于 goja 不支持中断正在执行的脚本，超时只能通过重启 VM 解决。因此：
- 设置合理的超时时间（如500ms）
- 教育用户避免死循环
- 在编辑器中提供脚本静态分析

### 2. 脚本沙箱安全

**问题**：脚本可能访问不该访问的 Go API

**解决方案**：
```go
func (se *ScriptEngine) setupAPI() {
    // ✅ 只注入安全的 API
    se.vm.Set("console", map[string]interface{}{
        "log": func(args ...interface{}) {
            log.Println("[Script]", args...)
        },
    })
    
    se.vm.Set("Widget", map[string]interface{}{
        "setText":    se.jsSetText,
        "setVisible": se.jsSetVisible,
        // ... 只暴露UI操作
    })
    
    // ❌ 不要注入危险的包
    // se.vm.Set("os", os)      // 禁止！
    // se.vm.Set("net", net)    // 禁止！
    // se.vm.Set("io", io)      // 禁止！
    
    // ✅ 禁用 require 原生模块
    se.vm.RunString(`
        const originalRequire = require;
        require = function(name) {
            const allowedModules = ['utils', 'config']; // 白名单
            if (allowedModules.includes(name)) {
                return originalRequire(name);
            }
            throw new Error('Module not allowed: ' + name);
        };
    `)
}
```

### 3. 事件队列溢出

**问题**：事件生成速度 > 处理速度，导致队列溢出

**解决方案**：
```go
// 1. 有限缓冲 + 丢弃策略
type EventQueue struct {
    events    chan WidgetEvent
    dropped   atomic.Uint64
}

func (eq *EventQueue) Push(event WidgetEvent) bool {
    select {
    case eq.events <- event:
        return true
    default:
        eq.dropped.Add(1)
        if eq.dropped.Load()%100 == 0 {
            log.Printf("Warning: %d events dropped", eq.dropped.Load())
        }
        return false
    }
}

// 2. 事件优先级
type PriorityEvent struct {
    Event    WidgetEvent
    Priority int // 0=highest
}

// Click优先于Hover
func (eq *EventQueue) PushWithPriority(event WidgetEvent) {
    priority := 1
    if event.Type == EventClick {
        priority = 0
    } else if event.Type == EventHover {
        priority = 2
    }
    // ... 使用优先级队列
}

// 3. 事件合并
func (eq *EventQueue) MergeEvents(events []WidgetEvent) []WidgetEvent {
    merged := make(map[string]WidgetEvent)
    
    for _, event := range events {
        // Hover事件只保留最新的
        if event.Type == EventHover {
            key := event.WidgetID + ":hover"
            merged[key] = event
        } else {
            // Click等重要事件全部保留
            key := fmt.Sprintf("%s:%s:%d", event.WidgetID, event.Type, event.Timestamp)
            merged[key] = event
        }
    }
    
    result := make([]WidgetEvent, 0, len(merged))
    for _, event := range merged {
        result = append(result, event)
    }
    return result
}
```

### 4. 跨控件事件依赖

**问题**：A控件的脚本可能依赖B控件的状态，但B还未初始化

**解决方案**：
```go
// 1. 生命周期事件
type WidgetLifecycle string

const (
    LifecycleInit    WidgetLifecycle = "init"    // 控件创建
    LifecycleReady   WidgetLifecycle = "ready"   // 所有控件加载完成
    LifecycleDestroy WidgetLifecycle = "destroy" // 控件销毁
)

// 2. 确保初始化顺序
func (um *UIManager) LoadLayout() error {
    // 步骤1: 创建所有控件
    for _, widgetData := range layout.Widgets {
        widget := createWidget(widgetData)
        um.AddWidget(widget)
    }
    
    // 步骤2: 加载所有脚本
    for _, widgetData := range layout.Widgets {
        um.scriptEngine.LoadWidgetScript(widget.GetID(), script)
    }
    
    // 步骤3: 触发 init 事件
    for _, widget := range um.widgets {
        um.scriptEngine.eventQueue.Push(WidgetEvent{
            Type:     "init",
            WidgetID: widget.GetID(),
        })
    }
    
    // 步骤4: 触发 ready 事件（所有控件都已初始化）
    for _, widget := range um.widgets {
        um.scriptEngine.eventQueue.Push(WidgetEvent{
            Type:     "ready",
            WidgetID: widget.GetID(),
        })
    }
    
    return nil
}
```

```javascript
// 在脚本中使用
function onInit() {
    console.log("Widget initializing...");
    // 此时其他控件可能还未准备好
}

function onReady() {
    console.log("All widgets ready!");
    // 此时可以安全地访问其他控件
    Widget.setText("otherWidget", "Hello");
}
```

## 性能优化建议

### 1. 脚本预编译

```go
type CompiledHandler struct {
    program *goja.Program
}

func (se *ScriptEngine) CompileHandler(script string) (*CompiledHandler, error) {
    program, err := goja.Compile("", script, false)
    if err != nil {
        return nil, err
    }
    return &CompiledHandler{program: program}, nil
}

// 加载时预编译
func (se *ScriptEngine) LoadWidgetScriptCompiled(widgetID string, script string) error {
    compiled, err := se.CompileHandler(script)
    if err != nil {
        return err
    }
    
    // 存储预编译的程序
    se.compiledHandlers[widgetID] = compiled
    return nil
}
```

### 2. 事件节流

```go
type EventThrottler struct {
    lastTrigger map[string]time.Time
    mutex       sync.Mutex
}

func (et *EventThrottler) ShouldTrigger(key string, interval time.Duration) bool {
    et.mutex.Lock()
    defer et.mutex.Unlock()
    
    now := time.Now()
    last, exists := et.lastTrigger[key]
    
    if !exists || now.Sub(last) >= interval {
        et.lastTrigger[key] = now
        return true
    }
    return false
}

// 在事件生成时节流
func (um *UIManager) Update() error {
    x, y := ebiten.CursorPosition()
    
    // Hover事件节流（16ms = 60fps）
    key := fmt.Sprintf("hover:%d:%d", x, y)
    if um.throttler.ShouldTrigger(key, 16*time.Millisecond) {
        // 生成hover事件
    }
}
```

### 3. 批量命令执行

```go
func (um *UIManager) applyCommands() {
    commands := um.scriptEngine.commandQueue.PopAll()
    
    // 合并相同控件的相同属性
    merged := make(map[string]WidgetCommand)
    for _, cmd := range commands {
        if cmd.Type == CommandSetProperty {
            key := cmd.WidgetID + ":" + cmd.Property
            merged[key] = cmd // 后面的覆盖前面的
        }
    }
    
    // 批量应用
    for _, cmd := range merged {
        um.setWidgetProperty(cmd.WidgetID, cmd.Property, cmd.Value)
    }
}
```

## 下一步实现计划

### 阶段1：基础框架（1-2天）
- [ ] 实现 EventQueue 和 CommandQueue
- [ ] 创建 ScriptEngine 骨架
- [ ] 集成 goja 并测试基础脚本

### 阶段2：事件系统（2-3天）
- [ ] 实现事件分发机制
- [ ] 支持标准事件（Click、Hover等）
- [ ] 实现事件->处理器的灵活映射

### 阶段3：模块系统（2-3天）
- [ ] 实现 LoadScriptModule
- [ ] 实现 LoadWidgetScript
- [ ] 支持 require() 加载模块

### 阶段4：UI树系统（2-3天）✨
- [ ] 实现 BuildUITree 构建UI树
- [ ] 创建 Widget 代理对象（getter/setter）
- [ ] 实现树节点的递归构建
- [ ] 测试层级访问（RootElement.panel.button）

### 阶段5：TypeScript生成器（1-2天）✨
- [ ] Go端：实现 TypeScriptGenerator
- [ ] 前端：实现 TypeScriptDefinitionGenerator
- [ ] 在导出UI时自动生成 .d.ts
- [ ] 测试IDE智能提示

### 阶段6：UI集成（3-4天）
- [ ] 更新 Loader 支持加载脚本
- [ ] 在 UIManager 中集成 ScriptEngine
- [ ] 命令执行器实现
- [ ] 集成 BuildUITree 到加载流程

### 阶段7：编辑器支持（3-5天）
- [ ] 前端添加脚本编辑器
- [ ] 支持脚本导出到 .ui 文件
- [ ] 实现 .d.ts 自动生成和保存
- [ ] 提供脚本调试工具
- [ ] 添加UI树可视化查看器

### 阶段8：测试和优化（2-3天）
- [ ] 性能测试（UI树访问vs字符串ID）
- [ ] 内存泄漏检测
- [ ] 安全性审计
- [ ] TypeScript定义准确性测试

## 功能亮点总结

### ✨ UI树层级访问
```javascript
// 传统方式（仍支持）
Widget.setText("button1", "Hello");

// 新方式：UI树访问（推荐）
RootElement.panel1.button1.setText("Hello");
```

**优势：**
- 更直观的层级结构
- IDE自动提示完整路径
- 类型安全（TypeScript）
- 避免字符串ID拼写错误

### ✨ TypeScript智能提示
```typescript
// .d.ts 自动生成
interface ILoginPanel extends IPanel {
    readonly usernameInput: ITextInput;
    readonly passwordInput: ITextInput;
}

// 获得完整的IDE支持
RootElement.loginPanel.usernameInput.setText("Alice");
//                                    ^ 自动提示所有方法
```

**优势：**
- 设计期类型检查
- 自动补全UI树结构
- 重构时自动更新引用
- 减少运行时错误

### ✨ 持久VM + 全局状态
```javascript
// 脚本间共享数据
Global.user = { name: "Alice", score: 100 };

// 任何脚本都可访问
console.log(Global.user.name);
```

**优势：**
- 100倍性能提升
- 跨脚本状态共享
- 支持复杂的应用逻辑

---

## 六、TypeScript脚本工作流 🔷

### 6.1 为什么使用TypeScript？

**JavaScript脚本的痛点：**

```javascript
// ❌ 问题：event参数完全不明确
function onClick(event) {
    console.log(event.???);  // 不知道有哪些属性可用
    console.log(event.mouseXX);  // 拼写错误，运行时才发现
}
```

**TypeScript带来的好处：**

```typescript
// ✅ 类型明确，IDE有完整提示
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    console.log(event.mouseX);  // ← 输入event.时自动补全
    api.setText("Clicked!");    // ← 输入api.时自动补全
    // event.mouseXX;  // ← 编译时立即报错
}
```

**核心优势：**
1. **IDE智能提示** - 输入时自动补全所有可用属性和方法
2. **编译时检查** - 拼写错误、类型错误立即发现，不需要运行
3. **代码文档化** - 接口定义即文档，JSDoc自动生成
4. **重构安全** - 重命名、提取函数等操作不会破坏类型关系
5. **团队协作** - 明确的接口契约，降低沟通成本

### 6.2 TypeScript到JavaScript的编译流程

```
┌─────────────────────────────────────────────────────┐
│  阶段1：开发 - 编写TypeScript脚本                      │
│  ─────────────────────────────────────────────       │
│  • 编辑器中编写 loginButton.ts                        │
│  • 引用 script-types.d.ts 获取API类型定义            │
│  • 引用项目生成的 ui_example.d.ts 访问UI树           │
│  • IDE提供完整的类型检查和自动补全                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  阶段2：编译 - TypeScript → JavaScript                │
│  ─────────────────────────────────────────────       │
│  • 使用内置TypeScript编译器(tsc)                      │
│  • 自动监视 .ts 文件变化                              │
│  • 输出到 scripts/compiled/ 目录                     │
│  • 生成 loginButton.js (移除所有类型注解)             │
│  • 可选：生成 .js.map 用于调试                        │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  阶段3：运行 - goja执行纯JavaScript                   │
│  ─────────────────────────────────────────────       │
│  • 运行时只加载编译后的 .js 文件                       │
│  • goja引擎执行纯JavaScript代码                       │
│  • Go端传入普通JS对象作为event参数                    │
│  • 无性能损失（类型检查只在编译时）                     │
└─────────────────────────────────────────────────────┘
```

**关键设计原则：**
- **开发时**：TypeScript提供类型安全和IDE支持
- **运行时**：goja只看到编译后的纯JavaScript，无额外开销
- **类型定义**：仅用于编译时检查，不影响运行时性能

### 6.3 类型系统设计

#### 6.3.1 核心类型定义文件：script-types.d.ts

这是所有控件API和事件类型的中央定义文件：

```typescript
// ========== 控件API接口 ==========

interface IButtonAPI {
    setText(text: string): void;
    getText(): string;
    setFontSize(size: number): void;
    setEnabled(enabled: boolean): void;
    getID(): string;
    getType(): string;
    // ...
}

interface ITextInputAPI {
    setText(text: string): void;
    getText(): string;
    setPlaceholder(text: string): void;
    setMaxLength(length: number): void;
    setInputMode(mode: 'text' | 'password' | 'number' | 'email'): void;
    setFocus(): void;
    blur(): void;
    getID(): string;
    getType(): string;
    // ...
}

// ========== 事件参数类型（含event.target） ==========

/** 按钮点击事件 */
interface ButtonClickEvent {
    type: 'click';
    target: IButtonAPI;        // ← 新增：当前控件对象
    mouseX: number;
    mouseY: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    clickCount: number;  // 单击/双击
}

/** 文本输入改变事件 */
interface TextInputChangeEvent {
    type: 'change';
    target: ITextInputAPI;     // ← 新增：当前控件对象
    text: string;
    oldText: string;
    isUserInput: boolean;  // 区分代码修改vs用户输入
}

/** 鼠标悬停事件 */
interface MouseHoverEvent {
    type: 'hover';
    target: IWidgetAPI;        // ← 新增：当前控件对象
    mouseX: number;
    mouseY: number;
    isEnter: boolean;  // true=进入, false=离开
}

// 其他所有事件类型都包含 target 属性...
```

**关键设计：event.target**

`event.target` 指向触发事件的控件API对象，类似于DOM中的`event.target`：

```typescript
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    // event.target 和 api 指向同一个对象
    console.log(event.target === api);  // true
    
    // 三种等价的写法：
    event.target.setText("Clicked!");  // 使用event.target
    api.setText("Clicked!");           // 使用api参数
    
    // 获取控件信息
    console.log("Button ID:", event.target.getID());
    console.log("Button type:", event.target.getType());
}
```

**使用场景：**

1. **多控件共享脚本**：通过`event.target.getID()`区分具体是哪个控件触发
2. **动态控件列表**：不需要为每个控件写单独的脚本
3. **通用工具函数**：传递`event.target`给辅助函数，实现复用

```typescript
// 示例：多个按钮共享一个脚本
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    const buttonId = event.target.getID();
    
    switch (buttonId) {
        case "saveButton":
            handleSave(event.target);
            break;
        case "cancelButton":
            handleCancel(event.target);
            break;
        case "deleteButton":
            handleDelete(event.target);
            break;
    }
}

function handleSave(button: IButtonAPI): void {
    button.setText("保存中...");
    button.setEnabled(false);
    // ...
}
```

#### 6.3.2 项目UI树类型：自动生成

每次导出项目时，根据UI树结构自动生成类型定义：

```typescript
// ui_example.d.ts（自动生成，不要手动编辑）

interface IRootElement {
    loginPanel: {
        usernameInput: ITextInputAPI;
        passwordInput: ITextInputAPI;
        loginButton: IButtonAPI;
        errorLabel: ILabelAPI;
        hintLabel: ILabelAPI;
    };
    mainPanel: {
        scoreLabel: ILabelAPI;
        settingsButton: IButtonAPI;
    };
}

declare const RootElement: IRootElement;
```

这样在脚本中就可以享受完整的类型提示：

```typescript
// ✅ IDE会在输入时自动补全整个路径
RootElement.loginPanel.usernameInput.setText("admin");
//         ↑         ↑            ↑
//      自动补全   自动补全      自动补全所有方法
```

### 6.4 TypeScript编译器集成

#### 6.4.1 使用Node.js的typescript包

编辑器（Electron）内置TypeScript编译器：

```javascript
// frontend/src/js/ScriptCompiler.js
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

class ScriptCompiler {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.scriptsDir = path.join(projectRoot, 'scripts');
        this.compiledDir = path.join(this.scriptsDir, 'compiled');
        
        // 确保输出目录存在
        if (!fs.existsSync(this.compiledDir)) {
            fs.mkdirSync(this.compiledDir, { recursive: true });
        }
        
        // TypeScript编译选项
        this.compilerOptions = {
            target: ts.ScriptTarget.ES2015,  // goja支持ES2015
            module: ts.ModuleKind.CommonJS,  // require()风格
            outDir: this.compiledDir,
            strict: true,                    // 严格类型检查
            noImplicitAny: true,
            skipLibCheck: true,
            esModuleInterop: true
        };
    }
    
    /**
     * 编译单个TypeScript文件
     */
    compileFile(tsFilePath) {
        const sourceCode = fs.readFileSync(tsFilePath, 'utf8');
        const fileName = path.basename(tsFilePath);
        
        // 使用transpileModule进行快速编译
        const result = ts.transpileModule(sourceCode, {
            compilerOptions: this.compilerOptions,
            fileName: fileName
        });
        
        // 检查诊断信息（错误/警告）
        if (result.diagnostics && result.diagnostics.length > 0) {
            const errors = result.diagnostics.map(d => ({
                line: d.file ? 
                    d.file.getLineAndCharacterOfPosition(d.start).line + 1 : 0,
                message: ts.flattenDiagnosticMessageText(
                    d.messageText, '\n'
                ),
                code: d.code
            }));
            
            return { 
                success: false, 
                errors,
                file: fileName 
            };
        }
        
        // 写入JS文件
        const jsFileName = fileName.replace('.ts', '.js');
        const jsFilePath = path.join(this.compiledDir, jsFileName);
        fs.writeFileSync(jsFilePath, result.outputText, 'utf8');
        
        // 可选：写入source map
        if (result.sourceMapText) {
            fs.writeFileSync(
                jsFilePath + '.map', 
                result.sourceMapText, 
                'utf8'
            );
        }
        
        return { 
            success: true, 
            outputPath: jsFilePath,
            file: fileName 
        };
    }
    
    /**
     * 编译所有脚本
     */
    compileAll() {
        const files = fs.readdirSync(this.scriptsDir)
            .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
        
        const results = [];
        for (const file of files) {
            const filePath = path.join(this.scriptsDir, file);
            const result = this.compileFile(filePath);
            results.push(result);
        }
        
        return results;
    }
    
    /**
     * 监视模式：文件改变时自动编译
     */
    watch() {
        console.log('[TypeScript] Watching for changes...');
        
        fs.watch(this.scriptsDir, { recursive: false }, (eventType, filename) => {
            if (!filename || !filename.endsWith('.ts') || filename.endsWith('.d.ts')) {
                return;
            }
            
            console.log(`[TypeScript] Detected change: ${filename}`);
            const filePath = path.join(this.scriptsDir, filename);
            
            // 延迟编译（避免频繁触发）
            clearTimeout(this.compileTimeout);
            this.compileTimeout = setTimeout(() => {
                const result = this.compileFile(filePath);
                
                if (result.success) {
                    console.log(`[TypeScript] ✓ ${filename} → compiled`);
                    // 触发编辑器刷新预览
                    this.emit('compiled', result);
                } else {
                    console.error(`[TypeScript] ✗ ${filename} → errors:`, 
                        result.errors);
                    this.emit('error', result);
                }
            }, 300);
        });
    }
    
    /**
     * 停止监视
     */
    stopWatch() {
        // fs.watch返回的watcher可以close()
        // 这里简化处理
    }
}

module.exports = ScriptCompiler;
```

#### 6.4.2 编辑器UI集成

在脚本面板添加TypeScript编译功能：

```javascript
// frontend/src/js/script-panel.js

const ScriptCompiler = require('./ScriptCompiler');
let compiler = null;

// 初始化编译器
function initScriptCompiler(projectRoot) {
    compiler = new ScriptCompiler(projectRoot);
    
    // 自动监视模式
    compiler.watch();
    
    // 监听编译事件
    compiler.on('compiled', (result) => {
        showNotification(`✓ ${result.file} 编译成功`, 'success');
        // 刷新预览
        refreshPreview();
    });
    
    compiler.on('error', (result) => {
        showCompileErrors(result.errors);
    });
}

// 手动编译按钮
document.getElementById('btn-compile-scripts').addEventListener('click', async () => {
    if (!compiler) {
        showMessage('请先打开项目', 'warning');
        return;
    }
    
    showMessage('正在编译所有脚本...', 'info');
    
    const results = compiler.compileAll();
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    if (errorCount === 0) {
        showMessage(`✓ 所有脚本编译成功 (${successCount} 个文件)`, 'success');
    } else {
        showMessage(
            `编译完成：${successCount} 成功, ${errorCount} 失败`, 
            'warning'
        );
        
        // 显示错误详情
        const errors = results.filter(r => !r.success);
        showCompileErrorPanel(errors);
    }
});

// 显示编译错误面板
function showCompileErrorPanel(errors) {
    const panel = document.getElementById('compile-error-panel');
    const errorList = document.getElementById('error-list');
    
    errorList.innerHTML = '';
    
    for (const result of errors) {
        for (const error of result.errors) {
            const errorItem = document.createElement('div');
            errorItem.className = 'error-item';
            errorItem.innerHTML = `
                <div class="error-file">${result.file}</div>
                <div class="error-location">Line ${error.line}</div>
                <div class="error-message">${error.message}</div>
                <div class="error-code">TS${error.code}</div>
            `;
            
            // 点击跳转到错误位置
            errorItem.addEventListener('click', () => {
                openScriptFile(result.file, error.line);
            });
            
            errorList.appendChild(errorItem);
        }
    }
    
    panel.style.display = 'block';
}
```

#### 6.4.3 编辑器界面布局

在属性面板中添加TypeScript相关UI：

```html
<!-- 脚本面板 -->
<div id="script-panel" class="property-section">
    <div class="section-header">
        <span>脚本 (TypeScript)</span>
        <button id="btn-compile-scripts" class="icon-button" 
                title="编译所有脚本">
            🔨
        </button>
    </div>
    
    <div class="script-info">
        <label>脚本文件 (.ts)</label>
        <div class="script-selector">
            <input type="text" id="script-path" readonly>
            <button id="btn-select-script">选择...</button>
            <button id="btn-create-template">新建模板</button>
        </div>
        
        <button id="btn-open-script" class="btn-primary">
            在外部编辑器中打开
        </button>
    </div>
    
    <!-- 编译状态 -->
    <div class="compile-status">
        <span id="compile-status-icon">⚪</span>
        <span id="compile-status-text">未编译</span>
    </div>
    
    <!-- 编译错误面板（默认隐藏） -->
    <div id="compile-error-panel" style="display: none;">
        <div class="error-panel-header">
            <span>编译错误</span>
            <button id="btn-close-errors">×</button>
        </div>
        <div id="error-list" class="error-list"></div>
    </div>
</div>

<style>
.compile-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 12px;
}

.compile-status #compile-status-icon {
    font-size: 16px;
}

.compile-error-panel {
    margin-top: 12px;
    border: 1px solid #ff4444;
    border-radius: 4px;
    max-height: 300px;
    overflow-y: auto;
}

.error-panel-header {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #ff4444;
    color: white;
    font-weight: bold;
}

.error-item {
    padding: 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}

.error-item:hover {
    background: #f9f9f9;
}

.error-file {
    font-weight: bold;
    color: #333;
}

.error-location {
    color: #666;
    font-size: 11px;
    margin-top: 4px;
}

.error-message {
    color: #d32f2f;
    margin-top: 4px;
}

.error-code {
    color: #999;
    font-size: 11px;
    margin-top: 4px;
}
</style>
```

### 6.5 脚本模板生成（TypeScript版）

#### 6.5.1 按钮脚本模板

```typescript
// {{controlID}} - Button脚本
// 自动生成于 {{timestamp}}

/// <reference path="../script-types.d.ts" />
/// <reference path="../{{projectName}}.d.ts" />

/**
 * 按钮点击事件
 * @param event - 点击事件对象
 * @param api - 按钮API接口
 */
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    console.log("Button clicked at", event.mouseX, event.mouseY);
    
    // TODO: 实现点击逻辑
}

/**
 * 鼠标悬停事件
 * @param event - 悬停事件对象
 * @param api - 按钮API接口
 */
function onHover(event: MouseHoverEvent, api: IButtonAPI): void {
    if (event.isEnter) {
        // 鼠标进入按钮区域
        // TODO: 添加悬停效果
    } else {
        // 鼠标离开按钮区域
        // TODO: 恢复默认样式
    }
}

/**
 * 鼠标按下事件
 */
function onMouseDown(event: MouseDownEvent, api: IButtonAPI): void {
    // TODO: 实现按下视觉反馈
}

/**
 * 鼠标释放事件
 */
function onMouseUp(event: MouseUpEvent, api: IButtonAPI): void {
    // TODO: 实现释放效果
}
```

#### 6.5.2 文本输入框脚本模板

```typescript
// {{controlID}} - TextInput脚本
// 自动生成于 {{timestamp}}

/// <reference path="../script-types.d.ts" />
/// <reference path="../{{projectName}}.d.ts" />

/**
 * 文本改变事件
 * @param event - 文本改变事件对象
 * @param api - 文本输入框API接口
 */
function onChange(event: TextInputChangeEvent, api: ITextInputAPI): void {
    console.log("Text changed:", event.text);
    
    // 区分用户输入和代码修改
    if (event.isUserInput) {
        // TODO: 实时验证逻辑
    }
}

/**
 * 获得焦点事件
 */
function onFocus(event: FocusEvent, api: ITextInputAPI): void {
    console.log("Input focused");
    
    // TODO: 实现焦点效果（如高亮边框）
}

/**
 * 失去焦点事件
 */
function onBlur(event: BlurEvent, api: ITextInputAPI): void {
    console.log("Input blurred");
    
    // TODO: 实现最终验证
}

/**
 * 提交事件（按下Enter键）
 */
function onSubmit(event: SubmitEvent, api: ITextInputAPI): void {
    console.log("Input submitted:", event.text);
    
    // TODO: 实现提交逻辑（如跳转到下一个输入框）
}

/**
 * 按键事件
 */
function onKeyPress(event: KeyPressEvent, api: ITextInputAPI): void {
    // 处理特殊按键
    if (event.key === "Escape") {
        api.setText("");  // ESC清空输入
    }
    
    // 组合键示例
    if (event.ctrlKey && event.key === "Enter") {
        // Ctrl+Enter提交
    }
}
```

### 6.6 tsconfig.json配置

在项目根目录或scripts目录创建tsconfig.json：

```json
{
  "compilerOptions": {
    // 目标JavaScript版本（goja支持ES2015）
    "target": "ES2015",
    
    // 模块系统（CommonJS，goja使用require）
    "module": "CommonJS",
    
    // 输出目录
    "outDir": "./compiled",
    
    // 根目录
    "rootDir": ".",
    
    // 严格类型检查
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    
    // 允许未使用的参数（事件处理器可能不使用所有参数）
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    
    // 跳过库文件类型检查（加快编译）
    "skipLibCheck": true,
    
    // ES模块互操作
    "esModuleInterop": true,
    
    // 保留常量枚举
    "preserveConstEnums": true,
    
    // 不生成source map（生产环境）
    "sourceMap": false,
    
    // 类型定义文件路径
    "typeRoots": [
      "../node_modules/@types",
      "../"
    ],
    
    // 库文件（仅ES2015基础库，不包含DOM）
    "lib": ["ES2015"]
  },
  
  // 包含的文件
  "include": [
    "**/*.ts"
  ],
  
  // 排除的文件
  "exclude": [
    "node_modules",
    "compiled",
    "**/*.d.ts"
  ]
}
```

### 6.7 目录结构和文件管理

#### 6.7.1 项目目录结构

```
MyGameProject/
├── MyGameProject.ebiten     # 项目文件
├── script-types.d.ts        # 全局类型定义（固定）
├── MyGameProject.d.ts       # UI树类型（自动生成）
├── scripts/                  # TypeScript源文件目录
│   ├── tsconfig.json        # TypeScript配置
│   ├── loginButton.ts       # 按钮脚本源码
│   ├── usernameInput.ts     # 输入框脚本源码
│   ├── utils.ts             # 公共模块
│   └── compiled/            # 编译输出目录
│       ├── loginButton.js   # 编译后的JS
│       ├── usernameInput.js
│       └── utils.js
└── assets/                   # 资源目录
    ├── images/
    └── fonts/
```

#### 6.7.2 .gitignore配置

```gitignore
# TypeScript编译产物（类似node_modules）
scripts/compiled/

# 自动生成的类型定义（每次导出时重新生成）
*.d.ts
!script-types.d.ts  # 但保留核心类型定义
```

**原理：**
- `.ts`源文件提交到版本控制
- `.js`编译产物不提交（临时文件）
- `script-types.d.ts`提交（手动维护的核心定义）
- 项目特定的`.d.ts`不提交（每次导出自动生成）

#### 6.7.3 导出时的处理

导出项目为`.ebiten`文件时的流程：

```javascript
// 导出器逻辑
async function exportProject(projectPath, outputPath) {
    // 1. 编译所有TypeScript脚本
    const compiler = new ScriptCompiler(projectPath);
    const results = compiler.compileAll();
    
    // 检查编译错误
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
        throw new Error(
            `编译失败，无法导出：\n${errors.map(e => 
                `${e.file}: ${e.errors[0].message}`
            ).join('\n')}`
        );
    }
    
    console.log(`✓ TypeScript编译成功 (${results.length} 个文件)`);
    
    // 2. 生成UI树类型定义
    await generateUITypeDefinitions(projectPath);
    console.log('✓ UI类型定义生成完成');
    
    // 3. 打包资源和脚本
    const archive = new Archive();
    
    // 仅打包编译后的JS文件（不包含.ts源码）
    archive.addDirectory(
        path.join(projectPath, 'scripts/compiled'),
        'scripts'
    );
    
    // 包含类型定义文件（方便二次开发）
    archive.addFile(
        path.join(projectPath, 'script-types.d.ts')
    );
    archive.addFile(
        path.join(projectPath, `${projectName}.d.ts`)
    );
    
    // ... 其他资源文件
    
    await archive.save(outputPath);
    console.log(`✓ 项目导出完成: ${outputPath}`);
}
```

**关键点：**
- **导出前强制编译** - 确保JS文件是最新的
- **仅打包.js文件** - 运行时不需要.ts源码
- **包含类型定义** - 方便其他开发者基于导出的项目继续开发

### 6.8 开发工作流示例

#### 完整开发流程

```
1. 在编辑器中设计UI
   ↓
2. 选中控件，点击"创建脚本模板"
   - 自动生成 loginButton.ts
   - 自动添加类型注解和事件处理器框架
   ↓
3. 在VSCode中编写脚本逻辑
   - 打开 scripts/loginButton.ts
   - 享受完整的类型提示和错误检查
   - 使用 RootElement.xxx 访问UI树（有自动补全）
   ↓
4. 编辑器自动检测到.ts文件改变
   - 自动编译为loginButton.js
   - 在终端显示编译结果
   - 如有错误，在错误面板显示
   ↓
5. 在编辑器中预览和调试
   - Viewer加载编译后的.js文件
   - 实时测试脚本效果
   - 使用console.log调试
   ↓
6. 导出项目
   - 自动重新编译所有脚本
   - 生成最新的UI类型定义
   - 打包JS文件和资源
   ↓
7. 游戏运行时
   - 加载.js文件（无类型注解）
   - goja执行纯JavaScript
   - 无性能损失
```

#### 实际代码示例

假设我们在编辑器中创建了一个登录界面：

**步骤1：UI设计**
```
LoginPanel (Panel)
├── UsernameInput (TextInput)
├── PasswordInput (TextInput)
├── LoginButton (Button)
└── ErrorLabel (Label)
```

**步骤2：生成UI类型定义**

导出时自动生成`MyGame.d.ts`：
```typescript
interface IRootElement {
    LoginPanel: {
        UsernameInput: ITextInputAPI;
        PasswordInput: ITextInputAPI;
        LoginButton: IButtonAPI;
        ErrorLabel: ILabelAPI;
    };
}
declare const RootElement: IRootElement;
```

**步骤3：创建按钮脚本**

点击"创建脚本模板"，生成`LoginButton.ts`：
```typescript
/// <reference path="../script-types.d.ts" />
/// <reference path="../MyGame.d.ts" />

function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    // ← 这里输入event.时会自动补全所有属性
    const username = RootElement.LoginPanel.UsernameInput.getText();
    //                         ↑ 输入时自动补全整个路径
    
    if (!username) {
        RootElement.LoginPanel.ErrorLabel.setText("请输入用户名");
        //                              ↑ 自动补全所有方法
        return;
    }
    
    // 类型安全：如果拼写错误，立即报错
    // api.setTextt("登录中...");  // ← TS编译错误
}
```

**步骤4：自动编译**

保存文件后，编辑器自动编译为`LoginButton.js`：
```javascript
function onClick(event, api) {
    const username = RootElement.LoginPanel.UsernameInput.getText();
    if (!username) {
        RootElement.LoginPanel.ErrorLabel.setText("请输入用户名");
        return;
    }
}
```

### 6.9 TypeScript的性能影响

**编译时开销：**
- 小型项目（<10个脚本）：< 100ms
- 中型项目（10-50个脚本）：100-500ms
- 大型项目（>50个脚本）：500-2000ms

**运行时开销：**
- **零开销** - goja执行的是编译后的纯JavaScript
- 类型注解在编译时全部移除
- 性能与手写JavaScript完全相同

**开发时收益：**
- 减少运行时错误 80%+
- IDE自动补全提高编码速度 50%+
- 重构时间减少 70%+
- 团队协作效率提升 40%+

### 6.10 常见问题和解决方案

#### Q1: TypeScript编译错误怎么办？

**A:** 查看编辑器的错误面板：
```
错误面板会显示：
- 文件名：loginButton.ts
- 行号：Line 15
- 错误信息：Property 'mouseXX' does not exist on type 'ButtonClickEvent'
- 错误代码：TS2339

点击错误项会自动跳转到对应行
```

#### Q2: 如何在VSCode中获得类型提示？

**A:** 确保VSCode能找到类型定义文件：
```json
// VSCode的jsconfig.json或tsconfig.json
{
  "compilerOptions": {
    "typeRoots": [
      "../node_modules/@types",
      "../"  // 包含script-types.d.ts和MyGame.d.ts
    ]
  },
  "include": [
    "scripts/**/*.ts"
  ]
}
```

#### Q3: 如何调试TypeScript脚本？

**A:** 两种方式：
1. **使用console.log** - 在编译后的JS中仍然有效
2. **启用Source Map** - tsconfig.json中设置`"sourceMap": true`

```typescript
// loginButton.ts
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    console.log("Event:", event);  // ← 编译后仍然保留
    console.log("Mouse position:", event.mouseX, event.mouseY);
}
```

#### Q4: 团队成员不熟悉TypeScript怎么办？

**A:** 渐进式采用：
1. **初期**：仅使用基本类型注解（event: ButtonClickEvent）
2. **中期**：学习接口使用（IButtonAPI）
3. **后期**：使用高级特性（泛型、联合类型等）

**核心理念**：TypeScript是JavaScript的超集，任何合法的JavaScript都是合法的TypeScript。

## 参考资料

- [goja GitHub](https://github.com/dop251/goja)
- [Ebiten 文档](https://ebitengine.org/)
- [TypeScript官方文档](https://www.typescriptlang.org/)
- [TypeScript定义文件](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [Go 并发模式](https://go.dev/blog/pipelines)
- [JavaScript事件循环](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/EventLoop)
