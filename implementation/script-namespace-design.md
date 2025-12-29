# 脚本命名空间设计方案

**问题**: 多个脚本文件中的同名顶级函数（如onClick）导致VSCode报重复定义错误。

**日期**: 2025年12月26日

---

## 解决方案：对象命名空间包裹

### 设计原则

1. **文件名即命名空间**: 使用文件名（去除扩展名）作为对象名
2. **对象包裹**: 所有处理函数作为对象的方法
3. **点号访问**: handler名称使用"namespace.functionName"格式

---

## 脚本编写格式

### 旧格式（有冲突）

```typescript
// loginButton.ts
function onClick(self: UIButton, event: ButtonClickEvent) {
    // ...
}

function onHover(self: UIButton, event: HoverEvent) {
    // ...
}
```

### 新格式（推荐）

```typescript
// loginButton.ts
const loginButton = {
    onClick(self: UIButton, event: ButtonClickEvent) {
        console.log("Login button clicked");
        // ...
    },
    
    onHover(self: UIButton, event: HoverEvent) {
        console.log("Login button hovered");
        // ...
    }
};
```

---

## 使用方式

### 1. 注册控件绑定

```go
binding := &WidgetScriptBinding{
    WidgetID:   "loginBtn",
    ScriptPath: "loginButton.js",
    Handlers: map[EventType]string{
        EventClick: "loginButton.onClick",  // 使用点号访问
        EventHover: "loginButton.onHover",
    },
    WidgetType: TypeButton,
}
```

### 2. TypeScript类型定义示例

```typescript
// script-types.d.ts
type ButtonScriptHandlers = {
    onClick?: (self: UIButton, event: ButtonClickEvent) => void;
    onHover?: (self: UIButton, event: HoverEvent) => void;
    onMouseDown?: (self: UIButton, event: MouseEvent) => void;
    onMouseUp?: (self: UIButton, event: MouseEvent) => void;
};

// loginButton.ts
const loginButton: ButtonScriptHandlers = {
    onClick(self, event) {
        // TypeScript会自动推断类型
    }
};
```

---

## 实施步骤

### Phase 1: 修改ScriptEngine支持点号访问

**文件**: `ui/script_engine.go`

```go
// callHandler 修改为支持点号访问
func (se *ScriptEngine) callHandler(handlerName string, event WidgetEvent, binding *WidgetScriptBinding) {
    defer func() {
        if r := recover(); r != nil {
            fmt.Printf("Script error in handler %s: %v\n", handlerName, r)
        }
    }()

    se.vmMu.Lock()
    defer se.vmMu.Unlock()

    // 支持点号访问：namespace.method
    var handler goja.Value
    if parts := strings.Split(handlerName, "."); len(parts) == 2 {
        // 形如 "loginButton.onClick"
        namespace := se.vm.Get(parts[0])
        if namespace == nil || goja.IsUndefined(namespace) {
            fmt.Printf("Namespace not found: %s\n", parts[0])
            return
        }
        
        namespaceObj := namespace.ToObject(se.vm)
        handler = namespaceObj.Get(parts[1])
    } else {
        // 兼容旧格式：直接函数名
        handler = se.vm.Get(handlerName)
    }

    if handler == nil || goja.IsUndefined(handler) {
        fmt.Printf("Handler not found: %s\n", handlerName)
        return
    }

    callable, ok := goja.AssertFunction(handler)
    if !ok {
        fmt.Printf("Handler is not a function: %s\n", handlerName)
        return
    }

    // 创建self和event参数
    selfAPI := se.createWidgetAPI(event.WidgetID, binding.WidgetType)
    eventObj := se.createEventObject(event, selfAPI)

    // 调用处理函数
    _, err := callable(goja.Undefined(), selfAPI, eventObj)
    if err != nil {
        fmt.Printf("Error calling handler %s: %v\n", handlerName, err)
    }
}
```

### Phase 2: 更新示例脚本

**文件**: `scripts_example/loginButton.ts`

```typescript
// loginButton - Button脚本
/// <reference path="../script-types.d.ts" />
/// <reference path="../ui_example.d.ts" />

const loginButton = {
    /**
     * 按钮点击事件
     */
    onClick(self: UIButton, event: ButtonClickEvent): void {
        console.log("Login button clicked", event);
        
        const username = RootElement.loginPanel.usernameInput.getText();
        const password = RootElement.loginPanel.passwordInput.getText();
        
        if (!username || username.length < 3) {
            showError("请输入有效的用户名");
            return;
        }
        
        // ... 登录逻辑
    },
    
    /**
     * 悬停事件
     */
    onHover(self: UIButton, event: HoverEvent): void {
        self.setColor(200, 200, 255, 255);
    }
};
```

### Phase 3: 更新类型定义

**文件**: `script-types.d.ts`

添加通用的脚本命名空间类型：

```typescript
/**
 * 按钮脚本处理器集合
 */
interface ButtonScriptHandlers {
    onClick?: (self: UIButton, event: ButtonClickEvent) => void;
    onDoubleClick?: (self: UIButton, event: ButtonClickEvent) => void;
    onHover?: (self: UIButton, event: HoverEvent) => void;
    onMouseDown?: (self: UIButton, event: MouseEvent) => void;
    onMouseUp?: (self: UIButton, event: MouseEvent) => void;
}

/**
 * 文本输入框脚本处理器集合
 */
interface TextInputScriptHandlers {
    onChange?: (self: UITextInput, event: TextInputChangeEvent) => void;
    onFocus?: (self: UITextInput, event: FocusEvent) => void;
    onBlur?: (self: UITextInput, event: BlurEvent) => void;
    onKeyPress?: (self: UITextInput, event: KeyPressEvent) => void;
}

// 使用示例
declare const loginButton: ButtonScriptHandlers;
declare const usernameInput: TextInputScriptHandlers;
```

### Phase 4: 编写测试

**文件**: `ui/script_engine_test.go`

```go
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
            EventClick: "loginButton.onClick",  // 点号访问
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

    globalObj := global.ToObject(vm)
    called := globalObj.Get("namespaceHandlerCalled")
    
    if !called.ToBoolean() {
        t.Error("Namespace handler should be called")
    }

    // 验证命令
    commands := cq.PopAll()
    if len(commands) != 1 {
        t.Errorf("Expected 1 command, got %d", len(commands))
    }
    
    if commands[0].Value != "Clicked!" {
        t.Errorf("Expected setText 'Clicked!', got %v", commands[0].Value)
    }
}

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
            EventClick: "onClick",  // 不带命名空间
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
    
    if commands[0].Value != "Old style works!" {
        t.Errorf("Expected setText 'Old style works!', got %v", commands[0].Value)
    }
}
```

---

## 优势分析

### 1. 解决命名冲突
- ✅ 多个脚本文件可以定义同名方法
- ✅ VSCode/TypeScript不再报错
- ✅ 命名空间清晰隔离

### 2. 代码组织更清晰
```typescript
// 一个文件的所有处理器集中在一个对象中
const loginButton = {
    onClick() { /* ... */ },
    onHover() { /* ... */ },
    onFocus() { /* ... */ }
};
```

### 3. TypeScript类型支持更好
```typescript
// 可以定义完整的接口
const loginButton: ButtonScriptHandlers = {
    onClick(self, event) {
        // self和event都有完整的类型推断
    }
};
```

### 4. 向后兼容
- 旧格式（直接函数名）仍然支持
- 可以逐步迁移现有脚本

---

## 最佳实践

### 1. 命名规范
- 对象名 = 文件名（驼峰命名）
- `loginButton.ts` → `const loginButton = { ... }`
- `userProfile.ts` → `const userProfile = { ... }`

### 2. 一个文件一个命名空间
```typescript
// ✅ 推荐
const loginButton = {
    onClick() {},
    onHover() {}
};

// ❌ 避免
const loginButton = { ... };
const logoutButton = { ... };  // 应该放在单独的文件
```

### 3. 共享逻辑
```typescript
// sharedUtils.ts
const sharedUtils = {
    validateInput(text: string): boolean {
        return text.length >= 3;
    },
    
    showMessage(msg: string) {
        console.log(msg);
    }
};

// loginButton.ts
const loginButton = {
    onClick(self, event) {
        const username = RootElement.usernameInput.getText();
        if (!sharedUtils.validateInput(username)) {
            sharedUtils.showMessage("Invalid username");
            return;
        }
        // ...
    }
};
```

---

## 迁移指南

### 对于新项目
直接使用命名空间格式编写脚本。

### 对于现有项目
1. 保持旧脚本不变（向后兼容）
2. 新脚本使用命名空间格式
3. 逐步重构旧脚本（可选）

---

## 替代方案对比

### 方案B: Class包裹
```typescript
class LoginButtonImpl {
    onClick(self: UIButton, event: ButtonClickEvent) { }
    onHover(self: UIButton, event: HoverEvent) { }
}

// 需要实例化
const loginButton = new LoginButtonImpl();
```
**评价**: 过度设计，增加复杂度，不推荐。

### 方案C: IIFE
```typescript
(function() {
    function onClick(self, event) { }
    function onHover(self, event) { }
    
    window.loginButton = { onClick, onHover };
})();
```
**评价**: 代码冗长，可读性差，不推荐。

---

## 总结

推荐使用**对象命名空间包裹**方案：
- ✅ 简单直观
- ✅ 解决命名冲突
- ✅ TypeScript友好
- ✅ 向后兼容
- ✅ 易于维护

实施优先级：**高** - 直接影响脚本编写体验
