package ui

import (
	"image"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"golang.org/x/image/font/basicfont"
)

// ComboBoxWidget 下拉选择框控件
type ComboBoxWidget struct {
	BaseWidget

	// 选项数据
	Items           []string `json:"items"`           // 选项列表
	SelectedIndex   int      `json:"selectedIndex"`   // 当前选中索引 (-1表示未选中)
	PlaceholderText string   `json:"placeholderText"` // 占位符文本
	MaxVisibleItems int      `json:"maxVisibleItems"` // 最大可见选项数量

	// 外观样式
	BackgroundColor      RGBA  `json:"backgroundColor"`
	BackgroundColorAlpha uint8 `json:"backgroundColorAlpha"`
	BorderColor          RGBA  `json:"borderColor"`
	BorderColorAlpha     uint8 `json:"borderColorAlpha"`
	BorderWidth          int   `json:"borderWidth"`

	// 下拉框样式
	DropdownBgColor      RGBA  `json:"dropdownBgColor"`
	DropdownBgColorAlpha uint8 `json:"dropdownBgColorAlpha"`
	ItemHeight           int   `json:"itemHeight"`

	// 选中项样式
	SelectedBgColor      RGBA  `json:"selectedBgColor"`
	SelectedBgColorAlpha uint8 `json:"selectedBgColorAlpha"`

	// 悬停项样式
	HoverBgColor      RGBA  `json:"hoverBgColor"`
	HoverBgColorAlpha uint8 `json:"hoverBgColorAlpha"`

	// 文本样式
	TextColor      RGBA  `json:"textColor"`
	TextColorAlpha uint8 `json:"textColorAlpha"`
	FontSize       int   `json:"fontSize"`

	// 箭头样式
	ArrowColor      RGBA  `json:"arrowColor"`
	ArrowColorAlpha uint8 `json:"arrowColorAlpha"`

	// 状态
	IsExpanded bool `json:"isExpanded"` // 是否展开
	HoverIndex int  `json:"hoverIndex"` // 当前悬停项索引 (-1表示未悬停)
	Enabled    bool `json:"enabled"`    // 是否启用
}

// NewComboBox 创建下拉选择框
func NewComboBox(id string, x, y, width, height int) *ComboBoxWidget {
	return &ComboBoxWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeComboBox,
			X:           x,
			Y:           y,
			Width:       width,
			Height:      height,
			Visible:     true,
			Interactive: true,
		},
		SelectedIndex:        -1,
		PlaceholderText:      "请选择...",
		MaxVisibleItems:      5,
		BackgroundColor:      RGBA{R: 255, G: 255, B: 255},
		BackgroundColorAlpha: 255,
		BorderColor:          RGBA{R: 200, G: 200, B: 200},
		BorderColorAlpha:     255,
		BorderWidth:          1,
		DropdownBgColor:      RGBA{R: 255, G: 255, B: 255},
		DropdownBgColorAlpha: 255,
		ItemHeight:           30,
		SelectedBgColor:      RGBA{R: 70, G: 130, B: 180},
		SelectedBgColorAlpha: 255,
		HoverBgColor:         RGBA{R: 230, G: 240, B: 250},
		HoverBgColorAlpha:    255,
		TextColor:            RGBA{R: 51, G: 51, B: 51},
		TextColorAlpha:       255,
		FontSize:             14,
		ArrowColor:           RGBA{R: 100, G: 100, B: 100},
		ArrowColorAlpha:      255,
		IsExpanded:           false,
		HoverIndex:           -1,
		Enabled:              true,
	}
}

// Draw 绘制下拉选择框
func (c *ComboBoxWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !c.Visible {
		return
	}

	// 计算实际位置
	localX, localY := c.CalculatePosition(parentWidth, parentHeight)
	x := parentX + localX
	y := parentY + localY

	// 计算响应式尺寸
	width, height := c.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 绘制主框背景
	c.drawMainBox(screen, x, y, width, height)

	// 绘制边框
	c.drawBorder(screen, x, y, width, height)

	// 绘制当前选中文本或占位符
	c.drawCurrentText(screen, x, y, width, height)

	// 绘制下拉箭头
	c.drawArrow(screen, x, y, width, height)

	// 如果展开，绘制下拉列表
	if c.IsExpanded && len(c.Items) > 0 {
		c.drawDropdown(screen, x, y, width, height)
	}
}

// drawMainBox 绘制主框背景
func (c *ComboBoxWidget) drawMainBox(screen *ebiten.Image, x, y, width, height int) {
	bgColor := color.RGBA{
		R: c.BackgroundColor.R,
		G: c.BackgroundColor.G,
		B: c.BackgroundColor.B,
		A: c.BackgroundColorAlpha,
	}

	// 如果禁用，使用半透明效果
	if !c.Enabled {
		bgColor.A = 128
	}

	bounds := image.Rect(x, y, x+width, y+height)
	for py := bounds.Min.Y; py < bounds.Min.Y+height && py < bounds.Max.Y; py++ {
		for px := bounds.Min.X; px < bounds.Min.X+width && px < bounds.Max.X; px++ {
			screen.Set(px, py, bgColor)
		}
	}
}

// drawBorder 绘制边框
func (c *ComboBoxWidget) drawBorder(screen *ebiten.Image, x, y, width, height int) {
	if c.BorderWidth <= 0 {
		return
	}

	borderColor := color.RGBA{
		R: c.BorderColor.R,
		G: c.BorderColor.G,
		B: c.BorderColor.B,
		A: c.BorderColorAlpha,
	}

	// 绘制四条边
	for i := 0; i < c.BorderWidth; i++ {
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

// drawCurrentText 绘制当前选中文本或占位符
func (c *ComboBoxWidget) drawCurrentText(screen *ebiten.Image, x, y, width, height int) {
	var displayText string
	textColor := color.RGBA{
		R: c.TextColor.R,
		G: c.TextColor.G,
		B: c.TextColor.B,
		A: c.TextColorAlpha,
	}

	if c.SelectedIndex >= 0 && c.SelectedIndex < len(c.Items) {
		displayText = c.Items[c.SelectedIndex]
	} else {
		displayText = c.PlaceholderText
		// 占位符使用更浅的颜色
		textColor.A = 128
	}

	if !c.Enabled {
		textColor.A = 128
	}

	// 绘制文本（左对齐，留出箭头空间）
	face := basicfont.Face7x13
	textX := x + 8
	textY := y + height/2 + 4

	text.Draw(screen, displayText, face, textX, textY, textColor)
}

// drawArrow 绘制下拉箭头
func (c *ComboBoxWidget) drawArrow(screen *ebiten.Image, x, y, width, height int) {
	arrowColor := color.RGBA{
		R: c.ArrowColor.R,
		G: c.ArrowColor.G,
		B: c.ArrowColor.B,
		A: c.ArrowColorAlpha,
	}

	if !c.Enabled {
		arrowColor.A = 128
	}

	// 箭头位置在右侧
	arrowX := x + width - 20
	arrowY := y + height/2

	// 绘制向下或向上的三角形
	if c.IsExpanded {
		// 向上箭头
		for i := 0; i < 4; i++ {
			for j := -i; j <= i; j++ {
				screen.Set(arrowX+j, arrowY-i, arrowColor)
			}
		}
	} else {
		// 向下箭头
		for i := 0; i < 4; i++ {
			for j := -i; j <= i; j++ {
				screen.Set(arrowX+j, arrowY+i, arrowColor)
			}
		}
	}
}

// drawDropdown 绘制下拉列表
func (c *ComboBoxWidget) drawDropdown(screen *ebiten.Image, x, y, width, height int) {
	// 下拉框在主框下方
	dropdownY := y + height
	visibleCount := min(len(c.Items), c.MaxVisibleItems)
	dropdownHeight := visibleCount * c.ItemHeight

	// 绘制下拉框背景
	dropdownBg := color.RGBA{
		R: c.DropdownBgColor.R,
		G: c.DropdownBgColor.G,
		B: c.DropdownBgColor.B,
		A: c.DropdownBgColorAlpha,
	}

	bounds := image.Rect(x, dropdownY, x+width, dropdownY+dropdownHeight)
	for py := bounds.Min.Y; py < bounds.Max.Y; py++ {
		for px := bounds.Min.X; px < bounds.Max.X; px++ {
			screen.Set(px, py, dropdownBg)
		}
	}

	// 绘制边框
	borderColor := color.RGBA{
		R: c.BorderColor.R,
		G: c.BorderColor.G,
		B: c.BorderColor.B,
		A: c.BorderColorAlpha,
	}
	// 左、右、下边框
	for py := dropdownY; py < dropdownY+dropdownHeight; py++ {
		screen.Set(x, py, borderColor)
		screen.Set(x+width-1, py, borderColor)
	}
	for px := x; px < x+width; px++ {
		screen.Set(px, dropdownY+dropdownHeight-1, borderColor)
	}

	// 绘制选项
	face := basicfont.Face7x13
	textColor := color.RGBA{
		R: c.TextColor.R,
		G: c.TextColor.G,
		B: c.TextColor.B,
		A: c.TextColorAlpha,
	}

	for i := 0; i < visibleCount; i++ {
		itemY := dropdownY + i*c.ItemHeight

		// 绘制选中项或悬停项背景
		if i == c.SelectedIndex {
			selectedBg := color.RGBA{
				R: c.SelectedBgColor.R,
				G: c.SelectedBgColor.G,
				B: c.SelectedBgColor.B,
				A: c.SelectedBgColorAlpha,
			}
			for py := itemY; py < itemY+c.ItemHeight; py++ {
				for px := x; px < x+width; px++ {
					screen.Set(px, py, selectedBg)
				}
			}
		} else if i == c.HoverIndex {
			hoverBg := color.RGBA{
				R: c.HoverBgColor.R,
				G: c.HoverBgColor.G,
				B: c.HoverBgColor.B,
				A: c.HoverBgColorAlpha,
			}
			for py := itemY; py < itemY+c.ItemHeight; py++ {
				for px := x; px < x+width; px++ {
					screen.Set(px, py, hoverBg)
				}
			}
		}

		// 绘制项文本
		itemText := c.Items[i]
		textX := x + 8
		textY := itemY + c.ItemHeight/2 + 4
		text.Draw(screen, itemText, face, textX, textY, textColor)

		// 绘制分隔线
		if i < visibleCount-1 {
			for px := x; px < x+width; px++ {
				screen.Set(px, itemY+c.ItemHeight-1, borderColor)
			}
		}
	}
}

// drawPlaceholder 绘制占位符效果（用于编辑器预览）
func (c *ComboBoxWidget) drawPlaceholder(screen *ebiten.Image, x, y, width, height int) {
	// 绘制主框
	c.drawMainBox(screen, x, y, width, height)
	c.drawBorder(screen, x, y, width, height)

	// 显示示例文本
	face := basicfont.Face7x13
	placeholderColor := color.RGBA{R: 150, G: 150, B: 150, A: 255}

	if len(c.Items) > 0 && c.SelectedIndex >= 0 && c.SelectedIndex < len(c.Items) {
		text.Draw(screen, c.Items[c.SelectedIndex], face, x+8, y+height/2+4, placeholderColor)
	} else {
		text.Draw(screen, c.PlaceholderText, face, x+8, y+height/2+4, placeholderColor)
	}

	// 绘制箭头
	c.drawArrow(screen, x, y, width, height)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
