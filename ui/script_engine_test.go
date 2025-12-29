package ui

import (
	"testing"
	"time"
)

func TestScriptEngineCreate(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	if engine == nil {
		t.Fatal("Failed to create script engine")
	}

	if engine.vm == nil {
		t.Error("VM not initialized")
	}
}

func TestScriptEngineStartStop(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 启动
	err := engine.Start()
	if err != nil {
		t.Fatalf("Failed to start engine: %v", err)
	}

	if !engine.running {
		t.Error("Engine should be running")
	}

	// 重复启动应该失败
	err = engine.Start()
	if err == nil {
		t.Error("Should not allow starting twice")
	}

	// 停止
	engine.Stop()

	// 等待协程结束
	time.Sleep(10 * time.Millisecond)

	if engine.running {
		t.Error("Engine should be stopped")
	}
}

func TestScriptEngineLoadScript(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载简单脚本
	script := `
		function onClick() {
			return "clicked";
		}
	`

	err := engine.LoadScript("test.js", script)
	if err != nil {
		t.Fatalf("Failed to load script: %v", err)
	}

	// 验证脚本已加载
	value, exists := engine.scripts.Load("test.js")
	if !exists {
		t.Error("Script not found in cache")
	}

	info := value.(*ScriptInfo)
	if !info.Loaded {
		t.Error("Script should be marked as loaded")
	}

	// 验证函数可调用
	vm := engine.GetVM()
	engine.vmMu.Lock()
	fn := vm.Get("onClick")
	engine.vmMu.Unlock()

	if fn == nil {
		t.Error("onClick function not found in VM")
	}
}

func TestScriptEngineRegisterWidget(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 先加载脚本
	script := `
		function onClick() {
			return "clicked";
		}
	`
	engine.LoadScript("button.js", script)

	// 注册控件
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "button.js",
		Handlers: map[EventType]string{
			EventClick: "onClick",
		},
	}

	err := engine.RegisterWidget("button1", binding)
	if err != nil {
		t.Fatalf("Failed to register widget: %v", err)
	}

	// 验证绑定
	value, exists := engine.bindings.Load("button1")
	if !exists {
		t.Error("Widget binding not found")
	}

	b := value.(*WidgetScriptBinding)
	if b.ScriptPath != "button.js" {
		t.Errorf("Expected button.js, got %s", b.ScriptPath)
	}
}

func TestScriptEngineRegisterWidgetWithoutScript(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 尝试注册控件但未加载脚本
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "notexist.js",
		Handlers: map[EventType]string{
			EventClick: "onClick",
		},
		WidgetType: TypeButton,
	}

	err := engine.RegisterWidget("button1", binding)
	if err == nil {
		t.Error("Should fail when script not loaded")
	}
}

func TestScriptEngineBasicEventHandling(t *testing.T) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载脚本（设置全局变量以验证调用）
	script := `
		var callCount = 0;
		function onClick() {
			callCount++;
		}
	`
	engine.LoadScript("button.js", script)

	// 注册控件
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "button.js",
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

	// 验证callCount增加
	vm := engine.GetVM()
	engine.vmMu.Lock()
	callCount := vm.Get("callCount")
	engine.vmMu.Unlock()

	if callCount == nil {
		t.Fatal("callCount not found")
	}

	count := callCount.ToInteger()
	if count != 1 {
		t.Errorf("Expected callCount=1, got %d", count)
	}
}

func BenchmarkScriptEngineLoadScript(b *testing.B) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	script := `
		function onClick() {
			return "clicked";
		}
	`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine.LoadScript("test.js", script)
	}
}

func BenchmarkScriptEngineHandleEvent(b *testing.B) {
	eq := NewEventQueue()
	cq := NewCommandQueue()
	defer eq.Close()

	config := DefaultScriptEngineConfig()
	engine := NewScriptEngine(eq, cq, config)

	// 加载脚本
	script := `
		function onClick() {
			return "clicked";
		}
	`
	engine.LoadScript("button.js", script)

	// 注册控件
	binding := &WidgetScriptBinding{
		WidgetID:   "button1",
		ScriptPath: "button.js",
		Handlers: map[EventType]string{
			EventClick: "onClick",
		},
		WidgetType: TypeButton,
	}
	engine.RegisterWidget("button1", binding)

	event := WidgetEvent{
		Type:     EventClick,
		WidgetID: "button1",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// 🔥 热路径：测试handleEvent性能
		engine.handleEvent(event)
	}
}
