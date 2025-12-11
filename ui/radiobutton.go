package ui

import (
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"golang.org/x/image/font/basicfont"
)

// RadioButtonWidget 单选按钮控件
type RadioButtonWidget struct {
	BaseWidget

	// 文本属性
	Text           string `json:"text"`           // 标签文本
	TextColor      RGBA   `json:"textColor"`      // 文本颜色
	TextColorAlpha uint8  `json:"textColorAlpha"` // 文本透明度
	FontSize       int    `json:"fontSize"`       // 字体大小

	// 单选按钮尺寸
	ButtonSize int `json:"buttonSize"` // 单选按钮尺寸（圆形直径）

	// 外观颜色
	ButtonBgColor      RGBA  `json:"buttonBgColor"`      // 按钮背景色
	ButtonBgColorAlpha uint8 `json:"buttonBgColorAlpha"` // 背景透明度
	BorderColor        RGBA  `json:"borderColor"`        // 边框颜色
	BorderColorAlpha   uint8 `json:"borderColorAlpha"`   // 边框透明度
	BorderWidth        int   `json:"borderWidth"`        // 边框宽度

	// 选中时颜色
	SelectedBgColor      RGBA  `json:"selectedBgColor"`      // 选中时背景色
	SelectedBgColorAlpha uint8 `json:"selectedBgColorAlpha"` // 选中时背景透明度
	DotColor             RGBA  `json:"dotColor"`             // 内圆点颜色
	DotColorAlpha        uint8 `json:"dotColorAlpha"`        // 内圆点透明度

	// 分组和状态
	GroupName string `json:"groupName"` // 分组名称（同组互斥）
	Selected  bool   `json:"selected"`  // 是否选中
	Enabled   bool   `json:"enabled"`   // 是否启用
}

// NewRadioButton 创建单选按钮
func NewRadioButton(id string, x, y, width, height int) *RadioButtonWidget {
	return &RadioButtonWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeRadioButton,
			X:           x,
			Y:           y,
			Width:       width,
			Height:      height,
			Visible:     true,
			Interactive: true,
		},
		Text:                 "单选按钮",
		TextColor:            RGBA{R: 51, G: 51, B: 51},
		TextColorAlpha:       255,
		FontSize:             14,
		ButtonSize:           18,
		ButtonBgColor:        RGBA{R: 255, G: 255, B: 255},
		ButtonBgColorAlpha:   255,
		BorderColor:          RGBA{R: 180, G: 180, B: 180},
		BorderColorAlpha:     255,
		BorderWidth:          1,
		SelectedBgColor:      RGBA{R: 70, G: 130, B: 180},
		SelectedBgColorAlpha: 255,
		DotColor:             RGBA{R: 255, G: 255, B: 255},
		DotColorAlpha:        255,
		GroupName:            "default",
		Selected:             false,
		Enabled:              true,
	}
}

// Draw 绘制单选按钮
func (r *RadioButtonWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !r.Visible {
		return
	}

	// 计算实际位置
	localX, localY := r.CalculatePosition(parentWidth, parentHeight)
	x := parentX + localX
	y := parentY + localY

	// 计算响应式尺寸
	_, height := r.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 绘制单选按钮（圆形）
	buttonY := y + (height-r.ButtonSize)/2
	centerX := x + r.ButtonSize/2
	centerY := buttonY + r.ButtonSize/2
	r.drawButton(screen, centerX, centerY, r.ButtonSize/2)

	// 如果选中，绘制内圆点
	if r.Selected {
		r.drawDot(screen, centerX, centerY, r.ButtonSize/2)
	}

	// 绘制文本标签
	if r.Text != "" {
		textX := x + r.ButtonSize + 8
		textY := y + height/2
		r.drawText(screen, textX, textY)
	}
}

// drawButton 绘制单选按钮（圆形）
func (r *RadioButtonWidget) drawButton(screen *ebiten.Image, centerX, centerY, radius int) {
	// 确定背景色
	bgColor := color.RGBA{
		R: r.ButtonBgColor.R,
		G: r.ButtonBgColor.G,
		B: r.ButtonBgColor.B,
		A: r.ButtonBgColorAlpha,
	}

	if r.Selected {
		bgColor = color.RGBA{
			R: r.SelectedBgColor.R,
			G: r.SelectedBgColor.G,
			B: r.SelectedBgColor.B,
			A: r.SelectedBgColorAlpha,
		}
	}

	if !r.Enabled {
		bgColor.A = 128
	}

	// 绘制圆形背景
	for dy := -radius; dy <= radius; dy++ {
		for dx := -radius; dx <= radius; dx++ {
			if dx*dx+dy*dy <= radius*radius {
				screen.Set(centerX+dx, centerY+dy, bgColor)
			}
		}
	}

	// 绘制边框
	if r.BorderWidth > 0 {
		borderColor := color.RGBA{
			R: r.BorderColor.R,
			G: r.BorderColor.G,
			B: r.BorderColor.B,
			A: r.BorderColorAlpha,
		}

		if !r.Enabled {
			borderColor.A = 128
		}

		for dy := -radius; dy <= radius; dy++ {
			for dx := -radius; dx <= radius; dx++ {
				dist := dx*dx + dy*dy
				if dist <= radius*radius && dist >= (radius-r.BorderWidth)*(radius-r.BorderWidth) {
					screen.Set(centerX+dx, centerY+dy, borderColor)
				}
			}
		}
	}
}

// drawDot 绘制内圆点
func (r *RadioButtonWidget) drawDot(screen *ebiten.Image, centerX, centerY, outerRadius int) {
	dotColor := color.RGBA{
		R: r.DotColor.R,
		G: r.DotColor.G,
		B: r.DotColor.B,
		A: r.DotColorAlpha,
	}

	if !r.Enabled {
		dotColor.A = 128
	}

	// 内圆点半径约为外圆的一半
	dotRadius := outerRadius / 2
	if dotRadius < 2 {
		dotRadius = 2
	}

	// 绘制实心圆点
	for dy := -dotRadius; dy <= dotRadius; dy++ {
		for dx := -dotRadius; dx <= dotRadius; dx++ {
			if dx*dx+dy*dy <= dotRadius*dotRadius {
				screen.Set(centerX+dx, centerY+dy, dotColor)
			}
		}
	}
}

// drawText 绘制文本标签
func (r *RadioButtonWidget) drawText(screen *ebiten.Image, x, y int) {
	face := basicfont.Face7x13
	textColor := color.RGBA{
		R: r.TextColor.R,
		G: r.TextColor.G,
		B: r.TextColor.B,
		A: r.TextColorAlpha,
	}

	if !r.Enabled {
		textColor.A = 128
	}

	text.Draw(screen, r.Text, face, x, y+4, textColor)
}

// Select 选中此单选按钮
func (r *RadioButtonWidget) Select() {
	if r.Enabled {
		r.Selected = true
	}
}

// Deselect 取消选中
func (r *RadioButtonWidget) Deselect() {
	r.Selected = false
}

// IsSelected 获取选中状态
func (r *RadioButtonWidget) IsSelected() bool {
	return r.Selected
}

// GetGroupName 获取分组名称
func (r *RadioButtonWidget) GetGroupName() string {
	return r.GroupName
}

// Update 更新单选按钮状态
func (r *RadioButtonWidget) Update() error {
	// TODO: 处理鼠标交互和分组互斥逻辑
	return nil
}
