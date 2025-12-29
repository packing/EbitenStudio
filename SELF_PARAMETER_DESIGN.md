# 脚本参数设计说明 - self优先

## 设计原则

**对JS脚本开发者友好**：去掉抽象的API/接口概念，让开发者感觉直接在操作UI控件本身。

## 核心改进

### 1. 参数命名：`api` → `self`

```typescript
// ❌ 旧设计：api（抽象，需要理解"API"概念）
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    api.setText("Clicked");
}

// ✅ 新设计：self（直观，就是"我自己"）
function onClick(self: UIButton, event: ButtonClickEvent): void {
    self.setText("Clicked");
}
```

**原因**：
- `self`更直观，表示"当前控件自身"
- 类似Python的`self`、JavaScript方法中的`this`概念
- JS开发者无需理解"API"、"接口"等抽象概念

### 2. 参数顺序：`self`在前，`event`在后

```typescript
// ❌ 旧设计：事件在前
function onClick(event: ButtonClickEvent, api: IButtonAPI): void

// ✅ 新设计：主体在前
function onClick(self: UIButton, event: ButtonClickEvent): void
```

**原因**：
- **主体优先**：控件是主角，事件是上下文信息
- **符合直觉**：类似面向对象中"对象.方法(参数)"的思维
- **减少混淆**：明确第一个参数就是"我是谁"

### 3. 类型命名：`IButtonAPI` → `UIButton`

```typescript
// ❌ 旧设计：接口风格（IButtonAPI, ITextInputAPI）
interface IButtonAPI {
    setText(text: string): void;
}

// ✅ 新设计：控件本身（UIButton, UITextInput）
interface UIButton {
    setText(text: string): void;
}
```

**原因**：
- **去掉前缀I**：不需要强调"接口"概念
- **UI前缀**：明确这是UI控件（类似UIKit、Android UI等）
- **更简洁**：`UIButton`比`IButtonAPI`少3个字符，更易读
- **贴近现实**：开发者会想"我在操作按钮"，而不是"我在调用按钮API"

## 完整对比

### 旧设计（抽象）

```typescript
/// <reference path="../script-types.d.ts" />

function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    // event.target 和 api 都指向同一个对象
    console.log(event.target.getID());
    api.setText("Clicked!");
}

function onHover(event: MouseHoverEvent, api: IButtonAPI): void {
    if (event.isEnter) {
        api.setColor(100, 150, 255, 255);
    }
}
```

**问题**：
- ❌ `api`这个词对新手不友好
- ❌ `IButtonAPI`看起来很技术化
- ❌ 事件在前，感觉控件是配角
- ❌ `event.target`和`api`重复，容易混淆

### 新设计（直观）

```typescript
/// <reference path="../script-types.d.ts" />

function onClick(self: UIButton, event: ButtonClickEvent): void {
    // self 就是当前按钮，非常直观
    console.log(self.getID());
    self.setText("Clicked!");
}

function onHover(self: UIButton, event: MouseHoverEvent): void {
    if (event.isEnter) {
        self.setColor(100, 150, 255, 255);
    }
}
```

**优势**：
- ✅ `self`直观易懂，"我自己"
- ✅ `UIButton`贴近UI控件本质
- ✅ 控件在前，主体突出
- ✅ 减少混淆，只关注`self`即可

## 实际应用示例

### 单控件脚本

```typescript
// loginButton.ts
function onClick(self: UIButton, event: ButtonClickEvent): void {
    // 直接操作self，非常自然
    self.setText("登录中...");
    self.setEnabled(false);
    
    // 需要事件信息时才访问event
    if (event.clickCount === 2) {
        console.log("双击登录");
    }
}
```

### 多控件共享脚本

```typescript
// sharedButtonHandler.ts
function onClick(self: UIButton, event: ButtonClickEvent): void {
    // 通过self.getID()区分是哪个按钮
    const buttonId = self.getID();
    
    switch (buttonId) {
        case "saveButton":
            self.setText("保存中...");
            performSave();
            break;
        
        case "cancelButton":
            self.setText("取消中...");
            performCancel();
            break;
    }
}
```

### 表单验证

```typescript
// usernameInput.ts
function onChange(self: UITextInput, event: TextInputChangeEvent): void {
    const username = event.text;
    
    if (username.length < 3) {
        self.setColor(255, 100, 100, 255);  // 红色边框
        showError("用户名太短");
    } else {
        self.setColor(100, 200, 100, 255);  // 绿色边框
    }
}

function onFocus(self: UITextInput, event: FocusEvent): void {
    self.setColor(100, 150, 255, 255);  // 蓝色高亮
}

function onBlur(self: UITextInput, event: BlurEvent): void {
    self.setColor(200, 200, 200, 255);  // 恢复默认
}
```

## 类型层次结构

```
UIWidget (基类)
  ├─ UIButton (按钮)
  ├─ UITextInput (文本输入)
  ├─ UILabel (标签)
  ├─ UIPanel (面板)
  ├─ UIImage (图片)
  ├─ UICheckBox (复选框)
  └─ UISlider (滑动条)
```

所有UI控件都继承自`UIWidget`，提供通用方法：
- `setVisible()`
- `setEnabled()`
- `setPosition()`
- `setSize()`
- `setColor()`
- `getID()`
- `getType()`

## 开发者视角

### 新手角度

```typescript
// ✅ 容易理解："self就是这个按钮，点击时让它变成'已点击'"
function onClick(self: UIButton, event: ButtonClickEvent): void {
    self.setText("已点击");
}
```

```typescript
// ❌ 需要额外理解："api是按钮的API接口对象..."
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    api.setText("已点击");
}
```

### 专业开发者角度

```typescript
// ✅ 简洁高效，一目了然
function onClick(self: UIButton, event: ButtonClickEvent): void {
    self.setEnabled(false);
    performAsyncOperation().then(() => {
        self.setEnabled(true);
    });
}
```

## event.target的角色

虽然参数顺序变了，但`event.target`依然存在：

```typescript
function onClick(self: UIButton, event: ButtonClickEvent): void {
    // self 和 event.target 指向同一个对象
    console.log(self === event.target);  // true
    
    // 推荐用法：直接用self（更简洁）
    self.setText("Clicked");
    
    // 也可以用event.target（传递给工具函数时有用）
    applyAnimation(event.target);
}

function applyAnimation(button: UIButton): void {
    button.setColor(255, 200, 0, 255);
}
```

## 命名规范总结

| 旧设计 | 新设计 | 说明 |
|--------|--------|------|
| `api` | `self` | 参数名 - 表示当前控件 |
| `IButtonAPI` | `UIButton` | 类型名 - 按钮控件 |
| `ITextInputAPI` | `UITextInput` | 类型名 - 文本输入框 |
| `IWidgetAPI` | `UIWidget` | 类型名 - 通用控件基类 |
| `event, api` | `self, event` | 参数顺序 - 主体在前 |

## 向后兼容

如果需要保持旧代码可用，可以在类型定义中保留别名：

```typescript
// 向后兼容的别名
type IButtonAPI = UIButton;
type ITextInputAPI = UITextInput;
type IWidgetAPI = UIWidget;

// 旧代码仍然可以工作（但推荐迁移到新设计）
function onClick(event: ButtonClickEvent, api: IButtonAPI): void {
    api.setText("OK");
}
```

## 总结

新设计的核心优势：

1. **更直观** - `self`比`api`更容易理解
2. **更简洁** - `UIButton`比`IButtonAPI`更易读
3. **更自然** - 主体优先的参数顺序符合直觉
4. **降低门槛** - 减少抽象概念，新手更容易上手
5. **专业感** - `UIButton`、`UITextInput`等命名与iOS/Android等主流框架一致

**设计哲学**：让JS开发者感觉自己在直接操作UI控件，而不是通过某个"API接口"间接操作。
