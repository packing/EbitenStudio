# Padding 和 Margin 功能测试指南

## 重构完成 ✅

已成功将控件系统从松散耦合的对象字面量重构为面向对象的类继承体系，并添加了 padding 和 margin 属性。

## 测试步骤

### 1. 启动应用
应用应该已经在运行。如果没有：
```powershell
cd H:\e_code_backup\github\repo\EbitenStudio\frontend
npm start
```

### 2. 测试控件创建
- 点击工具栏上的任意控件按钮（按钮、标签、输入框等）
- 在画布上点击创建控件
- **期望结果**: 控件成功创建并显示

### 3. 测试 Padding 功能
1. 选中一个控件（如按钮）
2. 在右侧属性面板找到 **"内边距 (Padding)"** 区域
3. 修改值:
   - 上: 10
   - 右: 15
   - 下: 10
   - 左: 15
4. **期望结果**: 
   - 控件内容（文字）与边框保持指定的内边距
   - 文字区域变小，但控件整体尺寸不变

### 4. 测试 Margin 功能
1. 选中控件
2. 在属性面板找到 **"外边距 (Margin)"** 区域
3. 修改值:
   - 上: 5
   - 右: 5
   - 下: 5
   - 左: 5
4. **期望结果**: 
   - Margin 目前预留用于未来的布局功能
   - 属性已保存，但视觉上暂无变化

### 5. 测试背景和边框
为了更好地看到 padding 效果:
1. 设置控件背景颜色（如红色）
2. 设置边框宽度为 2，边框颜色为黑色
3. 设置 padding 为 10
4. **期望结果**: 文字与边框之间有明显的红色背景间隔

### 6. 测试保存和加载
1. 创建几个控件并设置不同的 padding/margin
2. 保存项目 (File → Save)
3. 关闭应用并重新打开
4. 加载刚才保存的项目 (File → Open)
5. **期望结果**: 
   - 所有控件正常加载
   - Padding 和 margin 值保持不变
   - 控件显示正确

### 7. 测试不同控件类型
为以下控件测试 padding:
- ✅ Button (按钮)
- ✅ Label (标签)
- ✅ TextInput (输入框)
- ✅ Slider (滑动条)
- ✅ Image (图片)
- ✅ ListBox (列表框)
- ✅ GridView (网格视图)
- ✅ Panel (面板)

## 开发者控制台检查

按 F12 或 Ctrl+Shift+I 打开开发者控制台，检查：
- ❌ 无 JavaScript 错误
- ✅ 控件创建时输出: "Widget created at: ..."
- ✅ 属性修改时输出: "Padding updated: ..." 或 "Margin updated: ..."

## 架构验证

在控制台中执行以下命令验证类系统:
```javascript
// 检查 Widget 基类存在
console.log(Widget);

// 检查子类存在
console.log(ButtonWidget);
console.log(LabelWidget);

// 检查当前控件列表
console.log(app.widgets);

// 检查第一个控件是否为类实例
console.log(app.widgets[0] instanceof Widget);

// 检查 padding 和 margin
console.log(app.widgets[0].padding);
console.log(app.widgets[0].margin);
```

## 预期输出示例

```javascript
// 控件应该是类实例
app.widgets[0]
// ButtonWidget {
//   id: "button1",
//   type: "button",
//   x: 100, y: 100,
//   width: 120, height: 40,
//   padding: { top: 0, right: 0, bottom: 0, left: 0 },
//   margin: { top: 0, right: 0, bottom: 0, left: 0 },
//   ...
// }

// toJSON 应该返回普通对象
app.widgets[0].toJSON()
// {
//   id: "button1",
//   type: "button",
//   x: 100, y: 100,
//   padding: { top: 0, right: 0, bottom: 0, left: 0 },
//   ...
// }
```

## 已知问题和限制

1. **Margin 未实现视觉效果**: Margin 属性已添加但未用于渲染，预留用于未来的自动布局功能
2. **向后兼容**: 旧项目文件会自动转换为新的类实例
3. **性能**: 对于大量控件，类实例可能比普通对象稍慢（可忽略）

## 如果遇到问题

### 控件无法创建
- 检查控制台是否有错误
- 确认 `widgets/base.js` 和 `widgets/types.js` 已加载
- 检查 `index.html` 中的 script 标签顺序

### Padding 不生效
- 确认控件有背景色或边框（否则看不出效果）
- 检查控件是否有文本内容
- 查看控制台是否有 "Padding updated" 日志

### 项目加载失败
- 检查 `Widget.fromJSON()` 是否正确调用
- 确认 `app.js` 中的反序列化逻辑已更新
- 尝试在控制台手动执行: `Widget.fromJSON(app.widgets[0].toJSON())`

## 文件清单

### 新增文件
- `frontend/src/js/widgets/base.js` - Widget 基类
- `frontend/src/js/widgets/types.js` - 8 个控件子类

### 修改文件
- `frontend/src/js/toolbar.js` - 控件创建重构
- `frontend/src/js/canvas-renderer.js` - 渲染重构
- `frontend/src/js/properties.js` - 添加 padding/margin UI
- `frontend/src/js/app.js` - 序列化/反序列化更新
- `frontend/src/index.html` - 添加 script 引用

## 后续改进建议

1. **Margin 布局实现**: 实现自动布局引擎，利用 margin 计算控件间距
2. **快捷输入**: 添加统一 padding 设置（如输入 "10" 自动应用到四边）
3. **可视化调整**: 在画布上拖拽调整 padding
4. **撤销/重做**: 为 padding/margin 修改添加历史记录
5. **CSS 盒模型可视化**: 在选中控件时显示 margin/border/padding/content 的盒模型图示
