package api

import (
	"ebitenstudio/bridge"
	"ebitenstudio/pkg/core"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// GetWidgets 获取所有组件
func GetWidgets(c *gin.Context) {
	widgets := bridge.GetAllWidgets()
	c.JSON(200, widgets)
}

// CreateWidget 创建新组件
func CreateWidget(c *gin.Context) {
	var req struct {
		Type   string  `json:"type" binding:"required"`
		X      float64 `json:"x"`
		Y      float64 `json:"y"`
		Width  float64 `json:"width"`
		Height float64 `json:"height"`
		Text   string  `json:"text"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 设置默认值
	if req.Width == 0 {
		req.Width = 120
	}
	if req.Height == 0 {
		req.Height = 40
	}

	widget := &core.Widget{
		ID:     uuid.New().String(),
		Type:   req.Type,
		X:      req.X,
		Y:      req.Y,
		Width:  req.Width,
		Height: req.Height,
		Text:   req.Text,
	}

	bridge.AddWidget(widget)
	bridge.EmitEvent("widget:created", widget)

	c.JSON(201, widget)
}

// UpdateWidget 更新组件
func UpdateWidget(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		X      *float64 `json:"x"`
		Y      *float64 `json:"y"`
		Width  *float64 `json:"width"`
		Height *float64 `json:"height"`
		Text   *string  `json:"text"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	widget := bridge.GetWidget(id)
	if widget == nil {
		c.JSON(404, gin.H{"error": "Widget not found"})
		return
	}

	// 更新字段
	if req.X != nil {
		widget.X = *req.X
	}
	if req.Y != nil {
		widget.Y = *req.Y
	}
	if req.Width != nil {
		widget.Width = *req.Width
	}
	if req.Height != nil {
		widget.Height = *req.Height
	}
	if req.Text != nil {
		widget.Text = *req.Text
	}

	bridge.UpdateWidget(widget)
	bridge.EmitEvent("widget:updated", widget)

	c.JSON(200, widget)
}

// DeleteWidget 删除组件
func DeleteWidget(c *gin.Context) {
	id := c.Param("id")

	if !bridge.DeleteWidget(id) {
		c.JSON(404, gin.H{"error": "Widget not found"})
		return
	}

	bridge.EmitEvent("widget:deleted", gin.H{"id": id})
	c.JSON(204, nil)
}

// HandleWebSocket WebSocket 连接处理
func HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// 订阅事件
	eventChan := bridge.Subscribe()
	defer bridge.Unsubscribe(eventChan)

	for event := range eventChan {
		if err := conn.WriteJSON(event); err != nil {
			break
		}
	}
}
