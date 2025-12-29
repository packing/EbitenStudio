package ui

import (
	"image"
	"testing"

	"github.com/hajimehoshi/ebiten/v2"
)

// MockWidget 测试用的模拟控件
type MockWidget struct {
	id         string
	widgetType WidgetType
	parentID   string
	children   []Widget
}

func (m *MockWidget) GetID() string                                                              { return m.id }
func (m *MockWidget) GetType() WidgetType                                                        { return m.widgetType }
func (m *MockWidget) GetParentID() string                                                        { return m.parentID }
func (m *MockWidget) GetChildren() []Widget                                                      { return m.children }
func (m *MockWidget) AddChild(child Widget)                                                      { m.children = append(m.children, child) }
func (m *MockWidget) RemoveChild(id string)                                                      {}
func (m *MockWidget) GetBounds() image.Rectangle                                                 { return image.Rectangle{} }
func (m *MockWidget) SetBounds(rect image.Rectangle)                                             {}
func (m *MockWidget) GetX() int                                                                  { return 0 }
func (m *MockWidget) GetY() int                                                                  { return 0 }
func (m *MockWidget) GetWidth() int                                                              { return 100 }
func (m *MockWidget) GetHeight() int                                                             { return 100 }
func (m *MockWidget) GetZIndex() int                                                             { return 0 }
func (m *MockWidget) SetZIndex(z int)                                                            {}
func (m *MockWidget) IsVisible() bool                                                            { return true }
func (m *MockWidget) SetVisible(visible bool)                                                    {}
func (m *MockWidget) IsInteractive() bool                                                        { return true }
func (m *MockWidget) SetInteractive(interactive bool)                                            {}
func (m *MockWidget) GetPadding() Spacing                                                        { return Spacing{} }
func (m *MockWidget) GetMargin() Spacing                                                         { return Spacing{} }
func (m *MockWidget) GetBackgroundColor() RGBA                                                   { return RGBA{} }
func (m *MockWidget) GetBackgroundImage() *ebiten.Image                                          { return nil }
func (m *MockWidget) GetBorderWidth() int                                                        { return 0 }
func (m *MockWidget) GetBorderColor() RGBA                                                       { return RGBA{} }
func (m *MockWidget) GetBorderRadius() int                                                       { return 0 }
func (m *MockWidget) GetOpacity() int                                                            { return 100 }
func (m *MockWidget) Update() error                                                              { return nil }
func (m *MockWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {}
func (m *MockWidget) OnClick(x, y int) bool                                                      { return false }
func (m *MockWidget) OnHover(x, y int) bool                                                      { return false }

// TestUITree_BuildSingleRoot 测试单个根节点
func TestUITree_BuildSingleRoot(t *testing.T) {
	// 创建简单的控件树
	root := &MockWidget{id: "root1", widgetType: TypePanel, parentID: "root"}

	widgets := []Widget{root}
	tree := BuildUITree(widgets)

	if tree.Root == nil {
		t.Fatal("Root is nil")
	}

	if tree.Root.ID != "root1" {
		t.Errorf("Expected root ID 'root1', got '%s'", tree.Root.ID)
	}

	if len(tree.IDMap) != 1 {
		t.Errorf("Expected 1 node in IDMap, got %d", len(tree.IDMap))
	}
}

// TestUITree_BuildMultipleRoots 测试多个顶层节点
func TestUITree_BuildMultipleRoots(t *testing.T) {
	panel1 := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	panel2 := &MockWidget{id: "panel2", widgetType: TypePanel, parentID: "root"}

	widgets := []Widget{panel1, panel2}
	tree := BuildUITree(widgets)

	if tree.Root == nil {
		t.Fatal("Root is nil")
	}

	// 应该有虚拟根节点
	if tree.Root.ID != "root" {
		t.Errorf("Expected virtual root ID 'root', got '%s'", tree.Root.ID)
	}

	if len(tree.Root.Children) != 2 {
		t.Errorf("Expected 2 root children, got %d", len(tree.Root.Children))
	}
}

// TestUITree_BuildNestedStructure 测试嵌套结构
func TestUITree_BuildNestedStructure(t *testing.T) {
	// 创建嵌套的控件树
	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	button1 := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "panel1"}
	button2 := &MockWidget{id: "button2", widgetType: TypeButton, parentID: "panel1"}
	label := &MockWidget{id: "label1", widgetType: TypeLabel, parentID: "root"}

	widgets := []Widget{panel, button1, button2, label}
	tree := BuildUITree(widgets)

	// 验证根节点
	if tree.Root == nil {
		t.Fatal("Root is nil")
	}

	if len(tree.Root.Children) != 2 {
		t.Errorf("Expected 2 root children, got %d", len(tree.Root.Children))
	}

	// 验证panel节点
	panelNode := tree.FindByID("panel1")
	if panelNode == nil {
		t.Fatal("panel1 not found")
	}

	if len(panelNode.Children) != 2 {
		t.Errorf("Expected 2 panel children, got %d", len(panelNode.Children))
	}

	// 验证button节点的父节点
	button1Node := tree.FindByID("button1")
	if button1Node == nil {
		t.Fatal("button1 not found")
	}

	if button1Node.Parent != panelNode {
		t.Error("button1's parent should be panel1")
	}
}

// TestUITree_FindByID 测试通过ID查找
func TestUITree_FindByID(t *testing.T) {
	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	button := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "panel1"}

	widgets := []Widget{panel, button}
	tree := BuildUITree(widgets)

	// 查找存在的节点
	node := tree.FindByID("button1")
	if node == nil {
		t.Fatal("button1 not found")
	}

	if node.ID != "button1" {
		t.Errorf("Expected ID 'button1', got '%s'", node.ID)
	}

	// 查找不存在的节点
	notFound := tree.FindByID("notexist")
	if notFound != nil {
		t.Error("Should not find non-existent node")
	}
}

// TestUITree_GetDepth 测试节点深度
func TestUITree_GetDepth(t *testing.T) {
	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	subPanel := &MockWidget{id: "subPanel", widgetType: TypePanel, parentID: "panel1"}
	button := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "subPanel"}

	widgets := []Widget{panel, subPanel, button}
	tree := BuildUITree(widgets)

	panelNode := tree.FindByID("panel1")
	if panelNode.GetDepth() != 0 {
		t.Errorf("Expected depth 0 for panel1, got %d", panelNode.GetDepth())
	}

	subPanelNode := tree.FindByID("subPanel")
	if subPanelNode.GetDepth() != 1 {
		t.Errorf("Expected depth 1 for subPanel, got %d", subPanelNode.GetDepth())
	}

	buttonNode := tree.FindByID("button1")
	if buttonNode.GetDepth() != 2 {
		t.Errorf("Expected depth 2 for button1, got %d", buttonNode.GetDepth())
	}
}

// TestUITree_GetPath 测试获取路径
func TestUITree_GetPath(t *testing.T) {
	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	subPanel := &MockWidget{id: "subPanel", widgetType: TypePanel, parentID: "panel1"}
	button := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "subPanel"}

	widgets := []Widget{panel, subPanel, button}
	tree := BuildUITree(widgets)

	buttonNode := tree.FindByID("button1")
	path := buttonNode.GetPath()

	expectedPath := []string{"panel1", "subPanel", "button1"}
	if len(path) != len(expectedPath) {
		t.Fatalf("Expected path length %d, got %d", len(expectedPath), len(path))
	}

	for i, id := range path {
		if id != expectedPath[i] {
			t.Errorf("Expected path[%d] = '%s', got '%s'", i, expectedPath[i], id)
		}
	}
}

// TestUITree_GetSiblings 测试获取同级节点
func TestUITree_GetSiblings(t *testing.T) {
	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	button1 := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "panel1"}
	button2 := &MockWidget{id: "button2", widgetType: TypeButton, parentID: "panel1"}
	button3 := &MockWidget{id: "button3", widgetType: TypeButton, parentID: "panel1"}

	widgets := []Widget{panel, button1, button2, button3}
	tree := BuildUITree(widgets)

	button1Node := tree.FindByID("button1")
	siblings := button1Node.GetSiblings()

	if len(siblings) != 2 {
		t.Errorf("Expected 2 siblings, got %d", len(siblings))
	}

	// 验证不包括自己
	for _, sibling := range siblings {
		if sibling.ID == "button1" {
			t.Error("Siblings should not include self")
		}
	}
}

// TestUITree_GetAllDescendants 测试获取所有后代
func TestUITree_GetAllDescendants(t *testing.T) {
	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	subPanel := &MockWidget{id: "subPanel", widgetType: TypePanel, parentID: "panel1"}
	button1 := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "panel1"}
	button2 := &MockWidget{id: "button2", widgetType: TypeButton, parentID: "subPanel"}

	widgets := []Widget{panel, subPanel, button1, button2}
	tree := BuildUITree(widgets)

	panelNode := tree.FindByID("panel1")
	descendants := panelNode.GetAllDescendants()

	// 应该包含 subPanel, button1, button2
	if len(descendants) != 3 {
		t.Errorf("Expected 3 descendants, got %d", len(descendants))
	}
}

// TestUITree_OrphanNodes 测试孤立节点处理
func TestUITree_OrphanNodes(t *testing.T) {
	// 父节点不存在的情况
	button := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "nonexistent"}
	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}

	widgets := []Widget{button, panel}
	tree := BuildUITree(widgets)

	// 孤立节点应该被视为顶层节点
	if tree.Root == nil {
		t.Fatal("Root is nil")
	}

	if len(tree.Root.Children) != 2 {
		t.Errorf("Expected 2 root children (including orphan), got %d", len(tree.Root.Children))
	}

	// button应该可以找到
	buttonNode := tree.FindByID("button1")
	if buttonNode == nil {
		t.Fatal("button1 not found")
	}

	if !buttonNode.IsRoot() {
		t.Error("Orphan node should be treated as root")
	}
}

// TestScriptEngine_RootElement 测试RootElement注入
func TestScriptEngine_RootElement(t *testing.T) {
	eventQueue := NewEventQueue()
	commandQueue := NewCommandQueue()

	config := ScriptEngineConfig{
		EnableConsole: true,
	}

	engine := NewScriptEngine(eventQueue, commandQueue, config)

	// 创建UI树
	panel := &MockWidget{id: "loginPanel", widgetType: TypePanel, parentID: "root"}
	button := &MockWidget{id: "loginButton", widgetType: TypeButton, parentID: "loginPanel"}

	widgets := []Widget{panel, button}
	engine.SetUITree(widgets)

	// 验证RootElement存在
	script := `
		if (typeof RootElement === 'undefined') {
			throw new Error('RootElement is not defined');
		}
		'success';
	`

	_, err := engine.GetVM().RunString(script)
	if err != nil {
		t.Fatalf("RootElement not injected: %v", err)
	}
}

// TestScriptEngine_RootElementAccess 测试通过RootElement访问控件
func TestScriptEngine_RootElementAccess(t *testing.T) {
	eventQueue := NewEventQueue()
	commandQueue := NewCommandQueue()

	config := ScriptEngineConfig{
		EnableConsole: true,
	}

	engine := NewScriptEngine(eventQueue, commandQueue, config)

	// 创建嵌套的UI树
	panel := &MockWidget{id: "loginPanel", widgetType: TypePanel, parentID: "root"}
	usernameInput := &MockWidget{id: "usernameInput", widgetType: TypeTextInput, parentID: "loginPanel"}
	passwordInput := &MockWidget{id: "passwordInput", widgetType: TypeTextInput, parentID: "loginPanel"}
	button := &MockWidget{id: "loginButton", widgetType: TypeButton, parentID: "loginPanel"}

	widgets := []Widget{panel, usernameInput, passwordInput, button}
	engine.SetUITree(widgets)

	// 先调试一下RootElement的结构
	debugScript := `
		console.log('RootElement keys:', Object.keys(RootElement));
		'debug';
	`
	_, debugErr := engine.GetVM().RunString(debugScript)
	if debugErr != nil {
		t.Fatalf("Debug script failed: %v", debugErr)
	}

	// 测试点号访问
	script := `
		// 访问顶层panel
		if (!RootElement.loginPanel) {
			throw new Error('loginPanel not found');
		}

		// 访问嵌套的子控件
		if (!RootElement.loginPanel.usernameInput) {
			throw new Error('usernameInput not found');
		}

		// 验证ID和类型
		if (RootElement.loginPanel.id !== 'loginPanel') {
			throw new Error('loginPanel ID mismatch');
		}

		if (RootElement.loginPanel.loginButton.type !== 'button') {
			throw new Error('loginButton type mismatch');
		}

		'success';
	`

	_, err := engine.GetVM().RunString(script)
	if err != nil {
		t.Fatalf("RootElement access failed: %v", err)
	}
}

// TestScriptEngine_GetElementById 测试getElementById方法
func TestScriptEngine_GetElementById(t *testing.T) {
	eventQueue := NewEventQueue()
	commandQueue := NewCommandQueue()

	config := ScriptEngineConfig{
		EnableConsole: true,
	}

	engine := NewScriptEngine(eventQueue, commandQueue, config)

	panel := &MockWidget{id: "mainPanel", widgetType: TypePanel, parentID: "root"}
	button := &MockWidget{id: "submitButton", widgetType: TypeButton, parentID: "mainPanel"}

	widgets := []Widget{panel, button}
	engine.SetUITree(widgets)

	script := `
		// 通过ID查找
		const btn = RootElement.getElementById('submitButton');
		if (!btn) {
			throw new Error('submitButton not found by ID');
		}

		if (btn.id !== 'submitButton') {
			throw new Error('ID mismatch');
		}

		// 查找不存在的控件
		const notFound = RootElement.getElementById('notexist');
		if (notFound !== null) {
			throw new Error('Should return null for non-existent ID');
		}

		'success';
	`

	_, err := engine.GetVM().RunString(script)
	if err != nil {
		t.Fatalf("getElementById test failed: %v", err)
	}
}

// TestScriptEngine_GetByType 测试getByType方法
func TestScriptEngine_GetByType(t *testing.T) {
	eventQueue := NewEventQueue()
	commandQueue := NewCommandQueue()

	config := ScriptEngineConfig{
		EnableConsole: true,
	}

	engine := NewScriptEngine(eventQueue, commandQueue, config)

	panel := &MockWidget{id: "panel1", widgetType: TypePanel, parentID: "root"}
	button1 := &MockWidget{id: "button1", widgetType: TypeButton, parentID: "panel1"}
	button2 := &MockWidget{id: "button2", widgetType: TypeButton, parentID: "panel1"}
	label := &MockWidget{id: "label1", widgetType: TypeLabel, parentID: "panel1"}

	widgets := []Widget{panel, button1, button2, label}
	engine.SetUITree(widgets)

	script := `
		// 查找所有button
		const buttons = RootElement.getByType('button');
		if (!Array.isArray(buttons)) {
			throw new Error('getByType should return array');
		}

		if (buttons.length !== 2) {
			throw new Error('Expected 2 buttons, got ' + buttons.length);
		}

		// 验证第一个button的ID
		if (buttons[0].id !== 'button1' && buttons[0].id !== 'button2') {
			throw new Error('Invalid button ID: ' + buttons[0].id);
		}

		'success';
	`

	_, err := engine.GetVM().RunString(script)
	if err != nil {
		t.Fatalf("getByType test failed: %v", err)
	}
}

// TestScriptEngine_HierarchicalAccess 测试层级访问
func TestScriptEngine_HierarchicalAccess(t *testing.T) {
	eventQueue := NewEventQueue()
	commandQueue := NewCommandQueue()

	config := ScriptEngineConfig{
		EnableConsole: true,
	}

	engine := NewScriptEngine(eventQueue, commandQueue, config)

	// 创建复杂的嵌套结构
	mainPanel := &MockWidget{id: "mainPanel", widgetType: TypePanel, parentID: "root"}
	loginPanel := &MockWidget{id: "loginPanel", widgetType: TypePanel, parentID: "mainPanel"}
	usernameInput := &MockWidget{id: "usernameInput", widgetType: TypeTextInput, parentID: "loginPanel"}

	widgets := []Widget{mainPanel, loginPanel, usernameInput}
	engine.SetUITree(widgets)

	script := `
		// 多层访问
		const input = RootElement.mainPanel.loginPanel.usernameInput;
		if (!input) {
			throw new Error('Deep access failed');
		}

		if (input.id !== 'usernameInput') {
			throw new Error('ID mismatch in deep access');
		}

		// 测试getParent
		const parent = input.getParent();
		if (!parent || parent.id !== 'loginPanel') {
			throw new Error('getParent failed');
		}

		'success';
	`

	_, err := engine.GetVM().RunString(script)
	if err != nil {
		t.Fatalf("Hierarchical access test failed: %v", err)
	}
}
