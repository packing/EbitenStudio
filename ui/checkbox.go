package ui

import (
	"image"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"golang.org/x/image/font/basicfont"
)

// CheckBoxWidget 复选框控件
type CheckBoxWidget struct {
	BaseWidget

	// 文本属性
	Text           string `json:"text"`           // 标签文本
	TextColor      RGBA   `json:"textColor"`      // 文本颜色
	TextColorAlpha uint8  `json:"textColorAlpha"` // 文本透明度
	FontSize       int    `json:"fontSize"`       // 字体大小

	// 复选框尺寸
	BoxSize int `json:"boxSize"` // 复选框尺寸

	// 外观颜色
	BoxBgColor          RGBA  `json:"boxBgColor"`          // 复选框背景色
	BoxBgColorAlpha     uint8 `json:"boxBgColorAlpha"`     // 背景透明度
	BoxBorderColor      RGBA  `json:"boxBorderColor"`      // 边框颜色
	BoxBorderColorAlpha uint8 `json:"boxBorderColorAlpha"` // 边框透明度
	BoxBorderWidth      int   `json:"boxBorderWidth"`      // 边框宽度

	// 选中时颜色
	CheckedBgColor      RGBA  `json:"checkedBgColor"`      // 选中时背景色
	CheckedBgColorAlpha uint8 `json:"checkedBgColorAlpha"` // 选中时背景透明度
	CheckMarkColor      RGBA  `json:"checkMarkColor"`      // 对勾颜色
	CheckMarkColorAlpha uint8 `json:"checkMarkColorAlpha"` // 对勾透明度

	// 状态
	Checked bool `json:"checked"` // 是否选中
	Enabled bool `json:"enabled"` // 是否启用
}

// NewCheckBox 创建复选框
func NewCheckBox(id string, x, y, width, height int) *CheckBoxWidget {
	return &CheckBoxWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeCheckBox,
			X:           x,
			Y:           y,
			Width:       width,
			Height:      height,
			Visible:     true,
			Interactive: true,
		},
		Text:                "复选框",
		TextColor:           RGBA{R: 51, G: 51, B: 51},
		TextColorAlpha:      255,
		FontSize:            14,
		BoxSize:             18,
		BoxBgColor:          RGBA{R: 255, G: 255, B: 255},
		BoxBgColorAlpha:     255,
		BoxBorderColor:      RGBA{R: 180, G: 180, B: 180},
		BoxBorderColorAlpha: 255,
		BoxBorderWidth:      1,
		CheckedBgColor:      RGBA{R: 70, G: 130, B: 180},
		CheckedBgColorAlpha: 255,
		CheckMarkColor:      RGBA{R: 255, G: 255, B: 255},
		CheckMarkColorAlpha: 255,
		Checked:             false,
		Enabled:             true,
	}
}

// Draw 绘制复选框
func (c *CheckBoxWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !c.Visible {
		return
	}

	// 计算实际位置
	localX, localY := c.CalculatePosition(parentWidth, parentHeight)
	x := parentX + localX
	y := parentY + localY

	// 计算响应式尺寸
	_, height := c.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 绘制复选框
	boxY := y + (height-c.BoxSize)/2
	c.drawBox(screen, x, boxY, c.BoxSize)

	// 如果选中，绘制对勾
	if c.Checked {
		c.drawCheckMark(screen, x, boxY, c.BoxSize)
	}

	// 绘制文本标签
	if c.Text != "" {
		textX := x + c.BoxSize + 8
		textY := y + height/2
		c.drawText(screen, textX, textY)
	}
}

// drawBox 绘制复选框
func (c *CheckBoxWidget) drawBox(screen *ebiten.Image, x, y, size int) {
	// 确定背景色
	bgColor := color.RGBA{
		R: c.BoxBgColor.R,
		G: c.BoxBgColor.G,
		B: c.BoxBgColor.B,
		A: c.BoxBgColorAlpha,
	}

	if c.Checked {
		bgColor = color.RGBA{
			R: c.CheckedBgColor.R,
			G: c.CheckedBgColor.G,
			B: c.CheckedBgColor.B,
			A: c.CheckedBgColorAlpha,
		}
	}

	if !c.Enabled {
		bgColor.A = 128
	}

	// 绘制背景
	bounds := image.Rect(x, y, x+size, y+size)
	for py := bounds.Min.Y; py < bounds.Max.Y; py++ {
		for px := bounds.Min.X; px < bounds.Max.X; px++ {
			screen.Set(px, py, bgColor)
		}
	}

	// 绘制边框
	if c.BoxBorderWidth > 0 {
		borderColor := color.RGBA{
			R: c.BoxBorderColor.R,
			G: c.BoxBorderColor.G,
			B: c.BoxBorderColor.B,
			A: c.BoxBorderColorAlpha,
		}

		if !c.Enabled {
			borderColor.A = 128
		}

		for i := 0; i < c.BoxBorderWidth; i++ {
			// 上边
			for px := x; px < x+size; px++ {
				screen.Set(px, y+i, borderColor)
			}
			// 下边
			for px := x; px < x+size; px++ {
				screen.Set(px, y+size-1-i, borderColor)
			}
			// 左边
			for py := y; py < y+size; py++ {
				screen.Set(x+i, py, borderColor)
			}
			// 右边
			for py := y; py < y+size; py++ {
				screen.Set(x+size-1-i, py, borderColor)
			}
		}
	}
}

// drawCheckMark 绘制对勾
func (c *CheckBoxWidget) drawCheckMark(screen *ebiten.Image, x, y, size int) {
	checkColor := color.RGBA{
		R: c.CheckMarkColor.R,
		G: c.CheckMarkColor.G,
		B: c.CheckMarkColor.B,
		A: c.CheckMarkColorAlpha,
	}

	if !c.Enabled {
		checkColor.A = 128
	}

	// 绘制对勾（简化版：两条线段）
	// 第一段：从左下到中间
	centerX := x + size/2
	centerY := y + size/2

	// 短竖线（左侧）
	for i := 0; i < 3; i++ {
		for j := 0; j < size/3; j++ {
			screen.Set(centerX-2+i, centerY+j, checkColor)
		}
	}

	// 长斜线（右侧）
	for i := 0; i < size/2; i++ {
		for j := 0; j < 3; j++ {
			screen.Set(centerX+i, centerY-i+j, checkColor)
		}
	}
}

// drawText 绘制文本标签
func (c *CheckBoxWidget) drawText(screen *ebiten.Image, x, y int) {
	face := basicfont.Face7x13
	textColor := color.RGBA{
		R: c.TextColor.R,
		G: c.TextColor.G,
		B: c.TextColor.B,
		A: c.TextColorAlpha,
	}

	if !c.Enabled {
		textColor.A = 128
	}

	text.Draw(screen, c.Text, face, x, y+4, textColor)
}

// Toggle 切换选中状态
func (c *CheckBoxWidget) Toggle() {
	if c.Enabled {
		c.Checked = !c.Checked
	}
}

// SetChecked 设置选中状态
func (c *CheckBoxWidget) SetChecked(checked bool) {
	c.Checked = checked
}

// IsChecked 获取选中状态
func (c *CheckBoxWidget) IsChecked() bool {
	return c.Checked
}

// Update 更新复选框状态
func (c *CheckBoxWidget) Update() error {
	// TODO: 处理鼠标交互
	return nil
}
