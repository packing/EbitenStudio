package ui

import (
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
)

// LabelWidget 标签控件
type LabelWidget struct {
	BaseWidget

	// 文本属性
	Text           string `json:"text"`
	TextColor      RGBA   `json:"textColor"`
	TextColorAlpha uint8  `json:"textColorAlpha"`
	FontSize       int    `json:"fontSize"`
	TextAlignment  string `json:"textAlignment"` // left, center, right
	VerticalAlign  string `json:"verticalAlign"` // top, middle, bottom
	WordWrap       bool   `json:"wordWrap"`

	// 字体
	Font font.Face
}

// NewLabel 创建标签
func NewLabel(id string) *LabelWidget {
	return &LabelWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeLabel,
			Visible:     true,
			Interactive: false,
			Width:       100,
			Height:      30,
			Opacity:     100,
		},
		Text:           "Label",
		TextColor:      RGBA{255, 255, 255, 255},
		TextColorAlpha: 255,
		FontSize:       14,
		TextAlignment:  "left",
		VerticalAlign:  "middle",
		WordWrap:       false,
		Font:           basicfont.Face7x13,
	}
}

// Draw 绘制标签
func (l *LabelWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !l.Visible {
		return
	}

	// 计算实际位置（支持锚点）
	localX, localY := l.CalculatePosition(parentWidth, parentHeight)
	absX := parentX + localX
	absY := parentY + localY

	// 绘制背景（如果有）
	if l.BackgroundAlpha > 0 || l.backgroundImage != nil {
		lblImage := ebiten.NewImage(l.Width, l.Height)

		// 背景颜色
		if l.BackgroundAlpha > 0 {
			bgColor := RGBA{
				R: l.BackgroundColor.R,
				G: l.BackgroundColor.G,
				B: l.BackgroundColor.B,
				A: l.BackgroundAlpha,
			}
			lblImage.Fill(bgColor.ToColor())
		}

		// 背景图片
		if l.backgroundImage != nil {
			op := &ebiten.DrawImageOptions{}
			srcW, srcH := l.backgroundImage.Size()
			scaleX := float64(l.Width) / float64(srcW)
			scaleY := float64(l.Height) / float64(srcH)
			op.GeoM.Scale(scaleX, scaleY)
			lblImage.DrawImage(l.backgroundImage, op)
		}

		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(float64(absX), float64(absY))
		screen.DrawImage(lblImage, op)
	}

	// 绘制文本
	if l.Text != "" {
		l.drawText(screen, absX, absY)
	}

	// 计算响应式尺寸（支持边界锚定）
	renderWidth, renderHeight := l.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 绘制子控件
	l.BaseWidget.DrawChildren(screen, absX, absY, renderWidth, renderHeight)
}

// drawText 绘制文本
func (l *LabelWidget) drawText(dst *ebiten.Image, x, y int) {
	if l.Font == nil {
		l.Font = basicfont.Face7x13
	}

	textColor := color.RGBA{
		R: l.TextColor.R,
		G: l.TextColor.G,
		B: l.TextColor.B,
		A: l.TextColorAlpha,
	}

	// 计算文本位置
	bounds := text.BoundString(l.Font, l.Text)
	textWidth := bounds.Dx()

	var textX, textY int

	// 水平对齐
	switch l.TextAlignment {
	case "left":
		textX = x + l.BaseWidget.Padding.Left
	case "right":
		textX = x + l.BaseWidget.Width - textWidth - l.BaseWidget.Padding.Right
	case "center":
		textX = x + (l.BaseWidget.Width-textWidth)/2
	default:
		textX = x + l.BaseWidget.Padding.Left
	}

	// 垂直对齐 - 修正基线偏移
	switch l.VerticalAlign {
	case "top":
		textY = y + l.BaseWidget.Padding.Top - bounds.Min.Y
	case "bottom":
		textY = y + l.BaseWidget.Height - l.BaseWidget.Padding.Bottom - bounds.Max.Y
	case "middle":
		// 真正的文本高度 = bounds.Max.Y - bounds.Min.Y
		textY = y + l.BaseWidget.Height/2 - bounds.Min.Y - (bounds.Max.Y-bounds.Min.Y)/2
	default:
		textY = y + l.BaseWidget.Height/2 - bounds.Min.Y - (bounds.Max.Y-bounds.Min.Y)/2
	}

	text.Draw(dst, l.Text, l.Font, textX, textY, textColor)
}

// SetText 设置文本
func (l *LabelWidget) SetText(text string) {
	l.Text = text
}
