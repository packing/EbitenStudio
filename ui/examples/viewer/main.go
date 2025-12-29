package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"image/color"
	"log"
	"os"
	"sort"
	"time"

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
	width          int
	height         int
	currentWidth   int // 当前窗口宽度
	currentHeight  int // 当前窗口高度
	renderer       *ui.Renderer
	loader         *ui.Loader
	rootPanel      *ui.PanelWidget
	widgets        []ui.Widget
	scriptEngine   *ui.ScriptEngine
	eventQueue     *ui.EventQueue
	commandQueue   *ui.CommandQueue
	isMousePressed bool // 鼠标按下状态
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
		eventQueue:    ui.NewEventQueue(),
		commandQueue:  ui.NewCommandQueue(),
	}

	// 初始化脚本引擎
	engineConfig := ui.DefaultScriptEngineConfig()
	g.scriptEngine = ui.NewScriptEngine(g.eventQueue, g.commandQueue, engineConfig)

	// 加载UI布局
	if layoutFile != "" {
		if err := g.loadLayout(layoutFile); err != nil {
			return nil, fmt.Errorf("failed to load layout: %w", err)
		}
	} else {
		// 没有布局文件时创建空白 UI
		log.Println("No layout file specified, starting with empty UI")
	}

	// 启动脚本引擎
	log.Println("[Viewer] Starting ScriptEngine...")
	if err := g.scriptEngine.Start(); err != nil {
		return nil, fmt.Errorf("failed to start script engine: %w", err)
	}
	log.Println("[Viewer] ScriptEngine started successfully")

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

	// 加载脚本并注册到引擎
	scripts := g.loader.GetScripts()
	log.Printf("[Viewer] Loading %d scripts", len(scripts))

	for widgetID, scriptCode := range scripts {
		if err := g.scriptEngine.LoadScript(widgetID, scriptCode); err != nil {
			log.Printf("[Viewer] Warning: Failed to load script for %s: %v", widgetID, err)
			continue
		}
		log.Printf("[Viewer] Loaded script for %s (length: %d)", widgetID, len(scriptCode))

		// 查找对应的控件
		widget := g.findWidgetByID(widgetID)
		if widget == nil {
			log.Printf("[Viewer] Warning: Widget %s not found for script", widgetID)
			continue
		}

		// 创建脚本绑定
		binding := &ui.WidgetScriptBinding{
			WidgetID:   widgetID,
			ScriptPath: widgetID, // 使用 widgetID 作为脚本路径
			Handlers:   g.detectHandlers(widgetID, widget.GetType()),
			WidgetType: widget.GetType(),
		}

		// 注册控件到脚本引擎
		if err := g.scriptEngine.RegisterWidget(widgetID, binding); err != nil {
			log.Printf("[Viewer] Warning: Failed to register widget %s: %v", widgetID, err)
		} else {
			log.Printf("[Viewer] Registered widget %s with %d event handlers", widgetID, len(binding.Handlers))
		}
	}

	return nil
}

// detectHandlers 检测脚本中定义的事件处理函数
func (g *Game) detectHandlers(widgetID string, widgetType ui.WidgetType) map[ui.EventType]string {
	handlers := make(map[ui.EventType]string)

	// 根据控件类型添加常见事件
	// 这里简化实现，假设脚本对象名就是 widgetID
	// 实际的处理函数名是 widgetID.onClick, widgetID.onHover 等

	switch widgetType {
	case ui.TypeButton:
		handlers[ui.EventClick] = widgetID + ".onClick"
		// 可以添加其他事件，如 hover
	case ui.TypeTextInput:
		handlers[ui.EventClick] = widgetID + ".onClick"
		handlers[ui.EventChange] = widgetID + ".onChange"
	default:
		// 默认至少支持点击事件
		handlers[ui.EventClick] = widgetID + ".onClick"
	}

	return handlers
}

// Update 更新游戏状态
func (g *Game) Update() error {
	// 检测鼠标点击事件
	if ebiten.IsMouseButtonPressed(ebiten.MouseButtonLeft) {
		if !g.isMousePressed {
			g.isMousePressed = true
			mx, my := ebiten.CursorPosition()
			g.handleMouseClick(mx, my)
		}
	} else {
		g.isMousePressed = false
	}

	// 更新所有控件
	for _, widget := range g.widgets {
		if err := widget.Update(); err != nil {
			return err
		}
	}

	// 处理命令队列（脚本引擎产生的命令）
	commands := g.commandQueue.PopAll()
	if len(commands) > 0 {
		log.Printf("[Viewer] Processing %d commands from queue", len(commands))
	}
	for _, cmd := range commands {
		g.executeCommand(cmd)
	}

	return nil
}

// handleMouseClick 处理鼠标点击，触发对应的脚本事件
func (g *Game) handleMouseClick(x, y int) {
	log.Printf("[Viewer] handleMouseClick called at (%d, %d)", x, y)

	// 查找被点击的控件
	clicked := g.findClickedWidget(g.widgets, x, y)
	if clicked != nil {
		widgetID := clicked.GetID()
		log.Printf("[Viewer] Widget clicked: %s at (%d, %d)", widgetID, x, y)

		// 推送点击事件到事件队列
		event := ui.WidgetEvent{
			Type:      ui.EventClick,
			WidgetID:  widgetID,
			Widget:    clicked,
			X:         x,
			Y:         y,
			Button:    0,
			Timestamp: time.Now(),
		}
		g.eventQueue.Push(event)
		log.Printf("[Viewer] Event pushed to queue for widget %s", widgetID)
	}
}

// findClickedWidget 递归查找被点击的控件
func (g *Game) findClickedWidget(widgets []ui.Widget, x, y int) ui.Widget {
	// 按 z-index 倒序排序（高 z-index 优先）
	sortedWidgets := make([]ui.Widget, len(widgets))
	copy(sortedWidgets, widgets)
	sort.Slice(sortedWidgets, func(i, j int) bool {
		return sortedWidgets[i].GetZIndex() > sortedWidgets[j].GetZIndex()
	})

	for _, widget := range sortedWidgets {
		// 先检查子控件
		children := widget.GetChildren()
		if found := g.findClickedWidget(children, x, y); found != nil {
			return found
		}

		// 再检查当前控件
		wx, wy := widget.GetX(), widget.GetY()
		ww, wh := widget.GetWidth(), widget.GetHeight()
		if x >= wx && x < wx+ww &&
			y >= wy && y < wy+wh &&
			widget.IsVisible() && widget.IsInteractive() {
			return widget
		}
	}
	return nil
}

// executeCommand 执行脚本命令
func (g *Game) executeCommand(cmd ui.WidgetCommand) {
	log.Printf("[Viewer] Executing command: %s on widget %s", cmd.Type, cmd.WidgetID)

	// 查找目标控件
	widget := g.findWidgetByID(cmd.WidgetID)
	if widget == nil {
		log.Printf("[Viewer] Warning: Widget %s not found", cmd.WidgetID)
		return
	}

	// 执行命令
	switch cmd.Type {
	case ui.CommandSetText:
		if textSetter, ok := widget.(interface{ SetText(string) }); ok {
			if text, ok := cmd.Value.(string); ok {
				textSetter.SetText(text)
				log.Printf("[Viewer] Set text on %s: %s", cmd.WidgetID, text)
			}
		}
	case ui.CommandSetVisible:
		if value, ok := cmd.Value.(bool); ok {
			widget.SetVisible(value)
		}
	case ui.CommandSetProperty:
		// 通用属性设置
		log.Printf("[Viewer] Set property %s on %s", cmd.Property, cmd.WidgetID)
	default:
		log.Printf("[Viewer] Unknown command type: %s", cmd.Type)
	}
}

// findWidgetByID 递归查找控件
func (g *Game) findWidgetByID(id string) ui.Widget {
	for _, widget := range g.widgets {
		if found := g.findWidgetRecursive(widget, id); found != nil {
			return found
		}
	}
	return nil
}

// findWidgetRecursive 递归查找控件
func (g *Game) findWidgetRecursive(widget ui.Widget, id string) ui.Widget {
	if widget.GetID() == id {
		return widget
	}
	for _, child := range widget.GetChildren() {
		if found := g.findWidgetRecursive(child, id); found != nil {
			return found
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
