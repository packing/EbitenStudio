package ui

import (
	"fmt"
	"os"
	"strings"
	"unicode"
)

// TypeScriptGenerator TypeScript类型定义生成器
type TypeScriptGenerator struct {
	widgetTypes []WidgetType    // 要生成的控件类型列表
	uiTree      *UITree         // UI树结构（用于生成RootElement）
	output      strings.Builder // 输出缓冲区
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
			TypeCheckBox,
			TypeRadioButton,
			TypeSlider,
			TypeComboBox,
			TypeTableView,
			TypeListView,
			TypeGridView,
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
func (g *TypeScriptGenerator) WriteToFile(filename string, uiTree *UITree) error {
	content := g.Generate(uiTree)
	return os.WriteFile(filename, []byte(content), 0644)
}

// writeLine 写入一行
func (g *TypeScriptGenerator) writeLine(line string) {
	g.output.WriteString(line)
	g.output.WriteString("\n")
}

// writeHeader 写入文件头部注释
func (g *TypeScriptGenerator) writeHeader() {
	g.writeLine("// Auto-generated TypeScript definitions for EbitenStudio UI")
	g.writeLine("// DO NOT EDIT MANUALLY")
	g.writeLine("// Generated at: " + getCurrentTime())
	g.writeLine("")
}

// getCurrentTime 获取当前时间字符串
func getCurrentTime() string {
	// 简单实现，返回固定格式
	return "2025-12-26 12:00:00"
}

// writeBaseTypes 写入基础类型
func (g *TypeScriptGenerator) writeBaseTypes() {
	g.writeLine("// ============ Base Types ============")
	g.writeLine("")

	// RGBA颜色类型
	g.writeLine("interface RGBA {")
	g.writeLine("    r: number;")
	g.writeLine("    g: number;")
	g.writeLine("    b: number;")
	g.writeLine("    a: number;")
	g.writeLine("}")
	g.writeLine("")

	// 矩形类型
	g.writeLine("interface Rectangle {")
	g.writeLine("    x: number;")
	g.writeLine("    y: number;")
	g.writeLine("    width: number;")
	g.writeLine("    height: number;")
	g.writeLine("}")
	g.writeLine("")

	// 基础Widget接口
	g.writeLine("/**")
	g.writeLine(" * Base interface for all UI widgets")
	g.writeLine(" */")
	g.writeLine("interface UIWidget {")
	g.writeLine("    readonly id: string;")
	g.writeLine("    readonly type: string;")
	g.writeLine("")
	g.writeLine("    // Tree navigation")
	g.writeLine("    getChildren(): UIWidget[];")
	g.writeLine("    getParent(): UIWidget | null;")
	g.writeLine("    findDescendant(id: string): UIWidget | null;")
	g.writeLine("")
	g.writeLine("    // Layout methods")
	g.writeLine("    setX(x: number): void;")
	g.writeLine("    setY(y: number): void;")
	g.writeLine("    setWidth(width: number): void;")
	g.writeLine("    setHeight(height: number): void;")
	g.writeLine("    setBounds(x: number, y: number, width: number, height: number): void;")
	g.writeLine("    getBounds(): Rectangle;")
	g.writeLine("")
	g.writeLine("    // Visibility")
	g.writeLine("    setVisible(visible: boolean): void;")
	g.writeLine("    isVisible(): boolean;")
	g.writeLine("")
	g.writeLine("    // Z-Index")
	g.writeLine("    setZIndex(z: number): void;")
	g.writeLine("    getZIndex(): number;")
	g.writeLine("")
	g.writeLine("    // Interaction")
	g.writeLine("    setInteractive(interactive: boolean): void;")
	g.writeLine("    isInteractive(): boolean;")
	g.writeLine("}")
	g.writeLine("")
}

// writeEventTypes 写入事件类型
func (g *TypeScriptGenerator) writeEventTypes() {
	g.writeLine("// ============ Event Types ============")
	g.writeLine("")

	// 基础事件接口
	g.writeLine("/**")
	g.writeLine(" * Base event interface")
	g.writeLine(" */")
	g.writeLine("interface BaseEvent {")
	g.writeLine("    type: string;")
	g.writeLine("    target: UIWidget;")
	g.writeLine("    timestamp: number;")
	g.writeLine("    data?: Record<string, any>;")
	g.writeLine("}")
	g.writeLine("")

	// 鼠标事件
	g.writeLine("/**")
	g.writeLine(" * Mouse event interface")
	g.writeLine(" */")
	g.writeLine("interface MouseEvent extends BaseEvent {")
	g.writeLine("    x: number;")
	g.writeLine("    y: number;")
	g.writeLine("    button: number;")
	g.writeLine("}")
	g.writeLine("")

	// 按钮点击事件
	g.writeLine("/**")
	g.writeLine(" * Button click event")
	g.writeLine(" */")
	g.writeLine("interface ButtonClickEvent extends MouseEvent {")
	g.writeLine("    type: 'click';")
	g.writeLine("    target: UIButton;")
	g.writeLine("}")
	g.writeLine("")

	// 文本改变事件
	g.writeLine("/**")
	g.writeLine(" * Text change event")
	g.writeLine(" */")
	g.writeLine("interface TextChangeEvent extends BaseEvent {")
	g.writeLine("    type: 'change';")
	g.writeLine("    target: UITextInput;")
	g.writeLine("}")
	g.writeLine("")

	// 键盘事件
	g.writeLine("/**")
	g.writeLine(" * Keyboard event")
	g.writeLine(" */")
	g.writeLine("interface KeyEvent extends BaseEvent {")
	g.writeLine("    key: string;")
	g.writeLine("    keyCode: number;")
	g.writeLine("}")
	g.writeLine("")

	// Hover事件
	g.writeLine("/**")
	g.writeLine(" * Hover event")
	g.writeLine(" */")
	g.writeLine("interface HoverEvent extends MouseEvent {")
	g.writeLine("    type: 'hover';")
	g.writeLine("}")
	g.writeLine("")
}

// writeWidgetTypes 生成所有控件类型
func (g *TypeScriptGenerator) writeWidgetTypes() {
	g.writeLine("// ============ Widget Types ============")
	g.writeLine("")

	for _, widgetType := range g.widgetTypes {
		g.writeWidgetInterface(widgetType)
	}
}

// writeWidgetInterface 为单个控件类型生成接口
func (g *TypeScriptGenerator) writeWidgetInterface(widgetType WidgetType) {
	typeName := g.getTypeScriptTypeName(widgetType)

	// 写入JSDoc注释
	g.writeLine("/**")
	g.writeLine(fmt.Sprintf(" * %s widget", widgetType))
	g.writeLine(" */")
	g.writeLine(fmt.Sprintf("interface %s extends UIWidget {", typeName))

	// 根据控件类型添加特定的方法
	methods := g.getWidgetMethods(widgetType)
	for _, method := range methods {
		g.writeLine(fmt.Sprintf("    %s;", method))
	}

	g.writeLine("}")
	g.writeLine("")
}

// getTypeScriptTypeName 获取TypeScript类型名称
func (g *TypeScriptGenerator) getTypeScriptTypeName(widgetType WidgetType) string {
	typeStr := string(widgetType)

	// 特殊映射
	typeMap := map[string]string{
		"button":      "UIButton",
		"label":       "UILabel",
		"textinput":   "UITextInput",
		"panel":       "UIPanel",
		"image":       "UIImage",
		"checkbox":    "UICheckBox",
		"radiobutton": "UIRadioButton",
		"slider":      "UISlider",
		"combobox":    "UIComboBox",
		"tableview":   "UITableView",
		"listview":    "UIListView",
		"gridview":    "UIGridView",
	}

	if mapped, ok := typeMap[typeStr]; ok {
		return mapped
	}

	// 默认转换：首字母大写并加UI前缀
	if len(typeStr) > 0 {
		runes := []rune(typeStr)
		runes[0] = unicode.ToUpper(runes[0])
		return "UI" + string(runes)
	}

	return "UIWidget"
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
			"getColor(): RGBA",
			"setFontSize(size: number): void",
			"getFontSize(): number",
		}

	case TypeTextInput:
		return []string{
			"setText(text: string): void",
			"getText(): string",
			"setPlaceholder(text: string): void",
			"getPlaceholder(): string",
			"focus(): void",
			"blur(): void",
			"selectAll(): void",
			"isFocused(): boolean",
		}

	case TypePanel:
		return []string{
			"addChild(widget: UIWidget): void",
			"removeChild(id: string): void",
			"clear(): void",
			"getChildCount(): number",
		}

	case TypeImage:
		return []string{
			"setImage(path: string): void",
			"getImagePath(): string",
			"setScale(scale: number): void",
			"getScale(): number",
		}

	case TypeCheckBox:
		return []string{
			"setChecked(checked: boolean): void",
			"isChecked(): boolean",
			"setLabel(text: string): void",
			"getLabel(): string",
		}

	case TypeRadioButton:
		return []string{
			"setSelected(selected: boolean): void",
			"isSelected(): boolean",
			"setLabel(text: string): void",
			"getLabel(): string",
			"setGroup(group: string): void",
			"getGroup(): string",
		}

	case TypeSlider:
		return []string{
			"setValue(value: number): void",
			"getValue(): number",
			"setMin(min: number): void",
			"getMin(): number",
			"setMax(max: number): void",
			"getMax(): number",
			"setStep(step: number): void",
			"getStep(): number",
		}

	case TypeComboBox:
		return []string{
			"addItem(text: string, value: any): void",
			"removeItem(index: number): void",
			"clearItems(): void",
			"setSelectedIndex(index: number): void",
			"getSelectedIndex(): number",
			"getSelectedValue(): any",
		}

	case TypeTableView:
		return []string{
			"setColumns(columns: string[]): void",
			"addRow(row: any[]): void",
			"removeRow(index: number): void",
			"clearRows(): void",
			"getRowCount(): number",
			"getSelectedRow(): number",
		}

	case TypeListView:
		return []string{
			"addItem(text: string): void",
			"removeItem(index: number): void",
			"clearItems(): void",
			"setSelectedIndex(index: number): void",
			"getSelectedIndex(): number",
			"getItemCount(): number",
		}

	case TypeGridView:
		return []string{
			"setColumns(columns: number): void",
			"getColumns(): number",
			"addItem(widget: UIWidget): void",
			"removeItem(index: number): void",
			"clearItems(): void",
			"getItemCount(): number",
		}

	default:
		return []string{}
	}
}

// writeGlobalAPIs 生成全局API类型
func (g *TypeScriptGenerator) writeGlobalAPIs() {
	g.writeLine("// ============ Global APIs ============")
	g.writeLine("")

	// Console API
	g.writeLine("/**")
	g.writeLine(" * Console API for logging")
	g.writeLine(" */")
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
	g.writeLine("/**")
	g.writeLine(" * Global API for timers and utilities")
	g.writeLine(" */")
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

// writeRootElementType 生成RootElement类型
func (g *TypeScriptGenerator) writeRootElementType() {
	g.writeLine("// ============ RootElement ============")
	g.writeLine("")

	// 生成嵌套的控件接口
	if g.uiTree != nil && g.uiTree.Root != nil {
		g.writeNodeInterface(g.uiTree.Root)
	}

	// 生成RootElement接口
	g.writeLine("/**")
	g.writeLine(" * Root element for accessing UI widgets")
	g.writeLine(" */")
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
