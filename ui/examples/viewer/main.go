package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"image/color"
	"log"
	"os"
	"sort"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"github.com/packing/EbitenStudio/ui"
)

const (
	defaultWidth  = 1280
	defaultHeight = 720
)

// Game 游戏主结构
type Game struct {
	width         int
	height        int
	currentWidth  int // 当前窗口宽度
	currentHeight int // 当前窗口高度
	renderer      *ui.Renderer
	loader        *ui.Loader
	rootPanel     *ui.PanelWidget
	widgets       []ui.Widget
}

// NewGame 创建游戏实例
func NewGame(layoutFile string) (*Game, error) {
	g := &Game{
		width:         defaultWidth,
		height:        defaultHeight,
		currentWidth:  defaultWidth,
		currentHeight: defaultHeight,
		renderer:      ui.NewRenderer(),
		loader:        ui.NewLoader(),
	}

	// 加载UI布局
	if layoutFile != "" {
		if err := g.loadLayout(layoutFile); err != nil {
			return nil, fmt.Errorf("failed to load layout: %w", err)
		}
	} else {
		// 创建默认UI
		g.createDefaultUI()
	}

	return g, nil
}

// loadLayout 从文件加载UI布局（支持.ui和.json格式）
func (g *Game) loadLayout(filename string) error {
	// 首先读取文件获取画布尺寸
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	var layoutData map[string]interface{}
	if err := json.Unmarshal(data, &layoutData); err != nil {
		return err
	}

	// 读取画布尺寸
	if width, ok := layoutData["width"].(float64); ok {
		log.Printf("Loaded layout width: %f", width)
		g.width = int(width)
	}
	if height, ok := layoutData["height"].(float64); ok {
		log.Printf("Loaded layout height: %f", height)
		g.height = int(height)
	}

	log.Printf("Loaded layout size: width=%d, height=%d", g.width, g.height)

	// 使用Loader的LoadFromFile方法，自动处理pak资源包
	widgets, err := g.loader.LoadFromFile(filename)
	if err != nil {
		return err
	}

	g.widgets = widgets
	return nil
}

// createDefaultUI 创建默认测试UI
func (g *Game) createDefaultUI() {
	// 创建根面板
	g.rootPanel = ui.NewPanel("root")
	g.rootPanel.X = 0
	g.rootPanel.Y = 0
	g.rootPanel.Width = g.width
	g.rootPanel.Height = g.height
	g.rootPanel.BackgroundColor = ui.RGBA{R: 40, G: 44, B: 52, A: 255}
	g.rootPanel.BackgroundAlpha = 255

	// 创建标题标签
	titleLabel := ui.NewLabel("title")
	titleLabel.X = 100
	titleLabel.Y = 50
	titleLabel.Width = 400
	titleLabel.Height = 60
	titleLabel.Text = "Ebiten UI Viewer"
	titleLabel.FontSize = 32
	titleLabel.TextAlignment = "center"
	titleLabel.TextColor = ui.RGBA{R: 255, G: 255, B: 255, A: 255}
	titleLabel.TextColorAlpha = 255
	g.rootPanel.AddChild(titleLabel)

	// 创建按钮1
	btn1 := ui.NewButton("btn1")
	btn1.X = 100
	btn1.Y = 150
	btn1.Width = 150
	btn1.Height = 45
	btn1.Text = "Normal Button"
	btn1.BorderRadius = 8
	g.rootPanel.AddChild(btn1)

	// 创建按钮2（禁用状态）
	btn2 := ui.NewButton("btn2")
	btn2.X = 270
	btn2.Y = 150
	btn2.Width = 150
	btn2.Height = 45
	btn2.Text = "Disabled"
	btn2.SetEnabled(false)
	btn2.BorderRadius = 8
	g.rootPanel.AddChild(btn2)

	// 创建文本输入框
	textInput := ui.NewTextInput("input1")
	textInput.X = 100
	textInput.Y = 220
	textInput.Width = 320
	textInput.Height = 40
	textInput.PlaceholderText = "Enter your text here..."
	textInput.BorderWidth = 1
	textInput.BorderColor = ui.RGBA{R: 100, G: 100, B: 100, A: 255}
	textInput.BorderAlpha = 255
	textInput.BorderRadius = 4
	g.rootPanel.AddChild(textInput)

	// 创建标签
	infoLabel := ui.NewLabel("info")
	infoLabel.X = 100
	infoLabel.Y = 280
	infoLabel.Width = 600
	infoLabel.Height = 100
	infoLabel.Text = "This is a UI viewer for Ebiten.\nClick buttons and type in the text field to test interactivity."
	infoLabel.TextAlignment = "left"
	infoLabel.VerticalAlign = "top"
	infoLabel.TextColor = ui.RGBA{R: 200, G: 200, B: 200, A: 255}
	infoLabel.TextColorAlpha = 255
	infoLabel.WordWrap = true
	g.rootPanel.AddChild(infoLabel)

	// 创建圆形按钮示例
	circleBtn := ui.NewButton("circleBtn")
	circleBtn.X = 100
	circleBtn.Y = 400
	circleBtn.Width = 128
	circleBtn.Height = 128
	circleBtn.Text = "Circle"
	circleBtn.BorderRadius = 64 // 圆形
	circleBtn.BackgroundColorNormal = ui.RGBA{R: 255, G: 100, B: 100, A: 255}
	circleBtn.BackgroundColorNormalAlpha = 255
	circleBtn.BackgroundColorPressed = ui.RGBA{R: 200, G: 50, B: 50, A: 255}
	circleBtn.BackgroundColorPressedAlpha = 255
	g.rootPanel.AddChild(circleBtn)

	g.widgets = []ui.Widget{g.rootPanel}
}

// Update 更新游戏状态
func (g *Game) Update() error {
	// 更新所有控件
	for _, widget := range g.widgets {
		if err := widget.Update(); err != nil {
			return err
		}
	}
	return nil
}

// Draw 绘制游戏画面
func (g *Game) Draw(screen *ebiten.Image) {
	// 清空屏幕
	screen.Fill(color.RGBA{R: 30, G: 30, B: 30, A: 255})

	// 按z-index排序控件（z-index小的先绘制，在底层）
	sortedWidgets := make([]ui.Widget, len(g.widgets))
	copy(sortedWidgets, g.widgets)
	sort.Slice(sortedWidgets, func(i, j int) bool {
		return sortedWidgets[i].GetZIndex() < sortedWidgets[j].GetZIndex()
	})

	// 绘制所有控件
	screenWidth := screen.Bounds().Dx()
	screenHeight := screen.Bounds().Dy()
	for _, widget := range sortedWidgets {
		widget.Draw(screen, 0, 0, screenWidth, screenHeight)
	}

	// 显示FPS
	ebitenutil.DebugPrint(screen, fmt.Sprintf("FPS: %.2f", ebiten.ActualTPS()))
}

// Layout 设置屏幕布局
func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	// 检测窗口大小是否改变（仅用于日志）
	if outsideWidth != g.currentWidth || outsideHeight != g.currentHeight {
		log.Printf("Window size changed: %dx%d -> %dx%d", g.currentWidth, g.currentHeight, outsideWidth, outsideHeight)
		g.currentWidth = outsideWidth
		g.currentHeight = outsideHeight
	}

	// 返回当前窗口尺寸作为逻辑分辨率（不缩放）
	// 锚点系统会根据screen的尺寸自动计算控件位置
	return outsideWidth, outsideHeight
}

func main() {
	// 解析命令行参数
	// 静默模式
	var silentMode bool
	var layoutFile string
	flag.BoolVar(&silentMode, "silent", false, "Enable silent mode (suppress logs)")
	flag.StringVar(&layoutFile, "layout", "", "Path to UI layout file (.ui or .json)")
	flag.Parse()

	if silentMode {
		// 日志输出到文件
		logFile, err := os.OpenFile("ui_viewer.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			log.Fatalf("Failed to open log file: %v", err)
		}
		defer logFile.Close()
		log.SetOutput(logFile)
	}

	// 创建游戏实例
	game, err := NewGame(layoutFile)
	if err != nil {
		log.Fatalf("Failed to create game: %v", err)
	}

	log.Printf("width: %d, height: %d", game.width, game.height)
	// 设置窗口选项（使用从UI文件读取的尺寸）
	ebiten.SetWindowSize(game.width, game.height)
	ebiten.SetWindowTitle("Ebiten UI Viewer")
	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)

	// 运行游戏
	if err := ebiten.RunGame(game); err != nil {
		log.Fatal(err)
	}
}
