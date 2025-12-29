package ui

import (
	"fmt"
	"os"
	"strings"
	"testing"
)

// TestGenerateExampleTypes 生成示例类型定义文件
func TestGenerateExampleTypes(t *testing.T) {
	// 创建生成器
	generator := NewTypeScriptGenerator()

	// 创建示例UI结构（登录界面）
	mainPanel := &MockWidget{id: "mainPanel", widgetType: TypePanel, parentID: "root"}
	loginPanel := &MockWidget{id: "loginPanel", widgetType: TypePanel, parentID: "mainPanel"}
	usernameLabel := &MockWidget{id: "usernameLabel", widgetType: TypeLabel, parentID: "loginPanel"}
	usernameInput := &MockWidget{id: "usernameInput", widgetType: TypeTextInput, parentID: "loginPanel"}
	passwordLabel := &MockWidget{id: "passwordLabel", widgetType: TypeLabel, parentID: "loginPanel"}
	passwordInput := &MockWidget{id: "passwordInput", widgetType: TypeTextInput, parentID: "loginPanel"}
	rememberCheckbox := &MockWidget{id: "rememberCheckbox", widgetType: TypeCheckBox, parentID: "loginPanel"}
	loginButton := &MockWidget{id: "loginButton", widgetType: TypeButton, parentID: "loginPanel"}
	resetButton := &MockWidget{id: "resetButton", widgetType: TypeButton, parentID: "loginPanel"}
	messageLabel := &MockWidget{id: "messageLabel", widgetType: TypeLabel, parentID: "root"}
	passwordStrength := &MockWidget{id: "passwordStrength", widgetType: TypeLabel, parentID: "root"}

	widgets := []Widget{
		mainPanel, loginPanel,
		usernameLabel, usernameInput,
		passwordLabel, passwordInput,
		rememberCheckbox,
		loginButton, resetButton,
		messageLabel, passwordStrength,
	}

	// 构建UI树
	uiTree := BuildUITree(widgets)

	// 生成类型定义
	typeDefinitions := generator.Generate(uiTree)

	// 写入文件
	outputPath := "../scripts_example/ui_types.d.ts"
	err := os.WriteFile(outputPath, []byte(typeDefinitions), 0644)
	if err != nil {
		t.Logf("Warning: Could not write to %s: %v", outputPath, err)
		// 不失败测试，只是警告
	} else {
		t.Logf("✅ Generated type definitions: %s", outputPath)
	}

	// 验证生成内容
	if len(typeDefinitions) == 0 {
		t.Error("Generated empty type definitions")
	}

	// 打印生成的内容（供查看）
	separator := strings.Repeat("=", 80)
	fmt.Println("\n" + separator)
	fmt.Println("Generated TypeScript Type Definitions")
	fmt.Println(separator)
	fmt.Println(typeDefinitions)
	fmt.Println(separator + "\n")
}
