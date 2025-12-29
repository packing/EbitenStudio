package ui

import (
	"testing"
	"time"
)

// TestScriptEngine_NamespaceHandlers 测试命名空间handler（namespace.method格式）
func TestScriptEngine_NamespaceHandlers(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载带命名空间的脚本
	script := `
		const loginButton = {
			onClick(self, event) {
				console.log("Namespaced handler called");
				self.setText("Clicked!");
				Global.namespaceHandlerCalled = true;
			}
		};
	`
	engine.LoadScript("loginButton.js", script)

	// 注册控件（使用点号访问）
	binding := &WidgetScriptBinding{
		WidgetID:   "loginBtn",
		ScriptPath: "loginButton.js",
		Handlers: map[EventType]string{
			EventClick: "loginButton.onClick", // 点号访问
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("loginBtn", binding)

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送事件
	eq.Push(WidgetEvent{
		Type:     EventClick,
		WidgetID: "loginBtn",
	})

	// 等待处理
	time.Sleep(50 * time.Millisecond)

	// 验证命名空间处理器被调用
	vm := engine.GetVM()
	engine.vmMu.Lock()
	global := vm.Get("Global")
	engine.vmMu.Unlock()

	if global == nil {
		t.Fatal("Global object not found")
	}

	globalObj := global.ToObject(vm)
	called := globalObj.Get("namespaceHandlerCalled")

	if called == nil || !called.ToBoolean() {
		t.Error("Namespace handler should be called")
	}

	// 验证命令
	commands := cq.PopAll()
	if len(commands) != 1 {
		t.Errorf("Expected 1 command, got %d", len(commands))
	}

	if len(commands) > 0 && commands[0].Value != "Clicked!" {
		t.Errorf("Expected setText 'Clicked!', got %v", commands[0].Value)
	}
}

// TestScriptEngine_BackwardCompatibility 测试向后兼容（不带命名空间）
func TestScriptEngine_BackwardCompatibility(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载旧格式脚本（兼容性测试）
	script := `
		function onClick(self, event) {
			self.setText("Old style works!");
		}
	`
	engine.LoadScript("oldButton.js", script)

	// 注册控件（使用旧格式handler名称）
	binding := &WidgetScriptBinding{
		WidgetID:   "oldBtn",
		ScriptPath: "oldButton.js",
		Handlers: map[EventType]string{
			EventClick: "onClick", // 不带命名空间
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("oldBtn", binding)

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送事件
	eq.Push(WidgetEvent{
		Type:     EventClick,
		WidgetID: "oldBtn",
	})

	// 等待处理
	time.Sleep(50 * time.Millisecond)

	// 验证命令
	commands := cq.PopAll()
	if len(commands) != 1 {
		t.Errorf("Expected 1 command, got %d", len(commands))
	}

	if len(commands) > 0 && commands[0].Value != "Old style works!" {
		t.Errorf("Expected setText 'Old style works!', got %v", commands[0].Value)
	}
}

// TestScriptEngine_MultipleNamespaces 测试多个命名空间（模拟多个脚本文件）
func TestScriptEngine_MultipleNamespaces(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载多个脚本，每个都有自己的命名空间
	script1 := `
		const loginButton = {
			onClick(self, event) {
				self.setText("Login clicked");
			}
		};
	`
	engine.LoadScript("loginButton.js", script1)

	script2 := `
		const logoutButton = {
			onClick(self, event) {
				self.setText("Logout clicked");
			}
		};
	`
	engine.LoadScript("logoutButton.js", script2)

	script3 := `
		const cancelButton = {
			onClick(self, event) {
				self.setText("Cancel clicked");
			}
		};
	`
	engine.LoadScript("cancelButton.js", script3)

	// 注册三个按钮
	buttons := []struct {
		id        string
		namespace string
	}{
		{"loginBtn", "loginButton"},
		{"logoutBtn", "logoutButton"},
		{"cancelBtn", "cancelButton"},
	}

	for _, btn := range buttons {
		binding := &WidgetScriptBinding{
			WidgetID:   btn.id,
			ScriptPath: btn.namespace + ".js",
			Handlers: map[EventType]string{
				EventClick: btn.namespace + ".onClick",
			},
			WidgetType: TypeButton,
		}
		engine.RegisterWidget(btn.id, binding)
	}

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送所有按钮的点击事件
	for _, btn := range buttons {
		eq.Push(WidgetEvent{
			Type:     EventClick,
			WidgetID: btn.id,
		})
	}

	// 等待处理
	time.Sleep(100 * time.Millisecond)

	// 验证命令
	commands := cq.PopAll()
	if len(commands) != 3 {
		t.Errorf("Expected 3 commands, got %d", len(commands))
	}

	// 验证每个命令的内容
	expectedTexts := map[string]bool{
		"Login clicked":  false,
		"Logout clicked": false,
		"Cancel clicked": false,
	}

	for _, cmd := range commands {
		if text, ok := cmd.Value.(string); ok {
			if _, exists := expectedTexts[text]; exists {
				expectedTexts[text] = true
			}
		}
	}

	for text, found := range expectedTexts {
		if !found {
			t.Errorf("Expected command with text '%s' not found", text)
		}
	}
}

// TestScriptEngine_NamespaceWithMultipleMethods 测试命名空间中的多个方法
func TestScriptEngine_NamespaceWithMultipleMethods(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载带多个方法的脚本
	script := `
		const myButton = {
			onClick(self, event) {
				self.setText("Clicked");
				Global.clickCount = (Global.clickCount || 0) + 1;
			},
			
			onHover(self, event) {
				self.setColor(255, 200, 200, 255);
				Global.hoverCount = (Global.hoverCount || 0) + 1;
			},
			
			onMouseDown(self, event) {
				self.setText("Down");
				Global.downCount = (Global.downCount || 0) + 1;
			}
		};
	`
	engine.LoadScript("myButton.js", script)

	// 注册控件（绑定多个事件）
	binding := &WidgetScriptBinding{
		WidgetID:   "btn1",
		ScriptPath: "myButton.js",
		Handlers: map[EventType]string{
			EventClick:     "myButton.onClick",
			EventHover:     "myButton.onHover",
			EventMouseDown: "myButton.onMouseDown",
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("btn1", binding)

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送不同类型的事件
	eq.Push(WidgetEvent{Type: EventClick, WidgetID: "btn1"})
	eq.Push(WidgetEvent{Type: EventHover, WidgetID: "btn1"})
	eq.Push(WidgetEvent{Type: EventMouseDown, WidgetID: "btn1"})

	// 等待处理
	time.Sleep(100 * time.Millisecond)

	// 验证Global计数器
	vm := engine.GetVM()
	engine.vmMu.Lock()
	global := vm.Get("Global")
	engine.vmMu.Unlock()

	if global == nil {
		t.Fatal("Global object not found")
	}

	globalObj := global.ToObject(vm)

	// 检查clickCount
	clickCount := globalObj.Get("clickCount")
	if clickCount == nil || clickCount.ToInteger() != 1 {
		t.Errorf("Expected clickCount=1, got %v", clickCount)
	}

	// 检查hoverCount
	hoverCount := globalObj.Get("hoverCount")
	if hoverCount == nil || hoverCount.ToInteger() != 1 {
		t.Errorf("Expected hoverCount=1, got %v", hoverCount)
	}

	// 检查downCount
	downCount := globalObj.Get("downCount")
	if downCount == nil || downCount.ToInteger() != 1 {
		t.Errorf("Expected downCount=1, got %v", downCount)
	}

	// 验证命令数量
	commands := cq.PopAll()
	if len(commands) != 3 {
		t.Errorf("Expected 3 commands, got %d", len(commands))
	}
}
