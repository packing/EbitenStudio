package ui

import (
	"sync"
	"testing"
)

func TestCommandQueueBasic(t *testing.T) {
	cq := NewCommandQueue()

	// 测试Push和PopAll
	cmd1 := WidgetCommand{
		Type:     CommandSetText,
		WidgetID: "button1",
		Value:    "Hello",
	}

	cmd2 := WidgetCommand{
		Type:     CommandSetVisible,
		WidgetID: "panel1",
		Value:    false,
	}

	cq.Push(cmd1)
	cq.Push(cmd2)

	if cq.Len() != 2 {
		t.Errorf("Expected 2 commands, got %d", cq.Len())
	}

	commands := cq.PopAll()

	if len(commands) != 2 {
		t.Errorf("Expected 2 commands, got %d", len(commands))
	}

	if cq.Len() != 0 {
		t.Errorf("Queue should be empty after PopAll, got %d", cq.Len())
	}
}

func TestCommandQueueConcurrent(t *testing.T) {
	cq := NewCommandQueue()

	var wg sync.WaitGroup

	// 10个协程并发写入
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				cq.Push(WidgetCommand{
					Type:     CommandSetText,
					WidgetID: "button",
					Value:    id,
				})
			}
		}(i)
	}

	wg.Wait()

	// 应该有1000个命令
	if cq.Len() != 1000 {
		t.Errorf("Expected 1000 commands, got %d", cq.Len())
	}

	// PopAll应该取出所有命令
	commands := cq.PopAll()
	if len(commands) != 1000 {
		t.Errorf("Expected 1000 commands, got %d", len(commands))
	}

	if cq.Len() != 0 {
		t.Error("Queue should be empty after PopAll")
	}
}

func TestCommandQueuePopAllEmpty(t *testing.T) {
	cq := NewCommandQueue()

	commands := cq.PopAll()
	if commands != nil {
		t.Error("PopAll on empty queue should return nil")
	}
}

func TestCommandQueueClear(t *testing.T) {
	cq := NewCommandQueue()

	// 添加一些命令
	for i := 0; i < 10; i++ {
		cq.Push(WidgetCommand{
			Type:     CommandSetText,
			WidgetID: "button",
			Value:    i,
		})
	}

	if cq.Len() != 10 {
		t.Errorf("Expected 10 commands, got %d", cq.Len())
	}

	cq.Clear()

	if cq.Len() != 0 {
		t.Errorf("Expected 0 commands after Clear, got %d", cq.Len())
	}
}

func TestCommandQueueMultiplePopAll(t *testing.T) {
	cq := NewCommandQueue()

	// 第一批
	cq.Push(WidgetCommand{Type: CommandSetText, Value: "A"})
	cq.Push(WidgetCommand{Type: CommandSetText, Value: "B"})

	batch1 := cq.PopAll()
	if len(batch1) != 2 {
		t.Errorf("Expected 2 commands in batch1, got %d", len(batch1))
	}

	// 第二批
	cq.Push(WidgetCommand{Type: CommandSetText, Value: "C"})
	cq.Push(WidgetCommand{Type: CommandSetText, Value: "D"})
	cq.Push(WidgetCommand{Type: CommandSetText, Value: "E"})

	batch2 := cq.PopAll()
	if len(batch2) != 3 {
		t.Errorf("Expected 3 commands in batch2, got %d", len(batch2))
	}

	// 第三批（空）
	batch3 := cq.PopAll()
	if batch3 != nil {
		t.Error("Expected nil for empty PopAll")
	}
}

func BenchmarkCommandQueuePush(b *testing.B) {
	cq := NewCommandQueue()

	cmd := WidgetCommand{
		Type:     CommandSetText,
		WidgetID: "button1",
		Value:    "Test",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cq.Push(cmd)
	}
}

func BenchmarkCommandQueuePopAll(b *testing.B) {
	cq := NewCommandQueue()

	// 预填充1000个命令
	for i := 0; i < 1000; i++ {
		cq.Push(WidgetCommand{
			Type:     CommandSetText,
			WidgetID: "button1",
			Value:    i,
		})
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		commands := cq.PopAll()
		b.StopTimer()

		// 重新填充以便下次测试
		for _, cmd := range commands {
			cq.Push(cmd)
		}

		b.StartTimer()
	}
}

func BenchmarkCommandQueueConcurrentPush(b *testing.B) {
	cq := NewCommandQueue()

	cmd := WidgetCommand{
		Type:     CommandSetText,
		WidgetID: "button1",
		Value:    "Test",
	}

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			cq.Push(cmd)
		}
	})
}
