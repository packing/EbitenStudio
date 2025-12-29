package ui

import (
	"os"
	"strings"
	"testing"
)

// TestTypeScriptGenerator_Create 测试生成器创建
func TestTypeScriptGenerator_Create(t *testing.T) {
	generator := NewTypeScriptGenerator()

	if generator == nil {
		t.Fatal("Failed to create generator")
	}

	if len(generator.widgetTypes) == 0 {
		t.Error("No widget types registered")
	}
}

// TestTypeScriptGenerator_BasicGeneration 测试基础生成
func TestTypeScriptGenerator_BasicGeneration(t *testing.T) {
	generator := NewTypeScriptGenerator()

	// 创建简单UI树
	button := &MockWidget{id: "btn1", widgetType: TypeButton, parentID: "root"}
	widgets := []Widget{button}
	uiTree := BuildUITree(widgets)

	// 生成类型定义
	output := generator.Generate(uiTree)

	// 验证输出包含必要内容
	if !strings.Contains(output, "Auto-generated TypeScript definitions") {
		t.Error("Missing header comment")
	}

	if !strings.Contains(output, "interface UIButton") {
		t.Error("Missing UIButton interface")
	}

	if !strings.Contains(output, "interface RootElement") {
		t.Error("Missing RootElement interface")
	}

	if !strings.Contains(output, "declare const console") {
		t.Error("Missing console declaration")
	}
}

// TestTypeScriptGenerator_WidgetTypes 测试控件类型生成
func TestTypeScriptGenerator_WidgetTypes(t *testing.T) {
	generator := NewTypeScriptGenerator()

	button := &MockWidget{id: "btn", widgetType: TypeButton, parentID: "root"}
	label := &MockWidget{id: "lbl", widgetType: TypeLabel, parentID: "root"}
	input := &MockWidget{id: "inp", widgetType: TypeTextInput, parentID: "root"}

	widgets := []Widget{button, label, input}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证所有控件类型
	expectedTypes := []string{
		"interface UIButton",
		"interface UILabel",
		"interface UITextInput",
		"interface UIPanel",
	}

	for _, expected := range expectedTypes {
		if !strings.Contains(output, expected) {
			t.Errorf("Missing type: %s", expected)
		}
	}
}

// TestTypeScriptGenerator_ButtonMethods 测试Button方法生成
func TestTypeScriptGenerator_ButtonMethods(t *testing.T) {
	generator := NewTypeScriptGenerator()

	button := &MockWidget{id: "btn", widgetType: TypeButton, parentID: "root"}
	widgets := []Widget{button}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证Button方法
	expectedMethods := []string{
		"setText(text: string): void",
		"getText(): string",
		"setEnabled(enabled: boolean): void",
		"isEnabled(): boolean",
		"click(): void",
	}

	for _, method := range expectedMethods {
		if !strings.Contains(output, method) {
			t.Errorf("Missing Button method: %s", method)
		}
	}
}

// TestTypeScriptGenerator_NestedStructure 测试嵌套结构
func TestTypeScriptGenerator_NestedStructure(t *testing.T) {
	generator := NewTypeScriptGenerator()

	// 创建嵌套结构
	panel := &MockWidget{id: "loginPanel", widgetType: TypePanel, parentID: "root"}
	button := &MockWidget{id: "loginButton", widgetType: TypeButton, parentID: "loginPanel"}
	input := &MockWidget{id: "usernameInput", widgetType: TypeTextInput, parentID: "loginPanel"}

	widgets := []Widget{panel, button, input}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证嵌套接口生成
	if !strings.Contains(output, "interface LoginPanel extends UIPanel") {
		t.Error("Missing nested interface LoginPanel")
	}

	if !strings.Contains(output, "loginButton: UIButton") {
		t.Error("Missing loginButton property")
	}

	if !strings.Contains(output, "usernameInput: UITextInput") {
		t.Error("Missing usernameInput property")
	}
}

// TestTypeScriptGenerator_RootElement 测试RootElement生成
func TestTypeScriptGenerator_RootElement(t *testing.T) {
	generator := NewTypeScriptGenerator()

	panel := &MockWidget{id: "mainPanel", widgetType: TypePanel, parentID: "root"}
	button := &MockWidget{id: "btn1", widgetType: TypeButton, parentID: "mainPanel"}

	widgets := []Widget{panel, button}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证RootElement内容
	if !strings.Contains(output, "interface RootElement") {
		t.Error("Missing RootElement interface")
	}

	if !strings.Contains(output, "getElementById(id: string)") {
		t.Error("Missing getElementById method")
	}

	if !strings.Contains(output, "getByType(type: string)") {
		t.Error("Missing getByType method")
	}

	if !strings.Contains(output, "mainPanel:") {
		t.Error("Missing mainPanel property in RootElement")
	}

	if !strings.Contains(output, "declare const RootElement") {
		t.Error("Missing RootElement declaration")
	}
}

// TestTypeScriptGenerator_EventTypes 测试事件类型生成
func TestTypeScriptGenerator_EventTypes(t *testing.T) {
	generator := NewTypeScriptGenerator()

	button := &MockWidget{id: "btn", widgetType: TypeButton, parentID: "root"}
	widgets := []Widget{button}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证事件类型
	expectedEvents := []string{
		"interface BaseEvent",
		"interface MouseEvent",
		"interface ButtonClickEvent",
		"interface TextChangeEvent",
		"interface KeyEvent",
	}

	for _, event := range expectedEvents {
		if !strings.Contains(output, event) {
			t.Errorf("Missing event type: %s", event)
		}
	}
}

// TestTypeScriptGenerator_GlobalAPIs 测试全局API生成
func TestTypeScriptGenerator_GlobalAPIs(t *testing.T) {
	generator := NewTypeScriptGenerator()

	button := &MockWidget{id: "btn", widgetType: TypeButton, parentID: "root"}
	widgets := []Widget{button}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证Console API
	if !strings.Contains(output, "interface Console") {
		t.Error("Missing Console interface")
	}
	if !strings.Contains(output, "log(...args: any[]): void") {
		t.Error("Missing console.log method")
	}
	if !strings.Contains(output, "declare const console: Console") {
		t.Error("Missing console declaration")
	}

	// 验证Global API
	if !strings.Contains(output, "interface Global") {
		t.Error("Missing Global interface")
	}
	if !strings.Contains(output, "setTimeout(callback: () => void, delay: number)") {
		t.Error("Missing setTimeout method")
	}
	if !strings.Contains(output, "declare const Global: Global") {
		t.Error("Missing Global declaration")
	}
}

// TestTypeScriptGenerator_WriteToFile 测试文件输出
func TestTypeScriptGenerator_WriteToFile(t *testing.T) {
	generator := NewTypeScriptGenerator()

	button := &MockWidget{id: "btn", widgetType: TypeButton, parentID: "root"}
	widgets := []Widget{button}
	uiTree := BuildUITree(widgets)

	// 写入临时文件
	tmpFile := "test_types.d.ts"
	defer os.Remove(tmpFile)

	err := generator.WriteToFile(tmpFile, uiTree)
	if err != nil {
		t.Fatalf("Failed to write file: %v", err)
	}

	// 读取文件验证
	content, err := os.ReadFile(tmpFile)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	contentStr := string(content)
	if !strings.Contains(contentStr, "interface UIButton") {
		t.Error("File content is incorrect")
	}
}

// TestTypeScriptGenerator_MultipleRoots 测试多个顶层节点
func TestTypeScriptGenerator_MultipleRoots(t *testing.T) {
	generator := NewTypeScriptGenerator()

	panel1 := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	panel2 := &MockWidget{id: "panel2", widgetType: TypePanel, parentID: "root"}
	label := &MockWidget{id: "label1", widgetType: TypeLabel, parentID: "root"}

	widgets := []Widget{panel1, panel2, label}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证所有顶层节点都在RootElement中
	if !strings.Contains(output, "panel1: UIPanel") {
		t.Error("Missing panel1 in RootElement")
	}
	if !strings.Contains(output, "panel2: UIPanel") {
		t.Error("Missing panel2 in RootElement")
	}
	if !strings.Contains(output, "label1: UILabel") {
		t.Error("Missing label1 in RootElement")
	}
}

// TestTypeScriptGenerator_DeepNesting 测试深层嵌套
func TestTypeScriptGenerator_DeepNesting(t *testing.T) {
	generator := NewTypeScriptGenerator()

	// 创建深层嵌套结构
	mainPanel := &MockWidget{id: "mainPanel", widgetType: TypePanel, parentID: "root"}
	subPanel := &MockWidget{id: "subPanel", widgetType: TypePanel, parentID: "mainPanel"}
	button := &MockWidget{id: "deepButton", widgetType: TypeButton, parentID: "subPanel"}

	widgets := []Widget{mainPanel, subPanel, button}
	uiTree := BuildUITree(widgets)

	output := generator.Generate(uiTree)

	// 验证深层嵌套接口
	if !strings.Contains(output, "interface SubPanel extends UIPanel") {
		t.Error("Missing SubPanel interface")
	}
	if !strings.Contains(output, "deepButton: UIButton") {
		t.Error("Missing deepButton in SubPanel")
	}
	if !strings.Contains(output, "interface MainPanel extends UIPanel") {
		t.Error("Missing MainPanel interface")
	}
	if !strings.Contains(output, "subPanel: SubPanel") {
		t.Error("Missing subPanel in MainPanel")
	}
}

// TestTypeScriptGenerator_TypeNameConversion 测试类型名转换
func TestTypeScriptGenerator_TypeNameConversion(t *testing.T) {
	generator := NewTypeScriptGenerator()

	tests := []struct {
		widgetType WidgetType
		expected   string
	}{
		{TypeButton, "UIButton"},
		{TypeLabel, "UILabel"},
		{TypeTextInput, "UITextInput"},
		{TypePanel, "UIPanel"},
		{TypeCheckBox, "UICheckBox"},
	}

	for _, test := range tests {
		result := generator.getTypeScriptTypeName(test.widgetType)
		if result != test.expected {
			t.Errorf("Type name conversion failed: %s -> %s (expected %s)",
				test.widgetType, result, test.expected)
		}
	}
}

// TestTypeScriptGenerator_EmptyTree 测试空树
func TestTypeScriptGenerator_EmptyTree(t *testing.T) {
	generator := NewTypeScriptGenerator()

	// 空树
	var uiTree *UITree

	output := generator.Generate(uiTree)

	// 应该仍然生成基础类型和全局API
	if !strings.Contains(output, "interface UIWidget") {
		t.Error("Missing UIWidget interface")
	}
	if !strings.Contains(output, "interface Console") {
		t.Error("Missing Console interface")
	}
	if !strings.Contains(output, "interface RootElement") {
		t.Error("Missing RootElement interface")
	}
}

// TestTypeScriptGenerator_AllWidgetTypes 测试所有控件类型
func TestTypeScriptGenerator_AllWidgetTypes(t *testing.T) {
	generator := NewTypeScriptGenerator()

	// 创建所有类型的控件
	widgets := []Widget{
		&MockWidget{id: "btn", widgetType: TypeButton, parentID: "root"},
		&MockWidget{id: "lbl", widgetType: TypeLabel, parentID: "root"},
		&MockWidget{id: "inp", widgetType: TypeTextInput, parentID: "root"},
		&MockWidget{id: "pnl", widgetType: TypePanel, parentID: "root"},
		&MockWidget{id: "img", widgetType: TypeImage, parentID: "root"},
		&MockWidget{id: "chk", widgetType: TypeCheckBox, parentID: "root"},
		&MockWidget{id: "rdo", widgetType: TypeRadioButton, parentID: "root"},
		&MockWidget{id: "sld", widgetType: TypeSlider, parentID: "root"},
		&MockWidget{id: "cmb", widgetType: TypeComboBox, parentID: "root"},
	}

	uiTree := BuildUITree(widgets)
	output := generator.Generate(uiTree)

	// 验证所有类型都被生成
	expectedTypes := []string{
		"UIButton", "UILabel", "UITextInput", "UIPanel",
		"UIImage", "UICheckBox", "UIRadioButton", "UISlider", "UIComboBox",
	}

	for _, typeName := range expectedTypes {
		if !strings.Contains(output, "interface "+typeName) {
			t.Errorf("Missing widget type: %s", typeName)
		}
	}
}
