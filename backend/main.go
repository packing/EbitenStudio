//go:build js && wasm
// +build js,wasm

package main

import (
	"encoding/json"
	"image/color"
	"log"
	"syscall/js"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
	"github.com/hajimehoshi/ebiten/v2/text"
	"github.com/hajimehoshi/ebiten/v2/vector"
	"golang.org/x/image/font/basicfont"
)

type Widget struct {
	ID     string  `json:"id"`
	Type   string  `json:"type"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Text   string  `json:"text"`
}

type Game struct {
	widgets    []*Widget
	selectedID string
	dragging   bool
	dragID     string
	offsetX    float64
	offsetY    float64
	resizing   bool
	resizeID   string
	resizeDir  string // "se", "s", "e", "sw", "w", "nw", "n", "ne"

	windowWidth  int
	windowHeight int

	console js.Value
}

var game *Game

func main() {
	game = &Game{
		widgets: make([]*Widget, 0),
	}

	// 尝试获取js全局console.log对象
	game.console = js.Global().Get("console")

	// 初始化窗口大小
	game.windowWidth = 800
	game.windowHeight = 600

	// 尝试读取js全局变量设置窗口大小
	if js.Global().Get("canvasWidth").Type() == js.TypeNumber {
		game.windowWidth = js.Global().Get("canvasWidth").Int()
	}
	if js.Global().Get("canvasHeight").Type() == js.TypeNumber {
		game.windowHeight = js.Global().Get("canvasHeight").Int()
	}

	log.Printf("canvasSize %d %d", game.windowWidth, game.windowHeight)

	// 暴露 JS 接口
	js.Global().Set("ebitenCanvas", js.ValueOf(map[string]interface{}{
		"setWidgets":        js.FuncOf(setWidgets),
		"selectWidget":      js.FuncOf(selectWidget),
		"getSelectedID":     js.FuncOf(getSelectedID),
		"updateWidget":      js.FuncOf(updateWidget),
		"getWidgetAtPos":    js.FuncOf(getWidgetAtPos),
		"handleCanvasClick": js.FuncOf(handleCanvasClick),
	}))

	log.Printf("Starting Ebiten WASM canvas with size %dx%d", game.windowWidth, game.windowHeight)
	ebiten.SetWindowSize(game.windowWidth, game.windowHeight)
	ebiten.SetWindowTitle("Ebiten Canvas (WASM)")
	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeDisabled)

	// RunGame 会阻塞，这是 Ebiten 在 WASM 中的正常行为
	// Ebiten 内部会使用 requestAnimationFrame，不会阻塞浏览器事件循环
	if err := ebiten.RunGame(game); err != nil {
		println("Error:", err.Error())
	}
}

func (g *Game) Update() error {
	g.handleInput()
	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	// 背景
	screen.Fill(color.RGBA{240, 240, 240, 255})

	// 网格
	drawGrid(screen)

	// 绘制所有 widgets
	for _, w := range g.widgets {
		drawWidget(screen, w, w.ID == g.selectedID)
	}
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	// 使用固定的窗口大小
	//return outsideWidth, outsideHeight
	return g.windowWidth, g.windowHeight
}

func (g *Game) handleInput() {
	mx, my := ebiten.CursorPosition()
	x, y := float64(mx), float64(my)

	// 鼠标按下
	if inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft) {
		// 检查是否点击了 resize handle
		if g.selectedID != "" {
			for _, w := range g.widgets {
				if w.ID == g.selectedID {
					dir := getResizeHandle(w, x, y)
					if dir != "" {
						g.resizing = true
						g.resizeID = w.ID
						g.resizeDir = dir
						return
					}
				}
			}
		}

		// 检查是否点击了 widget
		for _, w := range g.widgets {
			if x >= w.X && x <= w.X+w.Width && y >= w.Y && y <= w.Y+w.Height {
				g.dragging = true
				g.dragID = w.ID
				g.offsetX = x - w.X
				g.offsetY = y - w.Y
				g.selectedID = w.ID
				notifyJS("widget:selected", w)
				return
			}
		}

		// 点击空白处，通知 JS（可能是创建模式）
		notifyJS("canvas:click", map[string]interface{}{
			"x": x,
			"y": y,
		})
	}

	// 拖拽中
	if g.dragging && ebiten.IsMouseButtonPressed(ebiten.MouseButtonLeft) {
		for _, w := range g.widgets {
			if w.ID == g.dragID {
				w.X = x - g.offsetX
				w.Y = y - g.offsetY
				notifyJS("widget:dragging", w)
				break
			}
		}
	}

	// 调整大小中
	if g.resizing && ebiten.IsMouseButtonPressed(ebiten.MouseButtonLeft) {
		for _, w := range g.widgets {
			if w.ID == g.resizeID {
				handleResize(w, x, y, g.resizeDir)
				notifyJS("widget:dragging", w)
				break
			}
		}
	}

	// 鼠标释放
	if inpututil.IsMouseButtonJustReleased(ebiten.MouseButtonLeft) {
		if g.dragging {
			g.dragging = false
			for _, w := range g.widgets {
				if w.ID == g.dragID {
					notifyJS("widget:updated", w)
					break
				}
			}
		}
		if g.resizing {
			g.resizing = false
			for _, w := range g.widgets {
				if w.ID == g.resizeID {
					notifyJS("widget:updated", w)
					break
				}
			}
		}
	}
}

func getResizeHandle(w *Widget, x, y float64) string {
	handleSize := 8.0

	// 右下角
	if x >= w.X+w.Width-handleSize && x <= w.X+w.Width &&
		y >= w.Y+w.Height-handleSize && y <= w.Y+w.Height {
		return "se"
	}
	// 右边
	if x >= w.X+w.Width-handleSize && x <= w.X+w.Width &&
		y >= w.Y+handleSize && y <= w.Y+w.Height-handleSize {
		return "e"
	}
	// 下边
	if x >= w.X+handleSize && x <= w.X+w.Width-handleSize &&
		y >= w.Y+w.Height-handleSize && y <= w.Y+w.Height {
		return "s"
	}

	return ""
}

func handleResize(w *Widget, x, y float64, dir string) {
	minSize := 20.0

	switch dir {
	case "se":
		w.Width = max(minSize, x-w.X)
		w.Height = max(minSize, y-w.Y)
	case "e":
		w.Width = max(minSize, x-w.X)
	case "s":
		w.Height = max(minSize, y-w.Y)
	}
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func drawGrid(screen *ebiten.Image) {
	w, h := game.windowWidth, game.windowHeight
	gridColor := color.RGBA{220, 220, 220, 255}
	gridSize := 20

	for x := 0; x < w; x += gridSize {
		vector.StrokeLine(screen, float32(x), 0, float32(x), float32(h), 1, gridColor, false)
	}

	for y := 0; y < h; y += gridSize {
		vector.StrokeLine(screen, 0, float32(y), float32(w), float32(y), 1, gridColor, false)
	}
}

func drawWidget(screen *ebiten.Image, w *Widget, selected bool) {
	x, y := float32(w.X), float32(w.Y)
	width, height := float32(w.Width), float32(w.Height)

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

	vector.DrawFilledRect(screen, x, y, width, height, bgColor, false)

	borderColor := color.RGBA{50, 50, 50, 255}
	if selected {
		borderColor = color.RGBA{255, 100, 0, 255}
	}
	vector.StrokeRect(screen, x, y, width, height, 2, borderColor, false)

	if w.Text != "" {
		textColor := color.RGBA{255, 255, 255, 255}
		if w.Type == "panel" {
			textColor = color.RGBA{0, 0, 0, 255}
		}
		text.Draw(screen, w.Text, basicfont.Face7x13, int(x+10), int(y+height/2+5), textColor)
	}

	// 绘制 resize handles (选中时)
	if selected {
		handleSize := float32(8)
		handleColor := color.RGBA{255, 255, 255, 255}

		// 右下角
		vector.DrawFilledRect(screen, x+width-handleSize, y+height-handleSize, handleSize, handleSize, handleColor, false)
		vector.StrokeRect(screen, x+width-handleSize, y+height-handleSize, handleSize, handleSize, 1, borderColor, false)

		// 右边中间
		vector.DrawFilledRect(screen, x+width-handleSize, y+height/2-handleSize/2, handleSize, handleSize, handleColor, false)
		vector.StrokeRect(screen, x+width-handleSize, y+height/2-handleSize/2, handleSize, handleSize, 1, borderColor, false)

		// 下边中间
		vector.DrawFilledRect(screen, x+width/2-handleSize/2, y+height-handleSize, handleSize, handleSize, handleColor, false)
		vector.StrokeRect(screen, x+width/2-handleSize/2, y+height-handleSize, handleSize, handleSize, 1, borderColor, false)
	}
}

// JS 接口函数
func setWidgets(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return nil
	}

	jsonStr := args[0].String()
	var widgets []*Widget
	if err := json.Unmarshal([]byte(jsonStr), &widgets); err != nil {
		println("Error parsing widgets:", err.Error())
		return nil
	}

	game.widgets = widgets
	return nil
}

func selectWidget(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return nil
	}
	game.selectedID = args[0].String()
	return nil
}

func getSelectedID(this js.Value, args []js.Value) interface{} {
	return game.selectedID
}

func updateWidget(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return nil
	}

	jsonStr := args[0].String()
	var updatedWidget Widget
	if err := json.Unmarshal([]byte(jsonStr), &updatedWidget); err != nil {
		return nil
	}

	for i, w := range game.widgets {
		if w.ID == updatedWidget.ID {
			game.widgets[i] = &updatedWidget
			break
		}
	}
	return nil
}

func getWidgetAtPos(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return nil
	}

	x := args[0].Float()
	y := args[1].Float()

	for _, w := range game.widgets {
		if x >= w.X && x <= w.X+w.Width && y >= w.Y && y <= w.Y+w.Height {
			data, _ := json.Marshal(w)
			return string(data)
		}
	}
	return nil
}

func handleCanvasClick(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return nil
	}

	x := args[0].Float()
	y := args[1].Float()

	notifyJS("canvas:click", map[string]interface{}{
		"x": x,
		"y": y,
	})

	return nil
}

func notifyJS(eventType string, data interface{}) {
	// 将数据序列化为 JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		println("Error marshaling data:", err.Error())
		return
	}

	// 创建事件对象
	eventObj := js.Global().Get("Object").New()
	eventObj.Set("type", eventType)
	eventObj.Set("data", string(jsonData))

	// 通过 postMessage 发送到父窗口
	parent := js.Global().Get("parent")
	if !parent.IsUndefined() && !parent.Equal(js.Global().Get("window")) {
		parent.Call("postMessage", eventObj, "*")
	}
}
