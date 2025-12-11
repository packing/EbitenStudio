package ui

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"github.com/hajimehoshi/ebiten/v2/vector"
	"golang.org/x/image/font/basicfont"
)

// ListViewWidget 列表视图控件（单列垂直列表）
type ListViewWidget struct {
	BaseWidget

	// 项模板
	ItemTemplate map[string]interface{} `json:"itemTemplate"` // 项模板结构
	ItemHeight   int                    `json:"itemHeight"`   // 单项高度

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

// NewListView 创建列表视图
func NewListView(id string) *ListViewWidget {
	return &ListViewWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeListView,
			Visible:     true,
			Interactive: true,
			Width:       200,
			Height:      150,
			Opacity:     100,
		},
		ItemHeight:           40,
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

// Draw 绘制列表视图
func (l *ListViewWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !l.Visible {
		return
	}

	// 计算位置和尺寸
	localX, localY := l.CalculatePosition(parentWidth, parentHeight)
	renderWidth, renderHeight := l.CalculateSize(parentWidth, parentHeight, localX, localY)

	absX := parentX + localX
	absY := parentY + localY

	// 创建子图像作为裁剪区域
	subImg := screen.SubImage(image.Rect(absX, absY, absX+renderWidth, absY+renderHeight)).(*ebiten.Image)

	// 绘制背景
	l.drawBackground(subImg, 0, 0, renderWidth, renderHeight)

	// 绘制项
	if l.ItemTemplate != nil && len(l.Items) > 0 {
		l.drawItems(subImg, 0, 0, renderWidth, renderHeight)
	} else {
		// 如果没有模板，绘制占位符
		l.drawPlaceholder(subImg, 0, 0, renderWidth, renderHeight)
	}

	// 绘制边框
	l.drawBorder(subImg, 0, 0, renderWidth, renderHeight)

	// 绘制子控件（暂不支持，因为ListView使用模板）
	// l.BaseWidget.DrawChildren(screen, absX, absY, renderWidth, renderHeight)
}

// drawBackground 绘制背景
func (l *ListViewWidget) drawBackground(screen *ebiten.Image, x, y, width, height int) {
	bgColor := RGBA{R: l.BackgroundColor.R, G: l.BackgroundColor.G, B: l.BackgroundColor.B, A: l.BackgroundColorAlpha}
	vector.DrawFilledRect(screen, float32(x), float32(y), float32(width), float32(height), bgColor.ToColor(), false)
}

// drawBorder 绘制边框
func (l *ListViewWidget) drawBorder(screen *ebiten.Image, x, y, width, height int) {
	if l.BorderWidth <= 0 {
		return
	}

	borderColor := RGBA{R: l.BorderColor.R, G: l.BorderColor.G, B: l.BorderColor.B, A: l.BorderColorAlpha}
	bw := float32(l.BorderWidth)

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
func (l *ListViewWidget) drawPlaceholder(screen *ebiten.Image, x, y, width, height int) {
	// 绘制示例项
	itemCount := height / l.ItemHeight
	if itemCount > 5 {
		itemCount = 5
	}

	for i := 0; i < itemCount; i++ {
		itemY := y + i*l.ItemHeight

		// 项背景（交替颜色）
		var itemColor color.Color
		if i%2 == 0 {
			itemColor = color.RGBA{240, 240, 240, 255}
		} else {
			itemColor = color.RGBA{250, 250, 250, 255}
		}
		vector.DrawFilledRect(screen, float32(x+2), float32(itemY+2), float32(width-4), float32(l.ItemHeight-4), itemColor, false)

		// 示例文本
		placeholderText := fmt.Sprintf("Item %d", i+1)
		text.Draw(screen, placeholderText, basicfont.Face7x13, x+10, itemY+l.ItemHeight/2+5, color.RGBA{100, 100, 100, 255})
	}
}

// drawItems 绘制数据项（使用模板）
func (l *ListViewWidget) drawItems(screen *ebiten.Image, x, y, width, height int) {
	// 计算可见项范围
	startIndex := l.ScrollY / l.ItemHeight
	if startIndex < 0 {
		startIndex = 0
	}

	visibleCount := (height / l.ItemHeight) + 2
	endIndex := startIndex + visibleCount
	if endIndex > len(l.Items) {
		endIndex = len(l.Items)
	}

	// 绘制每个可见项
	for i := startIndex; i < endIndex; i++ {
		itemData := l.Items[i]
		itemY := y + i*l.ItemHeight - l.ScrollY

		// 跳过不在可见区域的项
		if itemY+l.ItemHeight < y || itemY > y+height {
			continue
		}

		// 项背景（交替颜色）
		var itemColor color.Color
		if i%2 == 0 {
			itemColor = color.RGBA{240, 240, 240, 255}
		} else {
			itemColor = color.RGBA{250, 250, 250, 255}
		}
		vector.DrawFilledRect(screen, float32(x+2), float32(itemY+2), float32(width-4), float32(l.ItemHeight-4), itemColor, false)

		// 渲染模板
		l.renderItemTemplate(screen, itemData, x, itemY, width, l.ItemHeight)
	}
}

// renderItemTemplate 渲染单个项的模板
func (l *ListViewWidget) renderItemTemplate(screen *ebiten.Image, data map[string]interface{}, x, y, width, height int) {
	if l.ItemTemplate == nil {
		return
	}

	// 解析模板中的子控件
	children, ok := l.ItemTemplate["children"].([]interface{})
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
		l.applyDataBinding(widget, data)

		// 绘制子控件（相对于项的位置）
		widget.Draw(screen, x, y, width, height)
	}
}

// applyDataBinding 应用数据绑定（简单实现）
func (l *ListViewWidget) applyDataBinding(widget Widget, data map[string]interface{}) {
	// 根据控件类型应用数据绑定
	// 这里需要类型断言，暂时使用简化实现
	// TODO: 实现完整的数据绑定系统，支持 {fieldName} 语法
}

// parseWidget 解析widget配置（辅助函数）
func parseWidget(data map[string]interface{}) (Widget, error) {
	widgetType, ok := data["type"].(string)
	if !ok {
		return nil, fmt.Errorf("widget type not found")
	}

	// 将map转换回json再解析（简化处理）
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	// 根据类型创建对应的widget
	var widget Widget
	switch WidgetType(widgetType) {
	case TypeLabel:
		widget = &LabelWidget{}
	case TypeImage:
		widget = &ImageWidget{}
	case TypeButton:
		widget = &ButtonWidget{}
	// 其他类型...
	default:
		return nil, fmt.Errorf("unsupported widget type: %s", widgetType)
	}

	// 反序列化
	err = json.Unmarshal(jsonData, widget)
	if err != nil {
		return nil, err
	}

	return widget, nil
}

// HandleEvent 处理事件
func (l *ListViewWidget) HandleEvent(event interface{}) bool {
	if !l.Enabled || !l.Interactive {
		return false
	}

	// TODO: 实现滚动、点击等事件处理
	return false
}
