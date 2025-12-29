package ui

import (
	"fmt"
	"testing"
	"time"
)

// TestScriptAPI_Console 测试console.log等功能
func TestScriptAPI_Console(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载脚本（使用console）
	script := `
		function onClick() {
			console.log("Button clicked");
			console.error("This is an error");
			console.warn("This is a warning");
			console.info("This is info");
		}
	`
	err := engine.LoadScript("console_test.js", script)
	if err != nil {
		t.Fatalf("Failed to load script: %v", err)
	}

	// 注册控件
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "console_test.js",
		Handlers: map[EventType]string{
			EventClick: "onClick",
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("button1", binding)

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送事件
	eq.Push(WidgetEvent{
		Type:     EventClick,
		WidgetID: "button1",
	})

	// 等待处理
	time.Sleep(50 * time.Millisecond)

	// console应该输出到标准输出（通过目视验证）
	t.Log("Console output should appear above")
}

// TestScriptAPI_Global 测试Global对象
func TestScriptAPI_Global(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载脚本（使用Global存储状态）
	script := `
		function onClick() {
			if (Global.clickCount === undefined) {
				Global.clickCount = 0;
			}
			Global.clickCount++;
		}
	`
	engine.LoadScript("global_test.js", script)

	// 注册控件
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "global_test.js",
		Handlers: map[EventType]string{
			EventClick: "onClick",
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("button1", binding)

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送多个事件
	for i := 0; i < 3; i++ {
		eq.Push(WidgetEvent{
			Type:     EventClick,
			WidgetID: "button1",
		})
	}

	// 等待处理
	time.Sleep(100 * time.Millisecond)

	// 验证Global.clickCount
	vm := engine.GetVM()
	engine.vmMu.Lock()
	global := vm.Get("Global")
	engine.vmMu.Unlock()

	if global == nil {
		t.Fatal("Global object not found")
	}

	globalObj := global.ToObject(vm)
	clickCount := globalObj.Get("clickCount")

	if clickCount == nil {
		t.Fatal("Global.clickCount not found")
	}

	count := clickCount.ToInteger()
	if count != 3 {
		t.Errorf("Expected Global.clickCount=3, got %d", count)
	}
}

// TestScriptAPI_SelfParameter 测试self参数和控件API
func TestScriptAPI_SelfParameter(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载脚本（使用self参数）
	script := `
		function onClick(self, event) {
			// 测试self.getID()
			var id = self.getID();
			console.log("Widget ID:", id);
			
			// 测试控件方法
			self.setText("Clicked!");
			self.setColor(255, 0, 0, 255);
			self.setVisible(true);
			self.setEnabled(false);
		}
	`
	engine.LoadScript("self_test.js", script)

	// 注册控件
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "self_test.js",
		Handlers: map[EventType]string{
			EventClick: "onClick",
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("button1", binding)

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送事件
	eq.Push(WidgetEvent{
		Type:     EventClick,
		WidgetID: "button1",
	})

	// 等待处理
	time.Sleep(50 * time.Millisecond)

	// 验证命令队列
	commands := cq.PopAll()

	if len(commands) != 4 {
		t.Errorf("Expected 4 commands, got %d", len(commands))
	}

	// 验证命令内容
	expectedTypes := []CommandType{
		CommandSetText,
		CommandSetColor,
		CommandSetVisible,
		CommandSetProperty, // setEnabled
	}

	for i, cmd := range commands {
		if i < len(expectedTypes) && cmd.Type != expectedTypes[i] {
			t.Errorf("Command %d: expected type %v, got %v", i, expectedTypes[i], cmd.Type)
		}
		if cmd.WidgetID != "button1" {
			t.Errorf("Command %d: expected widgetID=button1, got %s", i, cmd.WidgetID)
		}
	}

	// 验证setText命令
	if commands[0].Value != "Clicked!" {
		t.Errorf("setText value: expected 'Clicked!', got %v", commands[0].Value)
	}

	// 验证setColor命令
	color, ok := commands[1].Value.(RGBA)
	if !ok {
		t.Error("setColor value is not RGBA")
	} else {
		if color.R != 255 || color.G != 0 || color.B != 0 || color.A != 255 {
			t.Errorf("setColor: expected RGBA(255,0,0,255), got RGBA(%d,%d,%d,%d)",
				color.R, color.G, color.B, color.A)
		}
	}
}

// TestScriptAPI_EventObject 测试event参数
func TestScriptAPI_EventObject(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载脚本（使用event参数）
	script := `
		function onClick(self, event) {
			console.log("Event type:", event.type);
			console.log("Event target ID:", event.target.getID());
			console.log("Mouse position:", event.x, event.y);
			console.log("Mouse button:", event.button);
			
			// 验证event.target === self
			if (event.target.getID() === self.getID()) {
				Global.eventTargetCorrect = true;
			}
		}
	`
	engine.LoadScript("event_test.js", script)

	// 注册控件
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "event_test.js",
		Handlers: map[EventType]string{
			EventClick: "onClick",
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("button1", binding)

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送事件（带鼠标位置）
	eq.Push(WidgetEvent{
		Type:     EventClick,
		WidgetID: "button1",
		X:        100,
		Y:        200,
		Button:   1,
	})

	// 等待处理
	time.Sleep(50 * time.Millisecond)

	// 验证event.target === self
	vm := engine.GetVM()
	engine.vmMu.Lock()
	global := vm.Get("Global")
	engine.vmMu.Unlock()

	if global == nil {
		t.Fatal("Global object not found")
	}

	globalObj := global.ToObject(vm)
	eventTargetCorrect := globalObj.Get("eventTargetCorrect")

	if eventTargetCorrect == nil {
		t.Fatal("Global.eventTargetCorrect not found")
	}

	if !eventTargetCorrect.ToBoolean() {
		t.Error("event.target should equal self")
	}
}

// TestScriptAPI_MultipleWidgets 测试多个控件
func TestScriptAPI_MultipleWidgets(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载脚本
	script := `
		function onClick(self, event) {
			self.setText("Clicked: " + self.getID());
		}
	`
	engine.LoadScript("multi_test.js", script)

	// 注册多个控件
	for i := 1; i <= 3; i++ {
		widgetID := fmt.Sprintf("button%d", i)
		binding := &WidgetScriptBinding{
			WidgetID:   widgetID,
			ScriptPath: "multi_test.js",
			Handlers: map[EventType]string{
				EventClick: "onClick",
			},
			WidgetType: TypeButton,
		}
		engine.RegisterWidget(widgetID, binding)
	}

	// 启动引擎
	engine.Start()
	defer engine.Stop()

	// 推送多个控件的事件
	eq.Push(WidgetEvent{Type: EventClick, WidgetID: "button1"})
	eq.Push(WidgetEvent{Type: EventClick, WidgetID: "button2"})
	eq.Push(WidgetEvent{Type: EventClick, WidgetID: "button3"})

	// 等待处理
	time.Sleep(100 * time.Millisecond)

	// 验证命令队列
	commands := cq.PopAll()

	if len(commands) != 3 {
		t.Errorf("Expected 3 commands, got %d", len(commands))
	}

	// 验证每个命令的widgetID
	expectedIDs := map[string]bool{
		"button1": false,
		"button2": false,
		"button3": false,
	}

	for _, cmd := range commands {
		if _, exists := expectedIDs[cmd.WidgetID]; exists {
			expectedIDs[cmd.WidgetID] = true
		}
	}

	for id, found := range expectedIDs {
		if !found {
			t.Errorf("Command for widget %s not found", id)
		}
	}
}
