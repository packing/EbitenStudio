package ui

import (
	"time"
)

// EventType 事件类型
type EventType string

const (
	EventClick     EventType = "click"
	EventHover     EventType = "hover"
	EventMouseDown EventType = "mousedown"
	EventMouseUp   EventType = "mouseup"
	EventFocus     EventType = "focus"
	EventBlur      EventType = "blur"
	EventChange    EventType = "change"
	EventSubmit    EventType = "submit"
	EventKeyPress  EventType = "keypress"
)

// WidgetEvent 控件事件
type WidgetEvent struct {
	Type      EventType              // 事件类型
	WidgetID  string                 // 控件ID
	Widget    Widget                 // 控件引用（用于创建event.target）
	X         int                    // 鼠标X坐标
	Y         int                    // 鼠标Y坐标
	Button    int                    // 鼠标按钮（0=左, 1=中, 2=右）
	Timestamp time.Time              // 事件时间戳
	Data      map[string]interface{} // 附加数据
}

// EventQueue 事件队列（主线程 → 脚本协程）
type EventQueue struct {
	ch chan WidgetEvent
}

// NewEventQueue 创建事件队列
func NewEventQueue() *EventQueue {
	return &EventQueue{
		ch: make(chan WidgetEvent, 100), // 缓冲100个事件
	}
}

// Push 添加事件到队列（非阻塞，如果队列满则丢弃）
func (eq *EventQueue) Push(event WidgetEvent) bool {
	select {
	case eq.ch <- event:
		return true
	default:
		// 队列满，丢弃事件（避免阻塞主线程）
		return false
	}
}

// Pop 从队列取出事件（阻塞直到有事件）
func (eq *EventQueue) Pop() WidgetEvent {
	return <-eq.ch
}

// TryPop 尝试取出事件（非阻塞）
func (eq *EventQueue) TryPop() (WidgetEvent, bool) {
	select {
	case event := <-eq.ch:
		return event, true
	default:
		return WidgetEvent{}, false
	}
}

// Close 关闭队列
func (eq *EventQueue) Close() {
	close(eq.ch)
}

// Len 返回队列中事件数量（仅用于调试）
func (eq *EventQueue) Len() int {
	return len(eq.ch)
}
