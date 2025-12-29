# 脚本引擎锁设计优化方案

## 当前问题

Phase 2实现中使用了3个锁（mu, runningMu, vmMu），但实际上可以优化。

## 优化方案

### 方案A：最小锁（推荐用于生产）

**假设**：所有脚本和控件在Start()之前加载完成

```go
type ScriptEngine struct {
    vm           *goja.Runtime
    eventQueue   *EventQueue
    commandQueue *CommandQueue
    scripts      map[string]*ScriptInfo      // 只读，无需锁
    bindings     map[string]*WidgetScriptBinding // 只读，无需锁
    config       ScriptEngineConfig
    stopChan     chan struct{}               // 替代 running + runningMu
    // 移除所有锁！
}

func (se *ScriptEngine) Start() error {
    // 不需要检查 running，stopChan 关闭后无法重启
    go se.processEvents()
    return nil
}

func (se *ScriptEngine) Stop() {
    close(se.stopChan) // channel操作本身就是线程安全的
}

func (se *ScriptEngine) processEvents() {
    for {
        select {
        case <-se.stopChan:
            return // 优雅退出
        default:
            event, ok := se.eventQueue.TryPop()
            if !ok {
                continue
            }
            se.handleEvent(event) // 无锁访问 bindings（只读）
        }
    }
}
```

**优点**：
- ✅ 零锁开销
- ✅ 代码更简洁
- ✅ 性能最优

**限制**：
- ❌ 不能动态加载脚本
- ❌ 不能重启引擎（Stop后无法再Start）

---

### 方案B：支持动态加载（当前实现）

**假设**：运行时可能加载新脚本

```go
type ScriptEngine struct {
    vm           *goja.Runtime
    eventQueue   *EventQueue
    commandQueue *CommandQueue
    scripts      map[string]*ScriptInfo
    bindings     map[string]*WidgetScriptBinding
    config       ScriptEngineConfig
    stopChan     chan struct{}
    mu           sync.RWMutex  // 保护 scripts/bindings
    vmMu         sync.Mutex    // 保护 VM（goja不是线程安全的）
    // 移除 runningMu - 用 stopChan 替代
}
```

**优化**：移除`runningMu`，改用channel

```go
func (se *ScriptEngine) processEvents() {
    for {
        select {
        case <-se.stopChan:
            return
        default:
            // 不需要读取 running 变量
            event, ok := se.eventQueue.TryPop()
            if !ok {
                continue
            }
            
            se.mu.RLock()  // 读锁
            binding := se.bindings[event.WidgetID]
            se.mu.RUnlock()
            
            if binding != nil {
                se.vmMu.Lock()  // VM锁
                // 执行JS代码
                se.vmMu.Unlock()
            }
        }
    }
}
```

---

### 方案C：消息队列模式（彻底无锁）

**思路**：所有操作（包括加载脚本）都通过队列发送到脚本协程

```go
type ScriptCommand interface{}

type LoadScriptCmd struct {
    Path   string
    JSCode string
}

type RegisterWidgetCmd struct {
    WidgetID string
    Binding  *WidgetScriptBinding
}

type ScriptEngine struct {
    vm           *goja.Runtime
    eventQueue   *EventQueue
    cmdQueue     chan ScriptCommand  // 内部命令队列
    // 无需任何锁！
}

func (se *ScriptEngine) LoadScript(path, code string) {
    se.cmdQueue <- LoadScriptCmd{Path: path, JSCode: code}
}

func (se *ScriptEngine) processEvents() {
    for {
        select {
        case <-se.stopChan:
            return
        case cmd := <-se.cmdQueue:
            se.handleCommand(cmd) // 在脚本协程执行，无竞争
        default:
            event, _ := se.eventQueue.TryPop()
            se.handleEvent(event)
        }
    }
}
```

**优点**：
- ✅ 完全无锁
- ✅ 支持动态加载
- ✅ 单一协程模型，逻辑简单

**缺点**：
- ⚠️ LoadScript变为异步（需要等待确认）

---

## 推荐决策

### 当前阶段（Phase 2-3）
保持**方案B**（当前实现），但做小优化：
- 移除`runningMu`，用`stopChan`替代
- 保留`mu`和`vmMu`（为动态加载和安全性）

### 未来优化（Phase 7）
如果性能测试发现锁争用，切换到**方案C**（消息队列）

---

## 为什么goja需要锁？

goja官方文档明确说明：

> **goja.Runtime is not thread-safe.** All operations on a single Runtime must be done from the same goroutine.

原因：
1. JavaScript本身是单线程的
2. goja的内部状态（栈、堆、全局对象）不支持并发访问
3. 如果多个goroutine同时调用`vm.Get()`或`callable()`，会导致内存损坏

所以即使是"读操作"（vm.Get）也需要序列化！

---

## 结论

锁的需求来自于：

1. **设计选择**：支持动态加载脚本（运行时LoadScript）
2. **库限制**：goja不是线程安全的
3. **测试需要**：测试代码从主线程访问VM

如果接受"静态加载"的限制，可以移除大部分锁。
