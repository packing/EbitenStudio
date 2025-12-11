# Ebiten UI Viewer

UI预览器，用于加载和显示Ebiten UI编辑器导出的JSON布局文件。

## 功能特性

- 加载JSON格式的UI布局文件
- 实时预览UI效果
- 支持所有UI控件类型：Button、Label、TextInput、Slider、Image、ListBox、GridView、Panel
- 支持三态背景（Button和TextInput）
- 支持RGBA颜色（0-255 alpha）
- 支持圆角矩形和完美圆形
- 支持鼠标交互

## 使用方法

### 运行默认UI

```bash
go run main.go
```

### 加载自定义UI布局

```bash
go run main.go -layout path/to/layout.json
```

## 默认UI示例

运行不带参数时，会显示一个包含以下控件的测试UI：

- 标题标签
- 普通按钮
- 禁用按钮
- 文本输入框
- 信息标签
- 圆形按钮（128×128，圆角64，展示完美圆形）

## 编译

```bash
go build -o viewer.exe
```

## 键盘快捷键

- `ESC` - 退出程序（在文本输入框中时取消焦点）

## 系统要求

- Go 1.21+
- Ebiten v2.6.3+
