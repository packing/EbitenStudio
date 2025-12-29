package main

import (
	"fmt"
	"log"

	"github.com/packing/EbitenStudio/ui"
)

// 这个程序演示如何使用TypeScriptGenerator生成类型定义
func main() {
	fmt.Println("TypeScript Type Generator Example")
	fmt.Println("==================================")
	fmt.Println()

	// 创建生成器
	generator := ui.NewTypeScriptGenerator()

	// 创建示例UI结构（模拟登录界面）
	widgets := createLoginUI()

	// 构建UI树
	uiTree := ui.BuildUITree(widgets)

	fmt.Printf("UI Tree created with %d widgets\n", len(widgets))
	fmt.Println()

	// 生成类型定义
	typeDefinitions := generator.Generate(uiTree)

	// 输出到控制台
	fmt.Println("Generated TypeScript Definitions:")
	fmt.Println("==================================")
	fmt.Println(typeDefinitions)

	// 写入文件
	filename := "scripts_example/ui_types.d.ts"
	err := generator.WriteToFile(filename, uiTree)
	if err != nil {
		log.Fatalf("Failed to write file: %v", err)
	}

	fmt.Printf("\n✅ Type definitions written to: %s\n", filename)
}

// createLoginUI 创建登录界面的UI结构
func createLoginUI() []ui.Widget {
	// 创建主面板
	mainPanel := &MockWidget{
		id:         "mainPanel",
		widgetType: ui.TypePanel,
		parentID:   "root",
	}

	// 创建登录面板
	loginPanel := &MockWidget{
		id:         "loginPanel",
		widgetType: ui.TypePanel,
		parentID:   "mainPanel",
	}

	// 用户名标签
	usernameLabel := &MockWidget{
		id:         "usernameLabel",
		widgetType: ui.TypeLabel,
		parentID:   "loginPanel",
	}

	// 用户名输入框
	usernameInput := &MockWidget{
		id:         "usernameInput",
		widgetType: ui.TypeTextInput,
		parentID:   "loginPanel",
	}

	// 密码标签
	passwordLabel := &MockWidget{
		id:         "passwordLabel",
		widgetType: ui.TypeLabel,
		parentID:   "loginPanel",
	}

	// 密码输入框
	passwordInput := &MockWidget{
		id:         "passwordInput",
		widgetType: ui.TypeTextInput,
		parentID:   "loginPanel",
	}

	// 记住我复选框
	rememberCheckbox := &MockWidget{
		id:         "rememberCheckbox",
		widgetType: ui.TypeCheckBox,
		parentID:   "loginPanel",
	}

	// 登录按钮
	loginButton := &MockWidget{
		id:         "loginButton",
		widgetType: ui.TypeButton,
		parentID:   "loginPanel",
	}

	// 重置按钮
	resetButton := &MockWidget{
		id:         "resetButton",
		widgetType: ui.TypeButton,
		parentID:   "loginPanel",
	}

	// 消息标签（顶层）
	messageLabel := &MockWidget{
		id:         "messageLabel",
		widgetType: ui.TypeLabel,
		parentID:   "root",
	}

	// 密码强度指示器（顶层）
	passwordStrength := &MockWidget{
		id:         "passwordStrength",
		widgetType: ui.TypeLabel,
		parentID:   "root",
	}

	return []ui.Widget{
		mainPanel,
		loginPanel,
		usernameLabel,
		usernameInput,
		passwordLabel,
		passwordInput,
		rememberCheckbox,
		loginButton,
		resetButton,
		messageLabel,
		passwordStrength,
	}
}

// MockWidget 模拟控件（用于演示）
type MockWidget struct {
	id         string
	widgetType ui.WidgetType
	parentID   string
	children   []ui.Widget
}

func (m *MockWidget) GetID() string                                                           { return m.id }
func (m *MockWidget) GetType() ui.WidgetType                                                  { return m.widgetType }
func (m *MockWidget) GetParentID() string                                                     { return m.parentID }
func (m *MockWidget) GetChildren() []ui.Widget                                                { return m.children }
func (m *MockWidget) AddChild(child ui.Widget)                                                { m.children = append(m.children, child) }
func (m *MockWidget) RemoveChild(id string)                                                   {}
func (m *MockWidget) GetBounds() ui.Rectangle                                                 { return ui.Rectangle{} }
func (m *MockWidget) SetBounds(rect ui.Rectangle)                                             {}
func (m *MockWidget) GetX() int                                                               { return 0 }
func (m *MockWidget) GetY() int                                                               { return 0 }
func (m *MockWidget) GetWidth() int                                                           { return 100 }
func (m *MockWidget) GetHeight() int                                                          { return 100 }
func (m *MockWidget) GetZIndex() int                                                          { return 0 }
func (m *MockWidget) SetZIndex(z int)                                                         {}
func (m *MockWidget) IsVisible() bool                                                         { return true }
func (m *MockWidget) SetVisible(visible bool)                                                 {}
func (m *MockWidget) IsInteractive() bool                                                     { return true }
func (m *MockWidget) SetInteractive(interactive bool)                                         {}
func (m *MockWidget) GetPadding() ui.Spacing                                                  { return ui.Spacing{} }
func (m *MockWidget) GetMargin() ui.Spacing                                                   { return ui.Spacing{} }
func (m *MockWidget) GetBackgroundColor() ui.RGBA                                             { return ui.RGBA{} }
func (m *MockWidget) GetBackgroundImage() *ui.Image                                           { return nil }
func (m *MockWidget) GetBorderWidth() int                                                     { return 0 }
func (m *MockWidget) GetBorderColor() ui.RGBA                                                 { return ui.RGBA{} }
func (m *MockWidget) GetBorderRadius() int                                                    { return 0 }
func (m *MockWidget) GetOpacity() int                                                         { return 100 }
func (m *MockWidget) Update() error                                                           { return nil }
func (m *MockWidget) Draw(screen *ui.Screen, parentX, parentY, parentWidth, parentHeight int) {}
func (m *MockWidget) OnClick(x, y int) bool                                                   { return false }
func (m *MockWidget) OnHover(x, y int) bool                                                   { return false }
