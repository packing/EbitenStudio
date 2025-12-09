package canvas

import (
	"ebitenstudio/pkg/core"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text"
	"github.com/hajimehoshi/ebiten/v2/vector"
	"golang.org/x/image/font/basicfont"
)

func drawGrid(screen *ebiten.Image) {
	w, h := screen.Bounds().Dx(), screen.Bounds().Dy()
	gridColor := color.RGBA{220, 220, 220, 255}
	gridSize := 20

	// 绘制垂直线
	for x := 0; x < w; x += gridSize {
		vector.StrokeLine(screen, float32(x), 0, float32(x), float32(h), 1, gridColor, false)
	}

	// 绘制水平线
	for y := 0; y < h; y += gridSize {
		vector.StrokeLine(screen, 0, float32(y), float32(w), float32(y), 1, gridColor, false)
	}
}

func drawWidget(screen *ebiten.Image, w *core.Widget, selected bool) {
	x, y := float32(w.X), float32(w.Y)
	width, height := float32(w.Width), float32(w.Height)

	// 根据类型选择颜色
	var bgColor color.RGBA
	switch w.Type {
	case "button":
		bgColor = color.RGBA{66, 135, 245, 255}
	case "label":
		bgColor = color.RGBA{100, 100, 100, 255}
	case "panel":
		bgColor = color.RGBA{255, 255, 255, 255}
	default:
		bgColor = color.RGBA{150, 150, 150, 255}
	}

	// 绘制背景
	vector.DrawFilledRect(screen, x, y, width, height, bgColor, false)

	// 绘制边框
	borderColor := color.RGBA{50, 50, 50, 255}
	if selected {
		borderColor = color.RGBA{255, 100, 0, 255}
	}
	vector.StrokeRect(screen, x, y, width, height, 2, borderColor, false)

	// 绘制文本
	if w.Text != "" {
		textColor := color.RGBA{255, 255, 255, 255}
		if w.Type == "panel" {
			textColor = color.RGBA{0, 0, 0, 255}
		}
		text.Draw(screen, w.Text, basicfont.Face7x13, int(x+10), int(y+height/2+5), textColor)
	}
}
