package main

import (
	"ebitenstudio/api"
	"ebitenstudio/bridge"
	"ebitenstudio/canvas"
	"log"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
)

func main() {
	// 初始化共享状态
	bridge.InitState()

	// 启动 HTTP API 服务器
	go func() {
		if err := api.StartServer(":3737"); err != nil {
			log.Fatalf("API 服务器启动失败: %v", err)
		}
	}()

	// 等待服务器启动
	time.Sleep(time.Second)
	log.Println("API 服务器运行在 http://localhost:3737")

	// 启动 Ebiten Canvas 窗口
	ebiten.SetWindowSize(800, 600)
	ebiten.SetWindowTitle("EbitenStudio Canvas")
	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)

	game := canvas.NewGame()
	if err := ebiten.RunGame(game); err != nil {
		log.Fatal(err)
	}
}
