package ui

import (
	"sync"
)

// CommandType 命令类型
type CommandType string

const (
	CommandSetProperty CommandType = "set_property"
	CommandSetText     CommandType = "set_text"
	CommandSetVisible  CommandType = "set_visible"
	CommandSetColor    CommandType = "set_color"
	CommandFocus       CommandType = "focus"
	CommandBlur        CommandType = "blur"
)

// WidgetCommand 控件命令
type WidgetCommand struct {
	Type     CommandType // 命令类型
	WidgetID string      // 目标控件ID
	Property string      // 属性名（对于SetProperty）
	Value    interface{} // 属性值
}

// CommandQueue 命令队列（脚本协程 → 主线程）
type CommandQueue struct {
	mu       sync.Mutex
	commands []WidgetCommand
}

// NewCommandQueue 创建命令队列
func NewCommandQueue() *CommandQueue {
	return &CommandQueue{
		commands: make([]WidgetCommand, 0, 50),
	}
}

// Push 添加命令到队列
func (cq *CommandQueue) Push(cmd WidgetCommand) {
	cq.mu.Lock()
	defer cq.mu.Unlock()
	cq.commands = append(cq.commands, cmd)
}

// PopAll 取出所有命令并清空队列
func (cq *CommandQueue) PopAll() []WidgetCommand {
	cq.mu.Lock()
	defer cq.mu.Unlock()

	if len(cq.commands) == 0 {
		return nil
	}

	// 复制命令列表
	result := make([]WidgetCommand, len(cq.commands))
	copy(result, cq.commands)

	// 清空队列（重用底层数组）
	cq.commands = cq.commands[:0]

	return result
}

// Len 返回队列中命令数量（仅用于调试）
func (cq *CommandQueue) Len() int {
	cq.mu.Lock()
	defer cq.mu.Unlock()
	return len(cq.commands)
}

// Clear 清空队列
func (cq *CommandQueue) Clear() {
	cq.mu.Lock()
	defer cq.mu.Unlock()
	cq.commands = cq.commands[:0]
}
