package ui

import (
	"image"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
)

// WidgetType 控件类型
type WidgetType string

const (
	TypeButton      WidgetType = "button"
	TypeLabel       WidgetType = "label"
	TypeTextInput   WidgetType = "textinput"
	TypeSlider      WidgetType = "slider"
	TypeComboBox    WidgetType = "combobox"
	TypeCheckBox    WidgetType = "checkbox"
	TypeRadioButton WidgetType = "radiobutton"
	TypeImage       WidgetType = "image"
	TypeListView    WidgetType = "listview"
	TypeGridView    WidgetType = "gridview"
	TypeTableView   WidgetType = "tableview"
	TypePanel       WidgetType = "panel"
)

// Spacing 间距结构
type Spacing struct {
	Top    int `json:"top"`
	Right  int `json:"right"`
	Bottom int `json:"bottom"`
	Left   int `json:"left"`
}

// RGBA 颜色结构 (0-255)
type RGBA struct {
	R uint8 `json:"r"`
	G uint8 `json:"g"`
	B uint8 `json:"b"`
	A uint8 `json:"a"`
}

// ToColor 转换为 color.RGBA
func (c RGBA) ToColor() color.RGBA {
	return color.RGBA{R: c.R, G: c.G, B: c.B, A: c.A}
}

// Widget 控件基础接口
type Widget interface {
	// 基础属性
	GetID() string
	GetType() WidgetType
	GetParentID() string

	// 位置和尺寸
	GetBounds() image.Rectangle
	SetBounds(rect image.Rectangle)
	GetX() int
	GetY() int
	GetWidth() int
	GetHeight() int

	// 层级和可见性
	GetZIndex() int
	SetZIndex(z int)
	IsVisible() bool
	SetVisible(visible bool)
	IsInteractive() bool
	SetInteractive(interactive bool)

	// 样式
	GetPadding() Spacing
	GetMargin() Spacing
	GetBackgroundColor() RGBA
	GetBackgroundImage() *ebiten.Image
	GetBorderWidth() int
	GetBorderColor() RGBA
	GetBorderRadius() int
	GetOpacity() int // 0-100

	// 渲染
	Update() error
	Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int)

	// 子控件管理
	AddChild(child Widget)
	RemoveChild(id string)
	GetChildren() []Widget

	// 事件处理
	OnClick(x, y int) bool
	OnHover(x, y int) bool
}

// BaseWidget 控件基础实现
type BaseWidget struct {
	ID       string     `json:"id"`
	Type     WidgetType `json:"type"`
	ParentID string     `json:"parentId"`

	// 位置和尺寸
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`

	// 锚点定位系统
	PositionMode string `json:"positionMode"` // "absolute" 或 "anchor"
	AnchorX      string `json:"anchorX"`      // "left", "center", "right"
	AnchorY      string `json:"anchorY"`      // "top", "middle", "bottom"
	OffsetX      int    `json:"offsetX"`      // 距离锚点的偏移
	OffsetY      int    `json:"offsetY"`

	// 边界锚定系统（控制尺寸响应）
	AnchorLeft   bool `json:"anchorLeft"`   // 锚定左边
	AnchorRight  bool `json:"anchorRight"`  // 锚定右边
	AnchorTop    bool `json:"anchorTop"`    // 锚定上边
	AnchorBottom bool `json:"anchorBottom"` // 锚定下边

	// 设计时边距（用于计算响应式尺寸）
	DesignMarginRight  int `json:"designMarginRight"`  // 设计时右边距
	DesignMarginBottom int `json:"designMarginBottom"` // 设计时底边距

	// 层级和可见性
	ZIndex      int  `json:"zIndex"`
	Visible     bool `json:"visible"`
	Interactive bool `json:"interactive"`

	// 样式
	Padding         Spacing `json:"padding"`
	Margin          Spacing `json:"margin"`
	BackgroundColor RGBA    `json:"backgroundColor"`
	BackgroundAlpha uint8   `json:"backgroundColorAlpha"`
	BorderWidth     int     `json:"borderWidth"`
	BorderColor     RGBA    `json:"borderColor"`
	BorderAlpha     uint8   `json:"borderColorAlpha"`
	BorderRadius    int     `json:"borderRadius"`
	Opacity         int     `json:"opacity"` // 0-100

	// 背景资源
	BackgroundResourceID string `json:"backgroundResourceId"`
	backgroundImage      *ebiten.Image

	// 子控件
	Children []Widget `json:"-"`
}

// GetID 实现接口
func (w *BaseWidget) GetID() string {
	return w.ID
}

func (w *BaseWidget) GetType() WidgetType {
	return w.Type
}

func (w *BaseWidget) GetParentID() string {
	return w.ParentID
}

func (w *BaseWidget) GetBounds() image.Rectangle {
	return image.Rect(w.X, w.Y, w.X+w.Width, w.Y+w.Height)
}

func (w *BaseWidget) SetBounds(rect image.Rectangle) {
	w.X = rect.Min.X
	w.Y = rect.Min.Y
	w.Width = rect.Dx()
	w.Height = rect.Dy()
}

func (w *BaseWidget) GetX() int      { return w.X }
func (w *BaseWidget) GetY() int      { return w.Y }
func (w *BaseWidget) GetWidth() int  { return w.Width }
func (w *BaseWidget) GetHeight() int { return w.Height }

func (w *BaseWidget) GetZIndex() int  { return w.ZIndex }
func (w *BaseWidget) SetZIndex(z int) { w.ZIndex = z }

func (w *BaseWidget) IsVisible() bool         { return w.Visible }
func (w *BaseWidget) SetVisible(visible bool) { w.Visible = visible }

func (w *BaseWidget) IsInteractive() bool             { return w.Interactive }
func (w *BaseWidget) SetInteractive(interactive bool) { w.Interactive = interactive }

func (w *BaseWidget) GetPadding() Spacing { return w.Padding }
func (w *BaseWidget) GetMargin() Spacing  { return w.Margin }

func (w *BaseWidget) GetBackgroundColor() RGBA {
	return RGBA{
		R: w.BackgroundColor.R,
		G: w.BackgroundColor.G,
		B: w.BackgroundColor.B,
		A: w.BackgroundAlpha,
	}
}

func (w *BaseWidget) GetBackgroundImage() *ebiten.Image {
	return w.backgroundImage
}

func (w *BaseWidget) GetBorderWidth() int { return w.BorderWidth }

func (w *BaseWidget) GetBorderColor() RGBA {
	return RGBA{
		R: w.BorderColor.R,
		G: w.BorderColor.G,
		B: w.BorderColor.B,
		A: w.BorderAlpha,
	}
}

func (w *BaseWidget) GetBorderRadius() int { return w.BorderRadius }
func (w *BaseWidget) GetOpacity() int      { return w.Opacity }

func (w *BaseWidget) AddChild(child Widget) {
	w.Children = append(w.Children, child)
}

func (w *BaseWidget) RemoveChild(id string) {
	for i, child := range w.Children {
		if child.GetID() == id {
			w.Children = append(w.Children[:i], w.Children[i+1:]...)
			break
		}
	}
}

func (w *BaseWidget) GetChildren() []Widget {
	return w.Children
}

// Update 默认更新实现
func (w *BaseWidget) Update() error {
	for _, child := range w.Children {
		if err := child.Update(); err != nil {
			return err
		}
	}
	return nil
}

// Draw 默认绘制实现
func (w *BaseWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !w.Visible {
		return
	}

	// 计算实际位置（支持锚点）
	localX, localY := w.CalculatePosition(parentWidth, parentHeight)
	absX := parentX + localX
	absY := parentY + localY

	// 绘制子控件
	for _, child := range w.Children {
		child.Draw(screen, absX, absY, w.Width, w.Height)
	}
}

// DrawChildren 绘制子控件（供容器控件使用）
func (w *BaseWidget) DrawChildren(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !w.Visible {
		return
	}

	// 绘制所有子控件，传递当前容器的尺寸信息
	for _, child := range w.Children {
		child.Draw(screen, parentX, parentY, parentWidth, parentHeight)
	}
}

// OnClick 默认点击处理
func (w *BaseWidget) OnClick(x, y int) bool {
	if !w.Interactive {
		return false
	}

	// 检查是否在控件范围内
	bounds := w.GetBounds()
	pt := image.Pt(x, y)
	return pt.In(bounds)
}

// OnHover 默认悬停处理
func (w *BaseWidget) OnHover(x, y int) bool {
	if !w.Interactive {
		return false
	}

	bounds := w.GetBounds()
	pt := image.Pt(x, y)
	return pt.In(bounds)
}

// CalculatePosition 根据定位模式计算实际坐标
// parentWidth, parentHeight 为父容器的尺寸
func (w *BaseWidget) CalculatePosition(parentWidth, parentHeight int) (int, int) {
	if w.PositionMode == "anchor" {
		// 锚点模式：根据锚点和偏移计算实际坐标
		anchorX := 0
		anchorY := 0

		// 计算水平锚点位置
		switch w.AnchorX {
		case "left":
			anchorX = 0
		case "center":
			anchorX = parentWidth / 2
		case "right":
			anchorX = parentWidth
		default:
			anchorX = 0
		}

		// 计算垂直锚点位置
		switch w.AnchorY {
		case "top":
			anchorY = 0
		case "middle":
			anchorY = parentHeight / 2
		case "bottom":
			anchorY = parentHeight
		default:
			anchorY = 0
		}

		// 返回锚点位置 + 偏移
		return anchorX + w.OffsetX, anchorY + w.OffsetY
	}

	// 绝对定位模式：直接使用 X, Y
	return w.X, w.Y
}

// CalculateSize 根据边界锚定计算响应式尺寸
// parentWidth, parentHeight: 父容器尺寸
// localX, localY: 控件在父容器中的局部坐标
// 返回: 计算后的宽度和高度
func (w *BaseWidget) CalculateSize(parentWidth, parentHeight, localX, localY int) (int, int) {
	width := w.Width
	height := w.Height

	// 如果锚定了右边，计算响应式宽度
	if w.AnchorRight {
		// 新宽度 = 父容器宽度 - 控件X坐标 - 设计时右边距
		width = parentWidth - localX - w.DesignMarginRight
		if width < 0 {
			width = 0
		}
	}

	// 如果锚定了底边，计算响应式高度
	if w.AnchorBottom {
		// 新高度 = 父容器高度 - 控件Y坐标 - 设计时底边距
		height = parentHeight - localY - w.DesignMarginBottom
		if height < 0 {
			height = 0
		}
	}

	return width, height
}
