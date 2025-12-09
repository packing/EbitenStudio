package api

import (
	"github.com/gin-gonic/gin"
)

func setupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Widget CRUD
		api.GET("/widgets", GetWidgets)
		api.POST("/widgets", CreateWidget)
		api.PUT("/widgets/:id", UpdateWidget)
		api.DELETE("/widgets/:id", DeleteWidget)

		// WebSocket 事件流
		api.GET("/events", HandleWebSocket)

		// 健康检查
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})
	}
}
