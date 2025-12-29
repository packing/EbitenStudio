# Phase 5: TypeScript类型定义生成器

## 概述

Phase 5 的目标是实现一个自动化的 TypeScript 类型定义生成器，为脚本系统提供完整的类型支持。这将使开发者在编写脚本时获得：

- **智能补全**：IDE 自动提示可用的属性和方法
- **类型检查**：编译时发现类型错误
- **文档提示**：查看方法签名和说明
- **重构支持**：安全地重命名和修改代码

## 设计目标

### 1. 自动生成控件类型

从 Go 的控件接口和类型自动生成对应的 TypeScript 接口定义。

```typescript
// 从 Go 的 WidgetType 生成
interface UIButton extends UIWidget {
    setText(text: string): void;
    getText(): string;
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    click(): void;
}
```

### 2. 动态生成 RootElement 类型

根据实际的 UI 树结构动态生成 RootElement 的类型定义。

```typescript
// 根据 UI 树生成
interface RootElement {
    getElementById(id: string): UIWidget | null;
    getByType(type: string): UIWidget[];
    
    // 动态属性（根据UI树结构）
    loginPanel: LoginPanel;
    messageLabel: UILabel;
}

interface LoginPanel extends UIPanel {
    usernameInput: UITextInput;
    passwordInput: UITextInput;
    loginButton: UIButton;
}
```

### 3. 生成全局 API 类型

为脚本引擎提供的全局对象生成类型定义。

```typescript
// Console API
interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
}

declare const console: Console;

// Global API
interface Global {
    setTimeout(callback: () => void, delay: number): number;
    clearTimeout(id: number): void;
    setInterval(callback: () => void, interval: number): number;
    clearInterval(id: number): void;
}

declare const Global: Global;
```

### 4. 生成事件类型

为不同的事件类型生成对应的接口定义。

```typescript
interface BaseEvent {
    type: string;
    target: UIWidget;
    timestamp: number;
}

interface ButtonClickEvent extends BaseEvent {
    type: 'click';
    target: UIButton;
    x: number;
    y: number;
    button: number;
}

interface TextChangeEvent extends BaseEvent {
    type: 'change';
    target: UITextInput;
    oldValue: string;
    newValue: string;
}
```

## 架构设计

### 组件结构

```
TypeScriptGenerator
├── WidgetTypeGenerator    - 控件类型生成器
├── EventTypeGenerator      - 事件类型生成器
├── GlobalAPIGenerator      - 全局API生成器
├── RootElementGenerator    - RootElement生成器
└── FileWriter             - 文件输出
```

### 数据流

```
Go Widget Definitions
        ↓
WidgetTypeGenerator → TypeScript Interfaces
        ↓
UI Tree Structure
        ↓
RootElementGenerator → Dynamic RootElement Type
        ↓
Combine All Types
        ↓
Output .d.ts File
```

## 实现方案

### 1. TypeScriptGenerator 核心类

```go
// TypeScriptGenerator TypeScript类型定义生成器
type TypeScriptGenerator struct {
    widgetTypes   []WidgetType        // 要生成的控件类型列表
    uiTree        *UITree             // UI树结构（用于生成RootElement）
    output        strings.Builder     // 输出缓冲区
}

// NewTypeScriptGenerator 创建生成器
func NewTypeScriptGenerator() *TypeScriptGenerator {
    return &TypeScriptGenerator{
        widgetTypes: []WidgetType{
            TypeButton,
            TypeLabel,
            TypeTextInput,
            TypePanel,
            TypeImage,
            TypeCheckbox,
            TypeRadioButton,
            TypeSlider,
            TypeComboBox,
        },
    }
}

// Generate 生成完整的类型定义
func (g *TypeScriptGenerator) Generate(uiTree *UITree) string {
    g.uiTree = uiTree
    g.output.Reset()
    
    g.writeHeader()
    g.writeBaseTypes()
    g.writeEventTypes()
    g.writeWidgetTypes()
    g.writeGlobalAPIs()
    g.writeRootElementType()
    
    return g.output.String()
}

// WriteToFile 将类型定义写入文件
func (g *TypeScriptGenerator) WriteToFile(filename string) error {
    content := g.Generate(g.uiTree)
    return os.WriteFile(filename, []byte(content), 0644)
}
```

### 2. 控件类型生成

```go
// writeWidgetTypes 生成所有控件类型
func (g *TypeScriptGenerator) writeWidgetTypes() {
    g.writeLine("// ============ Widget Types ============")
    g.writeLine("")
    
    // 基础Widget接口
    g.writeBaseWidgetInterface()
    
    // 为每个控件类型生成接口
    for _, widgetType := range g.widgetTypes {
        g.writeWidgetInterface(widgetType)
    }
}

// writeWidgetInterface 为单个控件类型生成接口
func (g *TypeScriptGenerator) writeWidgetInterface(widgetType WidgetType) {
    typeName := g.getTypeScriptTypeName(widgetType)
    
    g.writeLine(fmt.Sprintf("interface %s extends UIWidget {", typeName))
    
    // 根据控件类型添加特定的方法
    methods := g.getWidgetMethods(widgetType)
    for _, method := range methods {
        g.writeLine(fmt.Sprintf("    %s;", method))
    }
    
    g.writeLine("}")
    g.writeLine("")
}

// getWidgetMethods 获取控件的方法列表
func (g *TypeScriptGenerator) getWidgetMethods(widgetType WidgetType) []string {
    switch widgetType {
    case TypeButton:
        return []string{
            "setText(text: string): void",
            "getText(): string",
            "setEnabled(enabled: boolean): void",
            "isEnabled(): boolean",
            "click(): void",
        }
    case TypeLabel:
        return []string{
            "setText(text: string): void",
            "getText(): string",
            "setColor(r: number, g: number, b: number, a: number): void",
            "setFontSize(size: number): void",
        }
    case TypeTextInput:
        return []string{
            "setText(text: string): void",
            "getText(): string",
            "setPlaceholder(text: string): void",
            "focus(): void",
            "blur(): void",
            "selectAll(): void",
        }
    case TypePanel:
        return []string{
            "addChild(widget: UIWidget): void",
            "removeChild(id: string): void",
            "clear(): void",
        }
    // ... 其他控件类型
    default:
        return []string{}
    }
}
```

### 3. RootElement 类型生成

```go
// writeRootElementType 生成RootElement类型
func (g *TypeScriptGenerator) writeRootElementType() {
    g.writeLine("// ============ RootElement ============")
    g.writeLine("")
    
    // 生成嵌套的控件接口
    if g.uiTree != nil && g.uiTree.Root != nil {
        g.writeNodeInterface(g.uiTree.Root)
    }
    
    // 生成RootElement接口
    g.writeLine("interface RootElement {")
    g.writeLine("    getElementById(id: string): UIWidget | null;")
    g.writeLine("    getByType(type: string): UIWidget[];")
    g.writeLine("")
    
    // 添加顶层控件属性
    if g.uiTree != nil && g.uiTree.Root != nil {
        if g.uiTree.Root.ID == "root" && g.uiTree.Root.Widget == nil {
            // 虚拟根节点，添加所有子节点
            for _, child := range g.uiTree.Root.Children {
                g.writeNodeProperty(child, 1)
            }
        } else {
            // 实际根节点，添加根节点本身
            g.writeNodeProperty(g.uiTree.Root, 1)
        }
    }
    
    g.writeLine("}")
    g.writeLine("")
    g.writeLine("declare const RootElement: RootElement;")
    g.writeLine("")
}

// writeNodeInterface 为节点生成接口（如果有子节点）
func (g *TypeScriptGenerator) writeNodeInterface(node *UITreeNode) {
    if node == nil || len(node.Children) == 0 {
        return
    }
    
    // 先递归生成子节点接口
    for _, child := range node.Children {
        g.writeNodeInterface(child)
    }
    
    // 生成当前节点的接口
    if node.Widget != nil {
        interfaceName := g.getNodeInterfaceName(node)
        baseType := g.getTypeScriptTypeName(node.Widget.GetType())
        
        g.writeLine(fmt.Sprintf("interface %s extends %s {", interfaceName, baseType))
        
        // 添加子控件属性
        for _, child := range node.Children {
            g.writeNodeProperty(child, 1)
        }
        
        g.writeLine("}")
        g.writeLine("")
    }
}

// writeNodeProperty 写入节点属性
func (g *TypeScriptGenerator) writeNodeProperty(node *UITreeNode, indent int) {
    if node == nil || node.Widget == nil {
        return
    }
    
    indentStr := strings.Repeat("    ", indent)
    propertyName := node.ID
    
    var propertyType string
    if len(node.Children) > 0 {
        // 有子节点，使用自定义接口
        propertyType = g.getNodeInterfaceName(node)
    } else {
        // 无子节点，使用基础类型
        propertyType = g.getTypeScriptTypeName(node.Widget.GetType())
    }
    
    g.writeLine(fmt.Sprintf("%s%s: %s;", indentStr, propertyName, propertyType))
}

// getNodeInterfaceName 获取节点的接口名称
func (g *TypeScriptGenerator) getNodeInterfaceName(node *UITreeNode) string {
    // 首字母大写，生成Pascal命名
    if len(node.ID) == 0 {
        return "CustomWidget"
    }
    
    runes := []rune(node.ID)
    runes[0] = unicode.ToUpper(runes[0])
    return string(runes)
}
```

### 4. 全局 API 类型生成

```go
// writeGlobalAPIs 生成全局API类型
func (g *TypeScriptGenerator) writeGlobalAPIs() {
    g.writeLine("// ============ Global APIs ============")
    g.writeLine("")
    
    // Console API
    g.writeLine("interface Console {")
    g.writeLine("    log(...args: any[]): void;")
    g.writeLine("    error(...args: any[]): void;")
    g.writeLine("    warn(...args: any[]): void;")
    g.writeLine("    info(...args: any[]): void;")
    g.writeLine("}")
    g.writeLine("")
    g.writeLine("declare const console: Console;")
    g.writeLine("")
    
    // Global API
    g.writeLine("interface Global {")
    g.writeLine("    setTimeout(callback: () => void, delay: number): number;")
    g.writeLine("    clearTimeout(id: number): void;")
    g.writeLine("    setInterval(callback: () => void, interval: number): number;")
    g.writeLine("    clearInterval(id: number): void;")
    g.writeLine("}")
    g.writeLine("")
    g.writeLine("declare const Global: Global;")
    g.writeLine("")
}
```

### 5. 事件类型生成

```go
// writeEventTypes 生成事件类型
func (g *TypeScriptGenerator) writeEventTypes() {
    g.writeLine("// ============ Event Types ============")
    g.writeLine("")
    
    // 基础事件接口
    g.writeLine("interface BaseEvent {")
    g.writeLine("    type: string;")
    g.writeLine("    target: UIWidget;")
    g.writeLine("    timestamp: number;")
    g.writeLine("    data?: Record<string, any>;")
    g.writeLine("}")
    g.writeLine("")
    
    // 鼠标事件
    g.writeLine("interface MouseEvent extends BaseEvent {")
    g.writeLine("    x: number;")
    g.writeLine("    y: number;")
    g.writeLine("    button: number;")
    g.writeLine("}")
    g.writeLine("")
    
    // 点击事件
    g.writeLine("interface ButtonClickEvent extends MouseEvent {")
    g.writeLine("    type: 'click';")
    g.writeLine("    target: UIButton;")
    g.writeLine("}")
    g.writeLine("")
    
    // 文本改变事件
    g.writeLine("interface TextChangeEvent extends BaseEvent {")
    g.writeLine("    type: 'change';")
    g.writeLine("    target: UITextInput;")
    g.writeLine("}")
    g.writeLine("")
    
    // 键盘事件
    g.writeLine("interface KeyEvent extends BaseEvent {")
    g.writeLine("    key: string;")
    g.writeLine("    keyCode: number;")
    g.writeLine("}")
    g.writeLine("")
}
```

## 使用示例

### Go 代码中使用

```go
// 创建生成器
generator := NewTypeScriptGenerator()

// 设置UI树
widgets := []Widget{panel, button, input}
uiTree := BuildUITree(widgets)

// 生成类型定义
typeDef := generator.Generate(uiTree)

// 输出到文件
err := generator.WriteToFile("scripts/types.d.ts")
if err != nil {
    log.Fatal(err)
}
```

### 生成的类型定义示例

```typescript
// types.d.ts
// Auto-generated TypeScript definitions for EbitenStudio UI
// DO NOT EDIT MANUALLY

// ============ Base Types ============

interface UIWidget {
    id: string;
    type: string;
    getChildren(): UIWidget[];
    getParent(): UIWidget | null;
    findDescendant(id: string): UIWidget | null;
    
    // 布局方法
    setX(x: number): void;
    setY(y: number): void;
    setWidth(width: number): void;
    setHeight(height: number): void;
    
    // 可见性
    setVisible(visible: boolean): void;
    isVisible(): boolean;
}

// ============ Event Types ============

interface BaseEvent {
    type: string;
    target: UIWidget;
    timestamp: number;
    data?: Record<string, any>;
}

interface ButtonClickEvent extends BaseEvent {
    type: 'click';
    target: UIButton;
    x: number;
    y: number;
    button: number;
}

// ============ Widget Types ============

interface UIButton extends UIWidget {
    setText(text: string): void;
    getText(): string;
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    click(): void;
}

interface UILabel extends UIWidget {
    setText(text: string): void;
    getText(): string;
    setColor(r: number, g: number, b: number, a: number): void;
    setFontSize(size: number): void;
}

interface UITextInput extends UIWidget {
    setText(text: string): void;
    getText(): string;
    setPlaceholder(text: string): void;
    focus(): void;
    blur(): void;
    selectAll(): void;
}

interface UIPanel extends UIWidget {
    addChild(widget: UIWidget): void;
    removeChild(id: string): void;
    clear(): void;
}

// ============ Global APIs ============

interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
}

declare const console: Console;

interface Global {
    setTimeout(callback: () => void, delay: number): number;
    clearTimeout(id: number): void;
    setInterval(callback: () => void, interval: number): number;
    clearInterval(id: number): void;
}

declare const Global: Global;

// ============ RootElement ============

interface LoginPanel extends UIPanel {
    usernameInput: UITextInput;
    passwordInput: UITextInput;
    loginButton: UIButton;
}

interface RootElement {
    getElementById(id: string): UIWidget | null;
    getByType(type: string): UIWidget[];
    
    loginPanel: LoginPanel;
    messageLabel: UILabel;
    passwordStrength: UILabel;
}

declare const RootElement: RootElement;
```

## 高级特性

### 1. 命名空间支持

生成的类型支持命名空间模式：

```typescript
// 自动识别命名空间对象
interface LoginButton {
    onClick(self: UIButton, event: ButtonClickEvent): void;
    onHover(self: UIButton, event: MouseEvent): void;
}

const loginButton: LoginButton = {
    onClick(self, event) {
        // 自动类型推断
    }
};
```

### 2. 泛型支持

为列表和容器控件生成泛型类型：

```typescript
interface UIListView<T> extends UIWidget {
    setItems(items: T[]): void;
    getItems(): T[];
    getSelectedItem(): T | null;
}
```

### 3. 联合类型

为可能有多种返回值的方法生成联合类型：

```typescript
interface RootElement {
    getElementById(id: string): UIButton | UILabel | UITextInput | null;
    getByType(type: "button"): UIButton[];
    getByType(type: "label"): UILabel[];
    getByType(type: string): UIWidget[];
}
```

## 集成到构建流程

### 1. 监听 UI 变化

```go
// 在UI更新时自动重新生成类型
func (app *Application) OnUIChanged() {
    widgets := app.GetAllWidgets()
    uiTree := BuildUITree(widgets)
    
    generator := NewTypeScriptGenerator()
    generator.Generate(uiTree)
    generator.WriteToFile("scripts/types.d.ts")
    
    log.Println("TypeScript definitions updated")
}
```

### 2. 开发模式自动更新

```go
// 开发模式下监听UI文件变化
func watchUIFiles() {
    watcher, _ := fsnotify.NewWatcher()
    watcher.Add("ui/")
    
    for {
        select {
        case event := <-watcher.Events:
            if event.Op&fsnotify.Write == fsnotify.Write {
                regenerateTypes()
            }
        }
    }
}
```

## 测试策略

### 1. 单元测试

```go
func TestTypeScriptGenerator_BasicWidgets(t *testing.T) {
    generator := NewTypeScriptGenerator()
    
    // 创建简单UI
    button := &MockWidget{id: "btn1", widgetType: TypeButton}
    widgets := []Widget{button}
    uiTree := BuildUITree(widgets)
    
    // 生成类型
    output := generator.Generate(uiTree)
    
    // 验证输出
    assert.Contains(t, output, "interface UIButton")
    assert.Contains(t, output, "setText(text: string): void")
    assert.Contains(t, output, "declare const RootElement")
}
```

### 2. 集成测试

使用 TypeScript 编译器验证生成的类型定义：

```bash
# 运行TypeScript编译器检查类型
tsc --noEmit --strict types.d.ts
```

### 3. 端到端测试

```go
func TestE2E_TypeGeneration(t *testing.T) {
    // 1. 创建完整的UI树
    // 2. 生成类型定义
    // 3. 写入临时文件
    // 4. 使用tsc验证
    // 5. 编写测试脚本使用这些类型
    // 6. 验证脚本能正确执行
}
```

## 性能优化

### 1. 缓存机制

```go
type TypeScriptGenerator struct {
    // ... 其他字段 ...
    cache map[string]string // 缓存已生成的类型
}

func (g *TypeScriptGenerator) getWidgetInterface(widgetType WidgetType) string {
    key := string(widgetType)
    if cached, ok := g.cache[key]; ok {
        return cached
    }
    
    // 生成并缓存
    result := g.generateWidgetInterface(widgetType)
    g.cache[key] = result
    return result
}
```

### 2. 增量生成

只重新生成变化的部分：

```go
func (g *TypeScriptGenerator) IncrementalGenerate(changedNodes []*UITreeNode) string {
    // 只更新变化的节点接口
    for _, node := range changedNodes {
        g.regenerateNodeInterface(node)
    }
    return g.output.String()
}
```

## 错误处理

### 1. 无效控件类型

```go
func (g *TypeScriptGenerator) writeWidgetInterface(widgetType WidgetType) error {
    if !g.isValidWidgetType(widgetType) {
        return fmt.Errorf("unsupported widget type: %s", widgetType)
    }
    // ... 生成代码
}
```

### 2. ID 冲突检测

```go
func (g *TypeScriptGenerator) checkIDConflicts(uiTree *UITree) error {
    seen := make(map[string]bool)
    
    for id := range uiTree.IDMap {
        if seen[id] {
            return fmt.Errorf("duplicate widget ID: %s", id)
        }
        seen[id] = true
    }
    
    return nil
}
```

## 文档生成

为生成的类型添加 JSDoc 注释：

```go
func (g *TypeScriptGenerator) writeWidgetInterfaceWithDocs(widgetType WidgetType) {
    g.writeLine("/**")
    g.writeLine(fmt.Sprintf(" * %s widget interface", widgetType))
    g.writeLine(" * @description Represents a button UI component")
    g.writeLine(" */")
    g.writeLine(fmt.Sprintf("interface %s extends UIWidget {", g.getTypeScriptTypeName(widgetType)))
    // ...
}
```

生成的带文档的接口：

```typescript
/**
 * Button widget interface
 * @description Represents a button UI component
 */
interface UIButton extends UIWidget {
    /**
     * Set the button text
     * @param text - The text to display
     */
    setText(text: string): void;
    
    /**
     * Get the button text
     * @returns The current text
     */
    getText(): string;
}
```

## 未来扩展

### 1. 支持更多类型系统特性

- 条件类型
- 映射类型
- 工具类型（Partial, Required, Pick等）

### 2. 自定义类型映射

允许用户自定义 Go 类型到 TypeScript 类型的映射。

### 3. 类型验证工具

提供运行时类型验证，确保 JavaScript 对象符合生成的类型。

### 4. IDE 插件

开发 VS Code 插件，实时更新类型定义。

## 总结

Phase 5 的 TypeScript 类型生成器将为脚本系统提供完整的类型支持，显著提升开发体验：

✅ 自动生成控件类型  
✅ 动态生成 RootElement 类型  
✅ 完整的事件类型  
✅ 全局 API 类型  
✅ 支持嵌套结构  
✅ 缓存和性能优化  
✅ 文档生成  

这将使脚本编写更加安全、高效和愉悦！
