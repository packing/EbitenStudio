package ui

import (
	"image"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
)

// ButtonState 按钮状态
type ButtonState string

const (
	ButtonStateNormal   ButtonState = "normal"
	ButtonStatePressed  ButtonState = "pressed"
	ButtonStateDisabled ButtonState = "disabled"
)

// ButtonWidget 按钮控件
type ButtonWidget struct {
	BaseWidget

	// 三态背景颜色
	BackgroundColorNormal        RGBA  `json:"backgroundColorNormal"`
	BackgroundColorNormalAlpha   uint8 `json:"backgroundColorNormalAlpha"`
	BackgroundColorPressed       RGBA  `json:"backgroundColorPressed"`
	BackgroundColorPressedAlpha  uint8 `json:"backgroundColorPressedAlpha"`
	BackgroundColorDisabled      RGBA  `json:"backgroundColorDisabled"`
	BackgroundColorDisabledAlpha uint8 `json:"backgroundColorDisabledAlpha"`

	// 三态背景资源
	BackgroundResourceNormal   string `json:"backgroundResourceNormal"`
	BackgroundResourcePressed  string `json:"backgroundResourcePressed"`
	BackgroundResourceDisabled string `json:"backgroundResourceDisabled"`

	backgroundImageNormal   *ebiten.Image
	backgroundImagePressed  *ebiten.Image
	backgroundImageDisabled *ebiten.Image

	// 文本属性
	Text           string `json:"text"`
	TextColor      RGBA   `json:"textColor"`
	TextColorAlpha uint8  `json:"textColorAlpha"`
	FontSize       int    `json:"fontSize"`
	TextAlignment  string `json:"textAlignment"` // left, center, right

	// 状态
	CurrentState ButtonState
	Enabled      bool

	// 字体
	Font font.Face
}

// NewButton 创建按钮
func NewButton(id string) *ButtonWidget {
	return &ButtonWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeButton,
			Visible:     true,
			Interactive: true,
			Width:       120,
			Height:      40,
			Opacity:     100,
		},
		BackgroundColorNormal:        RGBA{66, 135, 245, 255},
		BackgroundColorNormalAlpha:   255,
		BackgroundColorPressed:       RGBA{54, 112, 217, 255},
		BackgroundColorPressedAlpha:  255,
		BackgroundColorDisabled:      RGBA{153, 153, 153, 255},
		BackgroundColorDisabledAlpha: 255,
		Text:                         "Button",
		TextColor:                    RGBA{255, 255, 255, 255},
		TextColorAlpha:               255,
		FontSize:                     16,
		TextAlignment:                "center",
		CurrentState:                 ButtonStateNormal,
		Enabled:                      true,
		Font:                         basicfont.Face7x13,
	}
}

// GetStateBackground 获取当前状态的背景属性
func (b *ButtonWidget) GetStateBackground() (RGBA, *ebiten.Image) {
	if !b.Enabled {
		bgColor := RGBA{
			R: b.BackgroundColorDisabled.R,
			G: b.BackgroundColorDisabled.G,
			B: b.BackgroundColorDisabled.B,
			A: b.BackgroundColorDisabledAlpha,
		}
		return bgColor, b.backgroundImageDisabled
	}

	if b.CurrentState == ButtonStatePressed {
		bgColor := RGBA{
			R: b.BackgroundColorPressed.R,
			G: b.BackgroundColorPressed.G,
			B: b.BackgroundColorPressed.B,
			A: b.BackgroundColorPressedAlpha,
		}
		return bgColor, b.backgroundImagePressed
	}

	bgColor := RGBA{
		R: b.BackgroundColorNormal.R,
		G: b.BackgroundColorNormal.G,
		B: b.BackgroundColorNormal.B,
		A: b.BackgroundColorNormalAlpha,
	}
	return bgColor, b.backgroundImageNormal
}

// Update 更新按钮状态
func (b *ButtonWidget) Update() error {
	// 处理鼠标交互
	if b.Interactive && b.Enabled {
		x, y := ebiten.CursorPosition()
		if b.OnHover(x, y) {
			if ebiten.IsMouseButtonPressed(ebiten.MouseButtonLeft) {
				b.CurrentState = ButtonStatePressed
			} else {
				b.CurrentState = ButtonStateNormal
			}
		} else {
			b.CurrentState = ButtonStateNormal
		}
	}

	return b.BaseWidget.Update()
}

// Draw 绘制按钮
func (b *ButtonWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !b.Visible {
		return
	}

	// 计算实际位置（支持锚点）
	localX, localY := b.CalculatePosition(parentWidth, parentHeight)
	absX := parentX + localX
	absY := parentY + localY

	// 计算响应式尺寸（支持边界锚定）
	renderWidth, renderHeight := b.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 绘制背景和边框
	bgColor, bgImage := b.GetStateBackground()

	// 临时创建一个图像用于绘制按钮
	btnImage := ebiten.NewImage(renderWidth, renderHeight)

	// 绘制背景
	if bgColor.A > 0 {
		btnImage.Fill(bgColor.ToColor())
	}

	if bgImage != nil {
		op := &ebiten.DrawImageOptions{}
		srcW, srcH := bgImage.Size()
		scaleX := float64(renderWidth) / float64(srcW)
		scaleY := float64(renderHeight) / float64(srcH)
		op.GeoM.Scale(scaleX, scaleY)
		btnImage.DrawImage(bgImage, op)
	}

	// 绘制边框
	if b.BorderWidth > 0 {
		// TODO: 实现边框绘制
	}

	// 绘制文本
	if b.Text != "" {
		b.drawText(btnImage)
	}

	// 将按钮绘制到屏幕
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(float64(absX), float64(absY))

	// 应用透明度
	if b.Opacity < 100 {
		op.ColorScale.ScaleAlpha(float32(b.Opacity) / 100.0)
	}

	screen.DrawImage(btnImage, op)

	// 绘制子控件
	b.BaseWidget.DrawChildren(screen, absX, absY, renderWidth, renderHeight)
}

// drawText 绘制文本
func (b *ButtonWidget) drawText(dst *ebiten.Image) {
	if b.Font == nil {
		b.Font = basicfont.Face7x13
	}

	textColor := color.RGBA{
		R: b.TextColor.R,
		G: b.TextColor.G,
		B: b.TextColor.B,
		A: b.TextColorAlpha,
	}

	// 计算文本位置
	bounds := text.BoundString(b.Font, b.Text)
	textWidth := bounds.Dx()

	var textX, textY int

	// 水平对齐
	switch b.TextAlignment {
	case "left":
		textX = b.BaseWidget.Padding.Left
	case "right":
		textX = b.BaseWidget.Width - textWidth - b.BaseWidget.Padding.Right
	default: // center
		textX = (b.BaseWidget.Width - textWidth) / 2
	}

	// 垂直居中 - 修正基线偏移
	// bounds.Min.Y 通常是负值（基线之上），bounds.Max.Y 是正值（基线之下）
	// 真正的文本高度应该用 bounds.Max.Y - bounds.Min.Y
	textY = b.BaseWidget.Height/2 - bounds.Min.Y - (bounds.Max.Y-bounds.Min.Y)/2

	text.Draw(dst, b.Text, b.Font, textX, textY, textColor)
}

// OnClick 处理点击事件
func (b *ButtonWidget) OnClick(x, y int) bool {
	if !b.Interactive || !b.Enabled {
		return false
	}

	bounds := image.Rect(b.X, b.Y, b.X+b.Width, b.Y+b.Height)
	pt := image.Pt(x, y)

	if pt.In(bounds) {
		// 触发点击事件
		return true
	}

	return false
}

// SetEnabled 设置启用状态
func (b *ButtonWidget) SetEnabled(enabled bool) {
	b.Enabled = enabled
	if !enabled {
		b.CurrentState = ButtonStateDisabled
	} else {
		b.CurrentState = ButtonStateNormal
	}
}

// SetText 设置文本
func (b *ButtonWidget) SetText(text string) {
	b.Text = text
}
