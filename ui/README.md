# Ebiten UI Library

基于 Ebiten 游戏引擎的 UI 库，用于渲染编辑器导出的 UI 布局。

## 目录结构

```
ui/
├── widget.go           # Widget 基类接口和通用实现
├── button.go          # 按钮控件
├── label.go           # 标签控件
├── textinput.go       # 文本输入框
├── slider.go          # 滑动条
├── image.go           # 图像控件
├── listbox.go         # 列表框
├── gridview.go        # 网格视图
├── panel.go           # 面板容器
├── renderer.go        # 渲染器
├── loader.go          # 加载器(从JSON加载UI)
└── examples/
    └── viewer/        # 预览器应用
        └── main.go
```

## 核心设计

### Widget 接口
所有控件实现统一的接口，支持:
- 位置、尺寸、层级
- Padding、Margin
- 背景色(RGBA)、背景图片(含9-patch)
- 边框、圆角
- 透明度
- 三态支持(按钮、输入框)

### 渲染流程
1. 应用 Margin 偏移
2. 创建圆角裁剪区域
3. 绘制背景(纯色或图片)
4. 绘制边框
5. 绘制内容(子类实现)
6. 绘制选中/悬停效果

### 9-Patch 支持
根据资源的切片信息自动判断是否使用9-patch渲染。

## 使用示例

```go
// 从JSON加载UI
ui, err := ui.LoadFromJSON("layout.json")
if err != nil {
    log.Fatal(err)
}

// 在游戏循环中更新和绘制
func (g *Game) Update() error {
    ui.Update()
    return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
    ui.Draw(screen)
}
```
