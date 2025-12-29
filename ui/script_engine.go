package ui

import (
	"fmt"
	"log"
	"strings"
	"sync"

	"github.com/dop251/goja"
)

// ScriptEngine 脚本引擎
type ScriptEngine struct {
	vm           *goja.Runtime      // 持久化VM
	eventQueue   *EventQueue        // 事件队列
	commandQueue *CommandQueue      // 命令队列
	scripts      sync.Map           // 脚本缓存 (string -> *ScriptInfo) - 并发安全，无锁读取
	bindings     sync.Map           // 控件绑定 (string -> *WidgetScriptBinding) - 并发安全，无锁读取
	config       ScriptEngineConfig // 配置
	running      bool               // 是否运行中
	stopChan     chan struct{}      // 停止信号
	runningMu    sync.RWMutex       // 保护running字段
	vmMu         sync.Mutex         // 保护VM访问（goja不是线程安全的）
	uiTree       *UITree            // UI树结构
	uiTreeMu     sync.RWMutex       // 保护UI树访问
}

// NewScriptEngine 创建脚本引擎
func NewScriptEngine(eventQueue *EventQueue, commandQueue *CommandQueue, config ScriptEngineConfig) *ScriptEngine {
	engine := &ScriptEngine{
		vm:           goja.New(),
		eventQueue:   eventQueue,
		commandQueue: commandQueue,
		config:       config,
		stopChan:     make(chan struct{}),
	}

	// 注入全局API
	engine.setupGlobalAPI()

	return engine
}

// setupGlobalAPI 设置全局API
func (se *ScriptEngine) setupGlobalAPI() {
	se.vmMu.Lock()
	defer se.vmMu.Unlock()

	// 注入 CommonJS 模块支持（exports 和 module）
	setupCommonJSModule(se.vm)

	// 注入console
	if se.config.EnableConsole {
		setupConsole(se.vm)
	}

	// 注入RootElement
	se.uiTreeMu.RLock()
	if se.uiTree != nil {
		se.vm.Set("RootElement", se.createRootElement())
	}
	se.uiTreeMu.RUnlock()

	// 创建Global对象（用户全局命名空间）
	global := se.vm.NewObject()
	se.vm.Set("Global", global)
}

// Start 启动脚本引擎（在独立协程中运行）
func (se *ScriptEngine) Start() error {
	se.runningMu.Lock()
	defer se.runningMu.Unlock()

	if se.running {
		return fmt.Errorf("script engine already running")
	}

	se.running = true

	// 在独立协程中处理事件
	log.Println("[ScriptEngine] Starting processEvents goroutine...")
	go se.processEvents()
	log.Println("[ScriptEngine] processEvents goroutine started")

	return nil
}

// Stop 停止脚本引擎
func (se *ScriptEngine) Stop() {
	se.runningMu.Lock()
	defer se.runningMu.Unlock()

	if !se.running {
		return
	}

	se.running = false
	close(se.stopChan)
}

// LoadScript 加载脚本文件
func (se *ScriptEngine) LoadScript(path string, jsCode string) error {
	// 在VM中编译脚本（VM操作需要加锁）
	se.vmMu.Lock()
	defer se.vmMu.Unlock()

	// 重置 exports 和 module.exports（每个脚本独立）
	exportsObj := se.vm.NewObject()
	moduleObj := se.vm.NewObject()
	moduleObj.Set("exports", exportsObj)
	se.vm.Set("module", moduleObj)
	se.vm.Set("exports", exportsObj)

	// 执行脚本
	_, err := se.vm.RunString(jsCode)
	if err != nil {
		return fmt.Errorf("failed to load script %s: %w", path, err)
	}

	// 获取导出的内容（支持 exports.default 或直接 exports）
	exports := se.vm.Get("exports")
	if exports != nil && !goja.IsUndefined(exports) {
		exportsObject := exports.ToObject(se.vm)
		if exportsObject != nil {
			// 检查是否有 default 导出
			defaultExport := exportsObject.Get("default")
			if defaultExport != nil && !goja.IsUndefined(defaultExport) {
				// 使用 default 导出，将其设置为脚本名称的全局变量
				// 从路径中提取脚本名称（去掉扩展名）
				scriptName := path
				if idx := len(path) - 1; idx >= 0 {
					for i := idx; i >= 0; i-- {
						if path[i] == '/' || path[i] == '\\' {
							scriptName = path[i+1:]
							break
						}
					}
				}
				se.vm.Set(scriptName, defaultExport)
				log.Printf("[ScriptEngine] Loaded script %s with default export", scriptName)
			}
		}
	}

	// 保存到缓存（sync.Map自动处理并发）
	se.scripts.Store(path, &ScriptInfo{
		FilePath: path,
		JSCode:   jsCode,
		Loaded:   true,
	})

	return nil
}

// RegisterWidget 注册控件及其脚本绑定
func (se *ScriptEngine) RegisterWidget(widgetID string, binding *WidgetScriptBinding) error {
	// 检查脚本是否已加载
	if _, exists := se.scripts.Load(binding.ScriptPath); !exists {
		return fmt.Errorf("script not loaded: %s", binding.ScriptPath)
	}

	// 注册绑定（sync.Map自动处理并发）
	se.bindings.Store(widgetID, binding)
	return nil
}

// processEvents 事件处理循环（在独立协程中运行）
func (se *ScriptEngine) processEvents() {
	log.Println("[ScriptEngine] processEvents loop starting...")
	for {
		se.runningMu.RLock()
		isRunning := se.running
		se.runningMu.RUnlock()

		if !isRunning {
			return
		}

		select {
		case <-se.stopChan:
			return
		default:
			// 从队列取事件（非阻塞）
			event, ok := se.eventQueue.TryPop()
			if !ok {
				// 队列为空，短暂休眠避免CPU空转
				continue
			}

			log.Printf("[ScriptEngine] Event popped from queue: Type=%s, WidgetID=%s", event.Type, event.WidgetID)
			// 处理事件
			se.handleEvent(event)
		}
	}
}

// handleEvent 处理单个事件（热路径优化）
func (se *ScriptEngine) handleEvent(event WidgetEvent) {
	log.Printf("[ScriptEngine] Handling event: Type=%s, WidgetID=%s", event.Type, event.WidgetID)

	// 🔥 热路径：使用sync.Map无锁读取
	value, exists := se.bindings.Load(event.WidgetID)
	if !exists {
		// 控件没有绑定脚本
		log.Printf("[ScriptEngine] No binding found for widget %s", event.WidgetID)
		return
	}

	binding := value.(*WidgetScriptBinding)

	// 查找对应的处理函数
	handlerName, exists := binding.Handlers[event.Type]
	if !exists {
		// 没有对应事件的处理函数
		log.Printf("[ScriptEngine] No handler found for event type %s on widget %s", event.Type, event.WidgetID)
		return
	}

	log.Printf("[ScriptEngine] Calling handler %s for widget %s", handlerName, event.WidgetID)
	// 调用处理函数
	se.callHandler(handlerName, event, binding)
}

// callHandler 调用JavaScript处理函数（使用真实参数）
func (se *ScriptEngine) callHandler(handlerName string, event WidgetEvent, binding *WidgetScriptBinding) {
	log.Printf("[ScriptEngine] callHandler invoked: handler=%s, widget=%s", handlerName, event.WidgetID)
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[ScriptEngine] Script error in handler %s: %v", handlerName, r)
		}
	}()

	// 所有VM操作都需要加锁
	se.vmMu.Lock()
	defer se.vmMu.Unlock()

	// 支持点号访问：namespace.method（如 "loginButton.onClick"）
	var handler goja.Value
	if parts := strings.Split(handlerName, "."); len(parts) == 2 {
		// 命名空间访问：namespace.method
		log.Printf("[ScriptEngine] Looking for namespace: %s, method: %s", parts[0], parts[1])
		namespace := se.vm.Get(parts[0])
		if namespace == nil || goja.IsUndefined(namespace) {
			log.Printf("[ScriptEngine] Namespace not found: %s", parts[0])
			return
		}
		log.Printf("[ScriptEngine] Namespace found: %s", parts[0])

		namespaceObj := namespace.ToObject(se.vm)
		handler = namespaceObj.Get(parts[1])
		log.Printf("[ScriptEngine] Handler lookup result: found=%v, undefined=%v", handler != nil, goja.IsUndefined(handler))
	} else {
		// 兼容旧格式：直接函数名
		handler = se.vm.Get(handlerName)
	}

	if handler == nil || goja.IsUndefined(handler) {
		log.Printf("[ScriptEngine] Handler not found or undefined: %s", handlerName)
		return
	}

	log.Printf("[ScriptEngine] Handler found, checking if callable...")
	callable, ok := goja.AssertFunction(handler)
	if !ok {
		log.Printf("[ScriptEngine] Handler is not a function: %s", handlerName)
		return
	}

	// 创建self参数（控件API对象）
	selfAPI := se.createWidgetAPI(event.WidgetID, binding.WidgetType)

	// 创建event对象
	eventObj := se.createEventObject(event, selfAPI)

	// 调用处理函数：handler(self, event)
	_, err := callable(goja.Undefined(), selfAPI, eventObj)
	if err != nil {
		fmt.Printf("Error calling handler %s: %v\n", handlerName, err)
	}
}

// GetVM 获取VM实例（用于测试和高级API）
func (se *ScriptEngine) GetVM() *goja.Runtime {
	return se.vm
}

// SetUITree 设置UI树
// 当UI树结构变化时调用此方法更新
func (se *ScriptEngine) SetUITree(widgets []Widget) {
	se.uiTreeMu.Lock()
	defer se.uiTreeMu.Unlock()

	se.uiTree = BuildUITree(widgets)

	// 更新RootElement全局对象
	se.vmMu.Lock()
	defer se.vmMu.Unlock()
	se.vm.Set("RootElement", se.createRootElement())
}

// GetUITree 获取UI树（用于测试）
func (se *ScriptEngine) GetUITree() *UITree {
	se.uiTreeMu.RLock()
	defer se.uiTreeMu.RUnlock()
	return se.uiTree
}
