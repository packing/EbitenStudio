# event.target 设计说明

## 概述

`event.target` 是事件对象中的一个属性，指向触发当前事件的控件API对象。这个设计参考了DOM的`event.target`，让脚本开发更加直观和灵活。

## 设计目标

1. **直接访问触发控件**：无需依赖RootElement路径或api参数
2. **多控件共享脚本**：通过`event.target.getID()`区分具体触发的控件
3. **类型安全**：TypeScript提供完整的类型提示
4. **API一致性**：event.target和api参数指向同一个对象

## TypeScript类型定义

### 基础事件类型

```typescript
// 所有事件都包含target属性
interface ButtonClickEvent {
    type: 'click';
    target: IButtonAPI;        // ← 触发事件的按钮对象
    mouseX: number;
    mouseY: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    clickCount: number;
}

interface TextInputChangeEvent {
    type: 'change';
    target: ITextInputAPI;     // ← 触发事件的输入框对象
    text: string;
    oldText: string;
    isUserInput: boolean;
}

interface MouseHoverEvent {
    type: 'hover';
    target: IWidgetAPI;        // ← 基础API（所有控件通用）
    mouseX: number;
    mouseY: number;
    isEnter: boolean;
}
```

### 控件API接口

```typescript
interface IWidgetAPI {
    // 基础信息
    getID(): string;
    getType(): string;
    
    // 通用方法
    setVisible(visible: boolean): void;
    setEnabled(enabled: boolean): void;
    setPosition(x: number, y: number): void;
    setSize(width: number, height: number): void;
    setColor(r: number, g: number, b: number, a: number): void;
}

interface IButtonAPI extends IWidgetAPI {
    setText(text: string): void;
    getText(): string;
    setFontSize(size: number): void;
}

interface ITextInputAPI extends IWidgetAPI {
    setText(text: string): void;
    getText(): string;
    setPlaceholder(text: string): void;
    setMaxLength(length: number): void;
    setFocus(): void;
    blur(): void;
}
```

## Go端实现

### 事件处理流程

```go
// 1. 主线程：分发事件到队列
func (button *ButtonWidget) HandleClick(mouseX, mouseY int) {
    if button.scriptEngine != nil {
        button.scriptEngine.eventQueue.Push(WidgetEvent{
            Type:     EventClick,
            WidgetID: button.ID,
            X:        mouseX,
            Y:        mouseY,
            Data: map[string]interface{}{
                "clickCount": button.clickCount,
                "ctrlKey":    ebiten.IsKeyPressed(ebiten.KeyControl),
                // ...
            },
            Widget: button,  // ← 传递控件对象
        })
    }
}

// 2. 脚本协程：处理事件
func (se *ScriptEngine) Run() {
    for {
        select {
        case event := <-se.eventQueue.ch:
            // 查找事件处理器
            handler, exists := se.GetEventHandler(event.WidgetID, "onClick")
            if exists {
                // 执行处理器（传入widget对象）
                se.executeHandler(handler, event, event.Widget)
            }
        }
    }
}

// 3. 执行处理器：构建event对象和target
func (se *ScriptEngine) executeHandler(handler goja.Callable, event WidgetEvent, widget Widget) {
    // 创建事件对象
    eventObj := se.vm.NewObject()
    eventObj.Set("type", string(event.Type))
    eventObj.Set("mouseX", event.X)
    eventObj.Set("mouseY", event.Y)
    // ...
    
    // 创建event.target API对象
    targetAPI := se.createWidgetAPI(widget)
    eventObj.Set("target", targetAPI)
    
    // 调用JavaScript处理器：handler(event, api)
    // 注意：api参数和event.target是同一个对象
    handler(goja.Undefined(), 
        se.vm.ToValue(eventObj), 
        se.vm.ToValue(targetAPI))
}
```

### createWidgetAPI实现

```go
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
    
    // 通用Getter（同步读取）
    apiObj.Set("getText", func() string {
        switch w := widget.(type) {
        case *ButtonWidget:
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
    
    // 通用Setter（异步命令）
    apiObj.Set("setText", func(text string) {
        se.commandQueue.Push(WidgetCommand{
            Type:     CommandSetProperty,
            WidgetID: widgetID,
            Property: "Text",
            Value:    text,
        })
    })
    
    apiObj.Set("setVisible", func(visible bool) {
        se.commandQueue.Push(WidgetCommand{
            Type:     CommandSetProperty,
            WidgetID: widgetID,
            Property: "Visible",
            Value:    visible,
        })
    })
    
    // 特定类型的专用方法
    switch widget.(type) {
    case *TextInputWidget:
        apiObj.Set("setFocus", func() {
            se.commandQueue.Push(WidgetCommand{
                Type:     CommandFocus,
                WidgetID: widgetID,
            })
        })
    
    case *SliderWidget:
        apiObj.Set("setValue", func(value float64) {
            se.commandQueue.Push(WidgetCommand{
                Type:     CommandSetProperty,
                WidgetID: widgetID,
                Property: "Value",
                Value:    value,
            })
        })
    }
    
    return apiObj
}
```

## JavaScript/TypeScript使用示例

### 1. 基本使用

```typescript
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    // event.target 和 api 是同一个对象
    console.log(event.target === api);  // true
    
    // 三种等价的写法：
    event.target.setText("Clicked!");   // 使用event.target
    api.setText("Clicked!");            // 使用api参数
    
    // 获取控件信息
    console.log("Button ID:", event.target.getID());
    console.log("Button type:", event.target.getType());
}
```

### 2. 多控件共享脚本

```typescript
// 多个按钮绑定同一个脚本
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    const buttonId = event.target.getID();
    const buttonText = event.target.getText();
    
    console.log(`Button ${buttonId} clicked: ${buttonText}`);
    
    // 根据ID执行不同逻辑
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
    
    setTimeout(() => {
        button.setText("保存");
        button.setEnabled(true);
    }, 1000);
}
```

### 3. 通用工具函数

```typescript
// 通用的点击反馈效果
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    applyClickFeedback(event.target);
    
    // 业务逻辑...
}

function applyClickFeedback(button: IButtonAPI): void {
    // 按下效果
    button.setColor(50, 110, 235, 255);
    
    // 100ms后恢复
    setTimeout(() => {
        button.setColor(70, 130, 255, 255);
    }, 100);
}

// 通用悬停效果
function onHover(event: MouseHoverEvent, api: IWidgetAPI): void {
    if (event.isEnter) {
        showTooltip(event.target, event.mouseX, event.mouseY);
    } else {
        hideTooltip();
    }
}

function showTooltip(widget: IWidgetAPI, x: number, y: number): void {
    const widgetId = widget.getID();
    const tooltip = getTooltipText(widgetId);
    
    if (tooltip) {
        RootElement.tooltipLabel.setText(tooltip);
        RootElement.tooltipLabel.setPosition(x + 10, y + 10);
        RootElement.tooltipLabel.setVisible(true);
    }
}
```

### 4. 动态控件列表

```typescript
// 商品列表，每个商品都有"添加购物车"按钮
// 所有按钮绑定同一个脚本

function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    const buttonId = event.target.getID();
    
    // 假设按钮ID格式为 "addToCart_productID_123"
    const parts = buttonId.split("_");
    if (parts.length >= 3 && parts[0] === "addToCart") {
        const productId = parts[2];
        addToCart(productId, event.target);
    }
}

function addToCart(productId: string, button: IButtonAPI): void {
    // 禁用按钮
    button.setText("添加中...");
    button.setEnabled(false);
    
    // 模拟添加到购物车
    setTimeout(() => {
        Global.cart = Global.cart || [];
        Global.cart.push(productId);
        
        // 更新按钮状态
        button.setText("已添加");
        button.setColor(50, 200, 50, 255);
        
        // 更新购物车图标
        updateCartBadge();
    }, 500);
}
```

## 实际应用场景

### 场景1：表单验证

```typescript
// usernameInput.ts
function onChange(event: TextInputChangeEvent, api: ITextInputAPI): void {
    const username = event.text;
    
    // 使用event.target验证
    if (username.length < 3) {
        showError(event.target, "用户名至少3个字符");
    } else {
        clearError(event.target);
    }
}

function showError(input: ITextInputAPI, message: string): void {
    // 输入框变红
    input.setColor(255, 100, 100, 255);
    
    // 显示错误提示（找到关联的error label）
    const inputId = input.getID();
    const errorLabel = RootElement[`${inputId}Error`];
    if (errorLabel) {
        errorLabel.setText(message);
        errorLabel.setVisible(true);
    }
}
```

### 场景2：工具栏按钮

```typescript
// toolbar.ts - 多个工具栏按钮共享

function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    const buttonId = event.target.getID();
    
    // 所有工具栏按钮都有通用的视觉反馈
    highlightButton(event.target);
    
    // 执行对应功能
    const actions: { [key: string]: () => void } = {
        "toolbarSave": () => performSave(),
        "toolbarUndo": () => performUndo(),
        "toolbarRedo": () => performRedo(),
        "toolbarExport": () => performExport()
    };
    
    const action = actions[buttonId];
    if (action) {
        action();
    }
}

function highlightButton(button: IButtonAPI): void {
    // 高亮效果
    button.setColor(255, 200, 0, 255);
    
    setTimeout(() => {
        button.setColor(70, 130, 255, 255);
    }, 200);
}
```

### 场景3：游戏UI（技能按钮）

```typescript
// 多个技能按钮共享脚本
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    const skillId = event.target.getID();
    
    // 检查技能冷却
    const cooldown = Global.skillCooldowns[skillId] || 0;
    if (cooldown > Date.now()) {
        shakButton(event.target);
        return;
    }
    
    // 施放技能
    castSkill(skillId, event.target);
}

function castSkill(skillId: string, button: IButtonAPI): void {
    // 触发技能效果（通过Global通知游戏逻辑）
    Global.castSkill(skillId);
    
    // 进入冷却
    button.setEnabled(false);
    button.setText("冷却中");
    
    // 5秒后恢复
    Global.skillCooldowns[skillId] = Date.now() + 5000;
    
    setTimeout(() => {
        button.setEnabled(true);
        button.setText("就绪");
    }, 5000);
}
```

## 设计优势

### 1. 灵活性

- **单控件脚本**：使用api参数，简单直接
- **多控件共享**：使用event.target.getID()区分
- **工具函数复用**：传递event.target给辅助函数

### 2. 类型安全

```typescript
// TypeScript会根据事件类型自动推断target类型
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    event.target.setText("OK");  // ✓ ButtonAPI有setText方法
    // event.target.setFocus();  // ✗ ButtonAPI没有setFocus方法（编译错误）
}

function onChange(event: TextInputChangeEvent, api: ITextInputAPI): void {
    event.target.setFocus();     // ✓ TextInputAPI有setFocus方法
}
```

### 3. 向后兼容

```typescript
// 旧代码：只使用api参数
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    api.setText("Clicked");
}

// 新代码：使用event.target
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    event.target.setText("Clicked");
}

// 两者完全等价，可以混用
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    console.log(event.target === api);  // true
}
```

## 性能考虑

### 对象创建开销

每次事件触发都会创建新的eventObj和targetAPI对象，但：

1. **goja对象创建很快**：~100ns级别
2. **事件频率可控**：通过节流避免过于频繁
3. **持久VM优势**：避免了重建Runtime的巨大开销（~100ms）

```go
// 性能对比（每次事件触发）
// 方案1：重建Runtime + 执行脚本: ~100ms
// 方案2：持久VM + 创建event对象: ~0.1ms（快1000倍）
```

### 优化措施

```go
// 可选：对象池复用
type APIObjectPool struct {
    pool sync.Pool
}

func (pool *APIObjectPool) Get(widget Widget) *goja.Object {
    obj := pool.pool.Get()
    if obj == nil {
        return se.createWidgetAPI(widget)
    }
    
    // 重置对象属性
    apiObj := obj.(*goja.Object)
    updateAPIObject(apiObj, widget)
    return apiObj
}

func (pool *APIObjectPool) Put(obj *goja.Object) {
    pool.pool.Put(obj)
}
```

## 总结

`event.target`设计提供了：

- ✅ **直观的API**：参考DOM标准，降低学习成本
- ✅ **类型安全**：TypeScript完整支持
- ✅ **灵活应用**：单控件和多控件场景都适用
- ✅ **性能优良**：持久VM + 轻量对象创建
- ✅ **向后兼容**：不影响现有api参数用法

这是现代UI框架的标准做法，完美适配EbitenStudio的脚本系统！
