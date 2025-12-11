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

// TableColumn 表格列定义
type TableColumn struct {
	Key       string `json:"key"`       // 数据字段名
	Label     string `json:"label"`     // 列头显示文本
	Width     int    `json:"width"`     // 列宽度
	MinWidth  int    `json:"minWidth"`  // 最小宽度
	Sortable  bool   `json:"sortable"`  // 是否可排序
	Alignment string `json:"alignment"` // 对齐方式: left, center, right
}

// TableViewWidget 表格视图控件（多列数据表格带列头）
type TableViewWidget struct {
	BaseWidget

	// 列定义
	Columns []TableColumn `json:"columns"` // 列配置数组

	// 数据
	Items []map[string]interface{} `json:"items"` // 数据数组

	// 样式
	RowHeight       int   `json:"rowHeight"`      // 行高度
	HeaderHeight    int   `json:"headerHeight"`   // 表头高度
	ShowHeader      bool  `json:"showHeader"`     // 是否显示表头
	AlternateRowBg  bool  `json:"alternateRowBg"` // 是否交替行背景色
	ShowGridLines   bool  `json:"showGridLines"`  // 是否显示网格线
	BackgroundColor RGBA  `json:"backgroundColor"`
	BackgroundAlpha uint8 `json:"backgroundAlpha"`
	HeaderBgColor   RGBA  `json:"headerBgColor"` // 表头背景色
	HeaderBgAlpha   uint8 `json:"headerBgAlpha"`
	GridLineColor   RGBA  `json:"gridLineColor"` // 网格线颜色
	GridLineAlpha   uint8 `json:"gridLineAlpha"`
	BorderColor     RGBA  `json:"borderColor"`
	BorderAlpha     uint8 `json:"borderAlpha"`
	BorderWidth     int   `json:"borderWidth"`

	// 滚动
	Scrollable bool `json:"scrollable"` // 是否可滚动
	ScrollY    int  `json:"scrollY"`    // 当前垂直滚动位置

	// 排序
	SortColumn    string `json:"sortColumn"`    // 当前排序列
	SortDirection string `json:"sortDirection"` // 排序方向: asc, desc

	// 状态
	Enabled bool `json:"enabled"`
}

// NewTableView 创建表格视图
func NewTableView(id string) *TableViewWidget {
	return &TableViewWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeTableView,
			Visible:     true,
			Interactive: true,
			Width:       400,
			Height:      300,
			Opacity:     100,
		},
		RowHeight:       30,
		HeaderHeight:    35,
		ShowHeader:      true,
		AlternateRowBg:  true,
		ShowGridLines:   true,
		BackgroundColor: RGBA{255, 255, 255, 255},
		BackgroundAlpha: 255,
		HeaderBgColor:   RGBA{240, 240, 240, 255},
		HeaderBgAlpha:   255,
		GridLineColor:   RGBA{220, 220, 220, 255},
		GridLineAlpha:   255,
		BorderColor:     RGBA{200, 200, 200, 255},
		BorderAlpha:     255,
		BorderWidth:     1,
		Scrollable:      true,
		ScrollY:         0,
		Enabled:         true,
		Columns:         make([]TableColumn, 0),
		Items:           make([]map[string]interface{}, 0),
	}
}

// Draw 绘制表格视图
func (t *TableViewWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !t.Visible {
		return
	}

	// 计算位置和尺寸
	localX, localY := t.CalculatePosition(parentWidth, parentHeight)
	renderWidth, renderHeight := t.CalculateSize(parentWidth, parentHeight, localX, localY)

	absX := parentX + localX
	absY := parentY + localY

	// 创建子图像作为裁剪区域
	subImg := screen.SubImage(image.Rect(absX, absY, absX+renderWidth, absY+renderHeight)).(*ebiten.Image)

	// 绘制背景
	t.drawBackground(subImg, 0, 0, renderWidth, renderHeight)

	// 绘制表头和数据
	if len(t.Columns) > 0 {
		contentY := 0
		if t.ShowHeader {
			// 绘制表头
			t.drawHeader(subImg, 0, 0, renderWidth, t.HeaderHeight)
			contentY = t.HeaderHeight
		}

		// 绘制数据行
		contentHeight := renderHeight - contentY
		if len(t.Items) > 0 {
			t.drawRows(subImg, 0, contentY, renderWidth, contentHeight)
		} else {
			// 绘制空数据提示
			t.drawEmptyHint(subImg, 0, contentY, renderWidth, contentHeight)
		}
	} else {
		// 没有列定义，显示占位符
		t.drawPlaceholder(subImg, 0, 0, renderWidth, renderHeight)
	}

	// 绘制边框
	t.drawBorder(subImg, 0, 0, renderWidth, renderHeight)
}

// drawBackground 绘制背景
func (t *TableViewWidget) drawBackground(screen *ebiten.Image, x, y, width, height int) {
	bgColor := RGBA{R: t.BackgroundColor.R, G: t.BackgroundColor.G, B: t.BackgroundColor.B, A: t.BackgroundAlpha}
	vector.DrawFilledRect(screen, float32(x), float32(y), float32(width), float32(height), bgColor.ToColor(), false)
}

// drawBorder 绘制边框
func (t *TableViewWidget) drawBorder(screen *ebiten.Image, x, y, width, height int) {
	if t.BorderWidth <= 0 {
		return
	}

	borderColor := RGBA{R: t.BorderColor.R, G: t.BorderColor.G, B: t.BorderColor.B, A: t.BorderAlpha}
	bw := float32(t.BorderWidth)

	vector.DrawFilledRect(screen, float32(x), float32(y), float32(width), bw, borderColor.ToColor(), false)
	vector.DrawFilledRect(screen, float32(x), float32(y+height)-bw, float32(width), bw, borderColor.ToColor(), false)
	vector.DrawFilledRect(screen, float32(x), float32(y), bw, float32(height), borderColor.ToColor(), false)
	vector.DrawFilledRect(screen, float32(x+width)-bw, float32(y), bw, float32(height), borderColor.ToColor(), false)
}

// drawHeader 绘制表头
func (t *TableViewWidget) drawHeader(screen *ebiten.Image, x, y, width, height int) {
	// 表头背景
	headerBg := RGBA{R: t.HeaderBgColor.R, G: t.HeaderBgColor.G, B: t.HeaderBgColor.B, A: t.HeaderBgAlpha}
	vector.DrawFilledRect(screen, float32(x), float32(y), float32(width), float32(height), headerBg.ToColor(), false)

	// 绘制列头
	currentX := x + 2
	for i, col := range t.Columns {
		colWidth := col.Width
		if colWidth <= 0 {
			colWidth = 100 // 默认列宽
		}

		// 列头文本
		headerText := col.Label
		if headerText == "" {
			headerText = col.Key
		}

		// 绘制列头文本
		text.Draw(screen, headerText, basicfont.Face7x13, currentX+5, y+height/2+5, color.RGBA{50, 50, 50, 255})

		// 排序指示器
		if t.SortColumn == col.Key {
			sortSymbol := "▲"
			if t.SortDirection == "desc" {
				sortSymbol = "▼"
			}
			text.Draw(screen, sortSymbol, basicfont.Face7x13, currentX+colWidth-15, y+height/2+5, color.RGBA{100, 100, 100, 255})
		}

		// 列分隔线
		if t.ShowGridLines && i < len(t.Columns)-1 {
			gridColor := RGBA{R: t.GridLineColor.R, G: t.GridLineColor.G, B: t.GridLineColor.B, A: t.GridLineAlpha}
			vector.DrawFilledRect(screen, float32(currentX+colWidth), float32(y), 1, float32(height), gridColor.ToColor(), false)
		}

		currentX += colWidth
	}

	// 表头底部分隔线
	if t.ShowGridLines {
		gridColor := RGBA{R: t.GridLineColor.R, G: t.GridLineColor.G, B: t.GridLineColor.B, A: t.GridLineAlpha}
		vector.DrawFilledRect(screen, float32(x), float32(y+height), float32(width), 1, gridColor.ToColor(), false)
	}
}

// drawRows 绘制数据行
func (t *TableViewWidget) drawRows(screen *ebiten.Image, x, y, width, height int) {
	rowHeight := t.RowHeight
	if rowHeight <= 0 {
		rowHeight = 30
	}

	// 计算可见行范围
	startRow := t.ScrollY / rowHeight
	if startRow < 0 {
		startRow = 0
	}

	visibleRowCount := (height / rowHeight) + 2
	endRow := startRow + visibleRowCount
	if endRow > len(t.Items) {
		endRow = len(t.Items)
	}

	// 绘制每一行
	for i := startRow; i < endRow; i++ {
		rowData := t.Items[i]
		rowY := y + i*rowHeight - t.ScrollY

		// 跳过不在可见区域的行
		if rowY+rowHeight < y || rowY > y+height {
			continue
		}

		// 行背景（交替颜色）
		if t.AlternateRowBg && i%2 == 1 {
			vector.DrawFilledRect(screen, float32(x), float32(rowY), float32(width), float32(rowHeight), color.RGBA{248, 248, 248, 255}, false)
		}

		// 绘制单元格
		currentX := x + 2
		for j, col := range t.Columns {
			colWidth := col.Width
			if colWidth <= 0 {
				colWidth = 100
			}

			// 获取单元格数据
			cellValue := ""
			if val, ok := rowData[col.Key]; ok {
				cellValue = fmt.Sprintf("%v", val)
			}

			// 绘制单元格文本
			text.Draw(screen, cellValue, basicfont.Face7x13, currentX+5, rowY+rowHeight/2+5, color.RGBA{50, 50, 50, 255})

			// 列分隔线
			if t.ShowGridLines && j < len(t.Columns)-1 {
				gridColor := RGBA{R: t.GridLineColor.R, G: t.GridLineColor.G, B: t.GridLineColor.B, A: t.GridLineAlpha}
				vector.DrawFilledRect(screen, float32(currentX+colWidth), float32(rowY), 1, float32(rowHeight), gridColor.ToColor(), false)
			}

			currentX += colWidth
		}

		// 行底部分隔线
		if t.ShowGridLines {
			gridColor := RGBA{R: t.GridLineColor.R, G: t.GridLineColor.G, B: t.GridLineColor.B, A: t.GridLineAlpha}
			vector.DrawFilledRect(screen, float32(x), float32(rowY+rowHeight), float32(width), 1, gridColor.ToColor(), false)
		}
	}
}

// drawEmptyHint 绘制空数据提示
func (t *TableViewWidget) drawEmptyHint(screen *ebiten.Image, x, y, width, height int) {
	hintText := "无数据"
	text.Draw(screen, hintText, basicfont.Face7x13, x+width/2-20, y+height/2, color.RGBA{150, 150, 150, 255})
}

// drawPlaceholder 绘制占位符（无列定义时）
func (t *TableViewWidget) drawPlaceholder(screen *ebiten.Image, x, y, width, height int) {
	// 绘制示例表头
	headerHeight := 35
	headerBg := color.RGBA{240, 240, 240, 255}
	vector.DrawFilledRect(screen, float32(x), float32(y), float32(width), float32(headerHeight), headerBg, false)

	// 示例列头
	colCount := 3
	colWidth := width / colCount
	for i := 0; i < colCount; i++ {
		colX := x + i*colWidth
		headerText := fmt.Sprintf("列 %d", i+1)
		text.Draw(screen, headerText, basicfont.Face7x13, colX+10, y+headerHeight/2+5, color.RGBA{50, 50, 50, 255})

		// 列分隔线
		if i < colCount-1 {
			vector.DrawFilledRect(screen, float32(colX+colWidth), float32(y), 1, float32(headerHeight), color.RGBA{200, 200, 200, 255}, false)
		}
	}

	// 表头底部线
	vector.DrawFilledRect(screen, float32(x), float32(y+headerHeight), float32(width), 1, color.RGBA{200, 200, 200, 255}, false)

	// 绘制示例数据行
	rowHeight := 30
	rowY := y + headerHeight
	for i := 0; i < 3; i++ {
		currentRowY := rowY + i*rowHeight

		// 交替背景
		if i%2 == 1 {
			vector.DrawFilledRect(screen, float32(x), float32(currentRowY), float32(width), float32(rowHeight), color.RGBA{248, 248, 248, 255}, false)
		}

		// 示例单元格
		for j := 0; j < colCount; j++ {
			colX := x + j*colWidth
			cellText := fmt.Sprintf("数据 %d-%d", i+1, j+1)
			text.Draw(screen, cellText, basicfont.Face7x13, colX+10, currentRowY+rowHeight/2+5, color.RGBA{80, 80, 80, 255})

			// 列分隔线
			if j < colCount-1 {
				vector.DrawFilledRect(screen, float32(colX+colWidth), float32(currentRowY), 1, float32(rowHeight), color.RGBA{220, 220, 220, 255}, false)
			}
		}

		// 行底部线
		vector.DrawFilledRect(screen, float32(x), float32(currentRowY+rowHeight), float32(width), 1, color.RGBA{220, 220, 220, 255}, false)
	}
}

// HandleEvent 处理事件
func (t *TableViewWidget) HandleEvent(event interface{}) bool {
	if !t.Enabled || !t.Interactive {
		return false
	}

	// TODO: 实现列头点击排序、滚动等事件处理
	return false
}
