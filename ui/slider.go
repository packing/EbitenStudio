package ui

import (
	"image"
	"image/color"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"golang.org/x/image/font/basicfont"
)

// SliderOrientation 滑动条方向
type SliderOrientation string

const (
	SliderOrientationHorizontal SliderOrientation = "horizontal"
	SliderOrientationVertical   SliderOrientation = "vertical"
)

// SliderWidget 滑动条控件
type SliderWidget struct {
	BaseWidget

	// 数值属性
	MinValue float64 `json:"minValue"` // 最小值
	MaxValue float64 `json:"maxValue"` // 最大值
	Value    float64 `json:"value"`    // 当前值
	Step     float64 `json:"step"`     // 步长（0表示连续）

	// 外观属性
	Orientation SliderOrientation `json:"orientation"` // 方向
	TrackHeight int               `json:"trackHeight"` // 轨道高度/宽度
	ThumbSize   int               `json:"thumbSize"`   // 滑块尺寸

	// 轨道颜色
	TrackBgColor      RGBA  `json:"trackBgColor"`
	TrackBgColorAlpha uint8 `json:"trackBgColorAlpha"`
	TrackFillColor    RGBA  `json:"trackFillColor"` // 已滑过部分颜色
	TrackFillAlpha    uint8 `json:"trackFillAlpha"`

	// 滑块颜色
	ThumbColor      RGBA  `json:"thumbColor"`
	ThumbColorAlpha uint8 `json:"thumbColorAlpha"`
	ThumbHoverColor RGBA  `json:"thumbHoverColor"` // 悬停时颜色
	ThumbHoverAlpha uint8 `json:"thumbHoverAlpha"`

	// 边框
	BorderColor      RGBA  `json:"borderColor"`
	BorderColorAlpha uint8 `json:"borderColorAlpha"`
	BorderWidth      int   `json:"borderWidth"`

	// 状态
	ShowValue  bool `json:"showValue"`  // 是否显示数值
	Enabled    bool `json:"enabled"`    // 是否启用
	IsHovering bool `json:"isHovering"` // 是否悬停
	IsDragging bool `json:"isDragging"` // 是否拖拽中
}

// NewSlider 创建滑动条
func NewSlider(id string, x, y, width, height int) *SliderWidget {
	return &SliderWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeSlider,
			X:           x,
			Y:           y,
			Width:       width,
			Height:      height,
			Visible:     true,
			Interactive: true,
		},
		MinValue:          0,
		MaxValue:          100,
		Value:             50,
		Step:              1,
		Orientation:       SliderOrientationHorizontal,
		TrackHeight:       6,
		ThumbSize:         16,
		TrackBgColor:      RGBA{R: 220, G: 220, B: 220},
		TrackBgColorAlpha: 255,
		TrackFillColor:    RGBA{R: 70, G: 130, B: 180},
		TrackFillAlpha:    255,
		ThumbColor:        RGBA{R: 255, G: 255, B: 255},
		ThumbColorAlpha:   255,
		ThumbHoverColor:   RGBA{R: 240, G: 240, B: 240},
		ThumbHoverAlpha:   255,
		BorderColor:       RGBA{R: 150, G: 150, B: 150},
		BorderColorAlpha:  255,
		BorderWidth:       1,
		ShowValue:         true,
		Enabled:           true,
		IsHovering:        false,
		IsDragging:        false,
	}
}

// Draw 绘制滑动条
func (s *SliderWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !s.Visible {
		return
	}

	// 计算实际位置
	localX, localY := s.CalculatePosition(parentWidth, parentHeight)
	x := parentX + localX
	y := parentY + localY

	// 计算响应式尺寸
	width, height := s.CalculateSize(parentWidth, parentHeight, localX, localY)

	if s.Orientation == SliderOrientationHorizontal {
		s.drawHorizontal(screen, x, y, width, height)
	} else {
		s.drawVertical(screen, x, y, width, height)
	}
}

// drawHorizontal 绘制水平滑动条
func (s *SliderWidget) drawHorizontal(screen *ebiten.Image, x, y, width, height int) {
	// 计算轨道位置（垂直居中）
	trackY := y + (height-s.TrackHeight)/2
	trackWidth := width - s.ThumbSize // 留出滑块空间

	// 绘制轨道背景
	s.drawTrackBackground(screen, x+s.ThumbSize/2, trackY, trackWidth, s.TrackHeight)

	// 计算滑块位置
	ratio := (s.Value - s.MinValue) / (s.MaxValue - s.MinValue)
	if math.IsNaN(ratio) || math.IsInf(ratio, 0) {
		ratio = 0
	}
	ratio = math.Max(0, math.Min(1, ratio))
	thumbX := x + s.ThumbSize/2 + int(float64(trackWidth)*ratio)

	// 绘制已滑过部分
	fillWidth := int(float64(trackWidth) * ratio)
	s.drawTrackFill(screen, x+s.ThumbSize/2, trackY, fillWidth, s.TrackHeight)

	// 绘制滑块
	thumbY := y + height/2
	s.drawThumb(screen, thumbX, thumbY, s.ThumbSize)

	// 显示数值
	if s.ShowValue {
		s.drawValueText(screen, x+width+5, y+height/2)
	}
}

// drawVertical 绘制垂直滑动条
func (s *SliderWidget) drawVertical(screen *ebiten.Image, x, y, width, height int) {
	// 计算轨道位置（水平居中）
	trackX := x + (width-s.TrackHeight)/2
	trackHeight := height - s.ThumbSize // 留出滑块空间

	// 绘制轨道背景
	s.drawTrackBackgroundVertical(screen, trackX, y+s.ThumbSize/2, s.TrackHeight, trackHeight)

	// 计算滑块位置（从底部开始）
	ratio := (s.Value - s.MinValue) / (s.MaxValue - s.MinValue)
	if math.IsNaN(ratio) || math.IsInf(ratio, 0) {
		ratio = 0
	}
	ratio = math.Max(0, math.Min(1, ratio))
	thumbY := y + s.ThumbSize/2 + int(float64(trackHeight)*(1-ratio))

	// 绘制已滑过部分（从滑块到底部）
	fillHeight := y + height - s.ThumbSize/2 - thumbY
	s.drawTrackFillVertical(screen, trackX, thumbY, s.TrackHeight, fillHeight)

	// 绘制滑块
	thumbX := x + width/2
	s.drawThumb(screen, thumbX, thumbY, s.ThumbSize)

	// 显示数值
	if s.ShowValue {
		s.drawValueText(screen, x+width+5, y+height/2)
	}
}

// drawTrackBackground 绘制轨道背景
func (s *SliderWidget) drawTrackBackground(screen *ebiten.Image, x, y, width, height int) {
	trackBg := color.RGBA{
		R: s.TrackBgColor.R,
		G: s.TrackBgColor.G,
		B: s.TrackBgColor.B,
		A: s.TrackBgColorAlpha,
	}

	if !s.Enabled {
		trackBg.A = 128
	}

	bounds := image.Rect(x, y, x+width, y+height)
	for py := bounds.Min.Y; py < bounds.Max.Y; py++ {
		for px := bounds.Min.X; px < bounds.Max.X; px++ {
			screen.Set(px, py, trackBg)
		}
	}

	// 绘制边框
	if s.BorderWidth > 0 {
		s.drawRectBorder(screen, x, y, width, height)
	}
}

// drawTrackBackgroundVertical 绘制垂直轨道背景
func (s *SliderWidget) drawTrackBackgroundVertical(screen *ebiten.Image, x, y, width, height int) {
	s.drawTrackBackground(screen, x, y, width, height)
}

// drawTrackFill 绘制已滑过部分
func (s *SliderWidget) drawTrackFill(screen *ebiten.Image, x, y, width, height int) {
	if width <= 0 {
		return
	}

	fillColor := color.RGBA{
		R: s.TrackFillColor.R,
		G: s.TrackFillColor.G,
		B: s.TrackFillColor.B,
		A: s.TrackFillAlpha,
	}

	if !s.Enabled {
		fillColor.A = 128
	}

	bounds := image.Rect(x, y, x+width, y+height)
	for py := bounds.Min.Y; py < bounds.Max.Y; py++ {
		for px := bounds.Min.X; px < bounds.Max.X; px++ {
			screen.Set(px, py, fillColor)
		}
	}
}

// drawTrackFillVertical 绘制垂直已滑过部分
func (s *SliderWidget) drawTrackFillVertical(screen *ebiten.Image, x, y, width, height int) {
	if height <= 0 {
		return
	}
	s.drawTrackFill(screen, x, y, width, height)
}

// drawThumb 绘制滑块
func (s *SliderWidget) drawThumb(screen *ebiten.Image, centerX, centerY, size int) {
	thumbColor := color.RGBA{
		R: s.ThumbColor.R,
		G: s.ThumbColor.G,
		B: s.ThumbColor.B,
		A: s.ThumbColorAlpha,
	}

	// 如果悬停或拖拽，使用悬停颜色
	if s.IsHovering || s.IsDragging {
		thumbColor = color.RGBA{
			R: s.ThumbHoverColor.R,
			G: s.ThumbHoverColor.G,
			B: s.ThumbHoverColor.B,
			A: s.ThumbHoverAlpha,
		}
	}

	if !s.Enabled {
		thumbColor.A = 128
	}

	// 绘制圆形滑块
	radius := size / 2
	for dy := -radius; dy <= radius; dy++ {
		for dx := -radius; dx <= radius; dx++ {
			if dx*dx+dy*dy <= radius*radius {
				screen.Set(centerX+dx, centerY+dy, thumbColor)
			}
		}
	}

	// 绘制滑块边框
	if s.BorderWidth > 0 {
		borderColor := color.RGBA{
			R: s.BorderColor.R,
			G: s.BorderColor.G,
			B: s.BorderColor.B,
			A: s.BorderColorAlpha,
		}
		for dy := -radius; dy <= radius; dy++ {
			for dx := -radius; dx <= radius; dx++ {
				dist := dx*dx + dy*dy
				if dist <= radius*radius && dist >= (radius-s.BorderWidth)*(radius-s.BorderWidth) {
					screen.Set(centerX+dx, centerY+dy, borderColor)
				}
			}
		}
	}
}

// drawRectBorder 绘制矩形边框
func (s *SliderWidget) drawRectBorder(screen *ebiten.Image, x, y, width, height int) {
	borderColor := color.RGBA{
		R: s.BorderColor.R,
		G: s.BorderColor.G,
		B: s.BorderColor.B,
		A: s.BorderColorAlpha,
	}

	for i := 0; i < s.BorderWidth; i++ {
		// 上边
		for px := x; px < x+width; px++ {
			screen.Set(px, y+i, borderColor)
		}
		// 下边
		for px := x; px < x+width; px++ {
			screen.Set(px, y+height-1-i, borderColor)
		}
		// 左边
		for py := y; py < y+height; py++ {
			screen.Set(x+i, py, borderColor)
		}
		// 右边
		for py := y; py < y+height; py++ {
			screen.Set(x+width-1-i, py, borderColor)
		}
	}
}

// drawValueText 绘制数值文本
func (s *SliderWidget) drawValueText(screen *ebiten.Image, x, y int) {
	face := basicfont.Face7x13
	textColor := color.RGBA{R: 80, G: 80, B: 80, A: 255}

	if !s.Enabled {
		textColor.A = 128
	}

	// 格式化数值
	var valueStr string
	if s.Step >= 1 {
		valueStr = formatInt(int(s.Value))
	} else {
		valueStr = formatFloat(s.Value)
	}

	text.Draw(screen, valueStr, face, x, y+4, textColor)
}

// formatInt 格式化整数
func formatInt(n int) string {
	if n < 0 {
		return "-" + formatInt(-n)
	}
	if n < 10 {
		return string(rune('0' + n))
	}
	return formatInt(n/10) + string(rune('0'+n%10))
}

// formatFloat 格式化浮点数
func formatFloat(f float64) string {
	// 简单实现：保留1位小数
	intPart := int(f)
	decPart := int((f - float64(intPart)) * 10)
	if decPart < 0 {
		decPart = -decPart
	}
	return formatInt(intPart) + "." + string(rune('0'+decPart))
}

// SetValue 设置值
func (s *SliderWidget) SetValue(value float64) {
	// 限制范围
	value = math.Max(s.MinValue, math.Min(s.MaxValue, value))

	// 应用步长
	if s.Step > 0 {
		steps := math.Round((value - s.MinValue) / s.Step)
		value = s.MinValue + steps*s.Step
	}

	s.Value = value
}

// Update 更新滑动条状态
func (s *SliderWidget) Update() error {
	// TODO: 处理鼠标交互
	return nil
}
