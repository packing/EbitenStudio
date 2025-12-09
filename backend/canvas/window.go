package canvas

import (
	"ebitenstudio/bridge"
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
)

type Game struct {
	dragging   bool
	dragID     string
	dragStartX float64
	dragStartY float64
	offsetX    float64
	offsetY    float64
}

func NewGame() *Game {
	return &Game{}
}

func (g *Game) Update() error {
	// 处理鼠标输入
	g.handleInput()
	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	// 绘制背景
	screen.Fill(color.RGBA{240, 240, 240, 255})

	// 绘制网格
	drawGrid(screen)

	// 绘制所有 widgets
	widgets := bridge.GetAllWidgets()
	selectedID := bridge.GetSelected()

	for _, w := range widgets {
		drawWidget(screen, w, w.ID == selectedID)
	}
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return outsideWidth, outsideHeight
}

func (g *Game) handleInput() {
	mx, my := ebiten.CursorPosition()
	x, y := float64(mx), float64(my)

	// 鼠标按下
	if inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft) {
		// 查找点击的 widget
		widgets := bridge.GetAllWidgets()
		for _, w := range widgets {
			if x >= w.X && x <= w.X+w.Width && y >= w.Y && y <= w.Y+w.Height {
				g.dragging = true
				g.dragID = w.ID
				g.dragStartX = w.X
				g.dragStartY = w.Y
				g.offsetX = x - w.X
				g.offsetY = y - w.Y
				bridge.SetSelected(w.ID)
				bridge.EmitEvent("widget:selected", w)
				break
			}
		}
	}

	// 拖拽中
	if g.dragging && ebiten.IsMouseButtonPressed(ebiten.MouseButtonLeft) {
		if w := bridge.GetWidget(g.dragID); w != nil {
			w.X = x - g.offsetX
			w.Y = y - g.offsetY
			bridge.UpdateWidget(w)
		}
	}

	// 鼠标释放
	if inpututil.IsMouseButtonJustReleased(ebiten.MouseButtonLeft) {
		if g.dragging {
			g.dragging = false
			if w := bridge.GetWidget(g.dragID); w != nil {
				bridge.EmitEvent("widget:updated", w)
			}
		}
	}
}
