package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func StartServer(addr string) error {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 配置 CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 注册路由
	setupRoutes(r)

	return r.Run(addr)
}
