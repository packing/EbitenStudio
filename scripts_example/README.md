# 脚本示例说明

本目录包含两种脚本编写格式的示例。

## 旧格式（有命名冲突）⚠️

**文件**:
- `loginButton.ts`
- `usernameInput.ts`
- `sharedHandler.ts`

**问题**: 
- 多个文件都定义了 `onClick`、`onFocus` 等顶级函数
- VSCode/TypeScript会报"重复定义"错误
- 不适合大型项目

**示例**:
```typescript
// loginButton.ts
function onClick(self: UIButton, event: ButtonClickEvent) {
    // ...
}

// usernameInput.ts
function onClick(self: UITextInput, event: TextInputChangeEvent) {
    // ❌ VSCode会报错：onClick已在其他文件中定义
}
```

---

## 新格式（推荐）✅

**文件**:
- `loginButton_namespace.ts`
- `usernameInput_namespace.ts`
- `sharedHandler_namespace.ts`

**优势**:
- ✅ 使用对象命名空间，完全隔离
- ✅ 无命名冲突
- ✅ TypeScript友好
- ✅ 代码组织清晰
- ✅ 支持私有辅助方法

**示例**:
```typescript
// loginButton_namespace.ts
const loginButton = {
    onClick(self: UIButton, event: ButtonClickEvent) {
        console.log("Login button clicked");
        this.performLogin(self);  // 调用私有方法
    },
    
    onHover(self: UIButton, event: HoverEvent) {
        self.setColor(200, 220, 255, 255);
    },
    
    // 私有辅助方法
    performLogin(button: UIButton) {
        // ...
    }
};

// usernameInput_namespace.ts
const usernameInput = {
    onClick(self: UITextInput, event: TextInputChangeEvent) {
        // ✅ 不会与loginButton.onClick冲突
    },
    
    onFocus(self: UITextInput, event: FocusEvent) {
        this.showHint();  // 调用私有方法
    },
    
    // 私有辅助方法
    showHint() {
        // ...
    }
};
```

---

## 使用方法

### 注册控件（Go代码）

#### 旧格式
```go
binding := &WidgetScriptBinding{
    WidgetID:   "loginBtn",
    ScriptPath: "loginButton.js",
    Handlers: map[EventType]string{
        EventClick: "onClick",  // 直接函数名
    },
    WidgetType: TypeButton,
}
```

#### 新格式
```go
binding := &WidgetScriptBinding{
    WidgetID:   "loginBtn",
    ScriptPath: "loginButton.js",
    Handlers: map[EventType]string{
        EventClick: "loginButton.onClick",  // 命名空间.方法名
        EventHover: "loginButton.onHover",
    },
    WidgetType: TypeButton,
}
```

---

## 命名规范

### 1. 对象名 = 文件名（驼峰命名）

```typescript
// loginButton.ts → const loginButton = { ... }
// userProfile.ts → const userProfile = { ... }
// settingsPanel.ts → const settingsPanel = { ... }
```

### 2. 一个文件一个命名空间

```typescript
// ✅ 推荐
// loginButton.ts
const loginButton = {
    onClick() { },
    onHover() { }
};

// ❌ 避免
// multipleButtons.ts
const loginButton = { ... };
const logoutButton = { ... };  // 应该放在单独的文件
```

### 3. 方法命名

```typescript
const myWidget = {
    // 事件处理器（公共方法）
    onClick() { },
    onHover() { },
    
    // 辅助方法（私有方法）
    validateInput() { },
    showError() { },
    performAction() { }
};
```

---

## TypeScript类型支持

可以定义接口来约束命名空间：

```typescript
// script-types.d.ts
interface ButtonScriptHandlers {
    onClick?: (self: UIButton, event: ButtonClickEvent) => void;
    onHover?: (self: UIButton, event: HoverEvent) => void;
    onMouseDown?: (self: UIButton, event: MouseEvent) => void;
}

// loginButton.ts
const loginButton: ButtonScriptHandlers = {
    onClick(self, event) {
        // TypeScript自动推断self和event的类型
    }
};
```

---

## 共享脚本示例

多个控件可以共享同一个脚本（使用`self.getID()`区分）：

```typescript
// sharedHandler_namespace.ts
const sharedHandler = {
    onClick(self: UIButton, event: ButtonClickEvent) {
        const buttonId = self.getID();
        
        switch (buttonId) {
            case "saveButton":
                this.handleSave(self);
                break;
            case "cancelButton":
                this.handleCancel(self);
                break;
        }
    },
    
    handleSave(button: UIButton) { /* ... */ },
    handleCancel(button: UIButton) { /* ... */ }
};
```

注册多个按钮：
```go
// 保存按钮
engine.RegisterWidget("saveButton", &WidgetScriptBinding{
    WidgetID: "saveButton",
    ScriptPath: "sharedHandler.js",
    Handlers: map[EventType]string{
        EventClick: "sharedHandler.onClick",
    },
    WidgetType: TypeButton,
})

// 取消按钮
engine.RegisterWidget("cancelButton", &WidgetScriptBinding{
    WidgetID: "cancelButton",
    ScriptPath: "sharedHandler.js",
    Handlers: map[EventType]string{
        EventClick: "sharedHandler.onClick",
    },
    WidgetType: TypeButton,
})
```

---

## 迁移指南

### 对于新项目
直接使用命名空间格式（`*_namespace.ts`文件）。

### 对于现有项目
1. 保持旧脚本不变（引擎支持向后兼容）
2. 新脚本使用命名空间格式
3. 逐步重构旧脚本（可选）

### 快速转换
```typescript
// 旧格式
function onClick(self, event) { }
function onHover(self, event) { }

// 新格式
const widgetName = {
    onClick(self, event) { },
    onHover(self, event) { }
};
```

---

## 最佳实践

### 1. 使用 `this` 调用内部方法
```typescript
const loginButton = {
    onClick(self, event) {
        this.validateInput(self);  // ✅
        validateInput(self);  // ❌ 会报错
    },
    
    validateInput(button) { }
};
```

### 2. 访问全局对象
```typescript
const myWidget = {
    onClick(self, event) {
        // 访问自己的方法
        this.doSomething();
        
        // 访问全局状态
        Global.myData = 123;
        
        // 访问UI树
        RootElement.panel.button.setText("Hello");
        
        // 访问其他命名空间（如果加载了）
        // otherWidget.someMethod();  // 慎用，会产生依赖
    }
};
```

### 3. 错误处理
```typescript
const myWidget = {
    onClick(self, event) {
        try {
            this.performAction();
        } catch (error) {
            console.error("Action failed:", error);
            this.showError("操作失败");
        }
    },
    
    performAction() { },
    showError(msg) { }
};
```

---

## 总结

| 特性 | 旧格式 | 新格式（推荐） |
|------|--------|----------------|
| 命名冲突 | ❌ 有冲突 | ✅ 无冲突 |
| VSCode支持 | ❌ 报错 | ✅ 完美 |
| 代码组织 | ⚠️ 混乱 | ✅ 清晰 |
| 私有方法 | ❌ 无法封装 | ✅ 支持 |
| TypeScript类型 | ⚠️ 基本 | ✅ 完整 |
| 向后兼容 | ✅ 支持 | ✅ 支持 |

**推荐**: 所有新项目使用命名空间格式（`*_namespace.ts`）！
