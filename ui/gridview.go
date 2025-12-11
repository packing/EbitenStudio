package ui

import (
	"fmt"
	"image"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"github.com/hajimehoshi/ebiten/v2/vector"
	"golang.org/x/image/font/basicfont"
)

// GridViewWidget 网格视图控件（多列等宽等高网格）
type GridViewWidget struct {
	BaseWidget

	// 项模板
	ItemTemplate map[string]interface{} `json:"itemTemplate"` // 项模板结构
	ItemWidth    int                    `json:"itemWidth"`    // 单项宽度
	ItemHeight   int                    `json:"itemHeight"`   // 单项高度
	Columns      int                    `json:"columns"`      // 列数
	Spacing      int                    `json:"spacing"`      // 项之间的间距

	// 数据
	Items []map[string]interface{} `json:"items"` // 数据数组

	// 滚动
	Scrollable bool `json:"scrollable"` // 是否可滚动
	ScrollY    int  `json:"scrollY"`    // 当前滚动位置

	// 样式
	BackgroundColor      RGBA  `json:"backgroundColor"`
	BackgroundColorAlpha uint8 `json:"backgroundColorAlpha"`
	BorderColor          RGBA  `json:"borderColor"`
	BorderColorAlpha     uint8 `json:"borderColorAlpha"`
	BorderWidth          int   `json:"borderWidth"`

	// 状态
	Enabled bool `json:"enabled"`
}

// NewGridView 创建网格视图
func NewGridView(id string) *GridViewWidget {
	return &GridViewWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeGridView,
			Visible:     true,
			Interactive: true,
			Width:       300,
			Height:      200,
			Opacity:     100,
		},
		ItemWidth:            80,
		ItemHeight:           80,
		Columns:              4,
		Spacing:              8,
		Scrollable:           true,
		ScrollY:              0,
		BackgroundColor:      RGBA{255, 255, 255, 255},
		BackgroundColorAlpha: 255,
		BorderColor:          RGBA{200, 200, 200, 255},
		BorderColorAlpha:     255,
		BorderWidth:          1,
		Enabled:              true,
		Items:                make([]map[string]interface{}, 0),
	}
}

// Draw 绘制网格视图
func (g *GridViewWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !g.Visible {
		return
	}

	// 计算位置和尺寸
	localX, localY := g.CalculatePosition(parentWidth, parentHeight)
	renderWidth, renderHeight := g.CalculateSize(parentWidth, parentHeight, localX, localY)

	absX := parentX + localX
	absY := parentY + localY

	// 创建子图像作为裁剪区域
	subImg := screen.SubImage(image.Rect(absX, absY, absX+renderWidth, absY+renderHeight)).(*ebiten.Image)

	// 绘制背景
	g.drawBackground(subImg, 0, 0, renderWidth, renderHeight)

	// 绘制项
	if g.ItemTemplate != nil && len(g.Items) > 0 {
		g.drawItems(subImg, 0, 0, renderWidth, renderHeight)
	} else {
		// 如果没有模板，绘制占位符
		g.drawPlaceholder(subImg, 0, 0, renderWidth, renderHeight)
	}

	// 绘制边框
	g.drawBorder(subImg, 0, 0, renderWidth, renderHeight)

	// 绘制子控件（暂不支持，因为GridView使用模板）
	// g.BaseWidget.DrawChildren(screen, absX, absY, renderWidth, renderHeight)
}

// drawBackground 绘制背景
func (g *GridViewWidget) drawBackground(screen *ebiten.Image, x, y, width, height int) {
	bgColor := RGBA{R: g.BackgroundColor.R, G: g.BackgroundColor.G, B: g.BackgroundColor.B, A: g.BackgroundColorAlpha}
	vector.DrawFilledRect(screen, float32(x), float32(y), float32(width), float32(height), bgColor.ToColor(), false)
}

// drawBorder 绘制边框
func (g *GridViewWidget) drawBorder(screen *ebiten.Image, x, y, width, height int) {
	if g.BorderWidth <= 0 {
		return
	}

	borderColor := RGBA{R: g.BorderColor.R, G: g.BorderColor.G, B: g.BorderColor.B, A: g.BorderColorAlpha}
	bw := float32(g.BorderWidth)

	// 上边
	vector.DrawFilledRect(screen, float32(x), float32(y), float32(width), bw, borderColor.ToColor(), false)
	// 下边
	vector.DrawFilledRect(screen, float32(x), float32(y+height)-bw, float32(width), bw, borderColor.ToColor(), false)
	// 左边
	vector.DrawFilledRect(screen, float32(x), float32(y), bw, float32(height), borderColor.ToColor(), false)
	// 右边
	vector.DrawFilledRect(screen, float32(x+width)-bw, float32(y), bw, float32(height), borderColor.ToColor(), false)
}

// drawPlaceholder 绘制占位符（无数据时）
func (g *GridViewWidget) drawPlaceholder(screen *ebiten.Image, x, y, width, height int) {
	// 计算网格布局
	cols := g.Columns
	if cols <= 0 {
		cols = 4
	}

	cellWidth := g.ItemWidth
	cellHeight := g.ItemHeight
	padding := g.Spacing

	// 计算可见行数
	visibleRows := (height / (cellHeight + padding)) + 1
	itemCount := cols * visibleRows
	if itemCount > 12 {
		itemCount = 12 // 最多显示12个占位符
	}

	// 绘制网格项
	for i := 0; i < itemCount; i++ {
		col := i % cols
		row := i / cols

		cellX := x + padding + col*(cellWidth+padding)
		cellY := y + padding + row*(cellHeight+padding)

		// 检查是否在可见区域内
		if cellY+cellHeight > y+height {
			break
		}

		// 项背景
		itemColor := color.RGBA{240, 240, 240, 255}
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY), float32(cellWidth), float32(cellHeight), itemColor, false)

		// 项边框
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY), float32(cellWidth), 1, color.RGBA{200, 200, 200, 255}, false)
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY+cellHeight-1), float32(cellWidth), 1, color.RGBA{200, 200, 200, 255}, false)
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY), 1, float32(cellHeight), color.RGBA{200, 200, 200, 255}, false)
		vector.DrawFilledRect(screen, float32(cellX+cellWidth-1), float32(cellY), 1, float32(cellHeight), color.RGBA{200, 200, 200, 255}, false)

		// 示例文本
		placeholderText := fmt.Sprintf("Item %d", i+1)
		text.Draw(screen, placeholderText, basicfont.Face7x13, cellX+cellWidth/2-20, cellY+cellHeight/2+5, color.RGBA{100, 100, 100, 255})
	}
}

// drawItems 绘制数据项（使用模板）
func (g *GridViewWidget) drawItems(screen *ebiten.Image, x, y, width, height int) {
	// 计算网格布局
	cols := g.Columns
	if cols <= 0 {
		cols = 4
	}

	cellWidth := g.ItemWidth
	cellHeight := g.ItemHeight
	padding := g.Spacing

	// 计算可见范围
	startRow := g.ScrollY / (cellHeight + padding)
	if startRow < 0 {
		startRow = 0
	}

	visibleRows := (height / (cellHeight + padding)) + 2
	endRow := startRow + visibleRows

	startIndex := startRow * cols
	endIndex := endRow * cols
	if endIndex > len(g.Items) {
		endIndex = len(g.Items)
	}

	// 绘制每个可见项
	for i := startIndex; i < endIndex; i++ {
		itemData := g.Items[i]

		col := i % cols
		row := i / cols

		cellX := x + padding + col*(cellWidth+padding)
		cellY := y + padding + row*(cellHeight+padding) - g.ScrollY

		// 跳过不在可见区域的项
		if cellY+cellHeight < y || cellY > y+height {
			continue
		}

		// 项背景
		itemColor := color.RGBA{250, 250, 250, 255}
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY), float32(cellWidth), float32(cellHeight), itemColor, false)

		// 项边框
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY), float32(cellWidth), 1, color.RGBA{220, 220, 220, 255}, false)
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY+cellHeight-1), float32(cellWidth), 1, color.RGBA{220, 220, 220, 255}, false)
		vector.DrawFilledRect(screen, float32(cellX), float32(cellY), 1, float32(cellHeight), color.RGBA{220, 220, 220, 255}, false)
		vector.DrawFilledRect(screen, float32(cellX+cellWidth-1), float32(cellY), 1, float32(cellHeight), color.RGBA{220, 220, 220, 255}, false)

		// 渲染模板
		g.renderItemTemplate(screen, itemData, cellX, cellY, cellWidth, cellHeight)
	}
}

// renderItemTemplate 渲染单个项的模板
func (g *GridViewWidget) renderItemTemplate(screen *ebiten.Image, data map[string]interface{}, x, y, width, height int) {
	if g.ItemTemplate == nil {
		return
	}

	// 解析模板中的子控件
	children, ok := g.ItemTemplate["children"].([]interface{})
	if !ok {
		return
	}

	// 遍历模板中的每个子控件
	for _, childData := range children {
		childMap, ok := childData.(map[string]interface{})
		if !ok {
			continue
		}

		// 解析子控件
		widget, err := parseWidget(childMap)
		if err != nil {
			continue
		}

		// 应用数据绑定（简单的文本替换）
		g.applyDataBinding(widget, data)

		// 绘制子控件（相对于项的位置）
		widget.Draw(screen, x, y, width, height)
	}
}

// applyDataBinding 应用数据绑定（简单实现）
func (g *GridViewWidget) applyDataBinding(widget Widget, data map[string]interface{}) {
	// 根据控件类型应用数据绑定
	// 这里需要类型断言，暂时使用简化实现
	// TODO: 实现完整的数据绑定系统，支持 {fieldName} 语法
}

// HandleEvent 处理事件
func (g *GridViewWidget) HandleEvent(event interface{}) bool {
	if !g.Enabled || !g.Interactive {
		return false
	}

	// TODO: 实现滚动、点击等事件处理
	return false
}
