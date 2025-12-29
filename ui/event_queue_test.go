package ui

import (
	"testing"
	"time"
)

func TestEventQueueBasic(t *testing.T) {
	eq := NewEventQueue()
	defer eq.Close()

	// 测试Push和Pop
	event := WidgetEvent{
		Type:     EventClick,
		WidgetID: "button1",
		X:        100,
		Y:        200,
	}

	if !eq.Push(event) {
		t.Fatal("Push failed")
	}

	received := eq.Pop()

	if received.Type != EventClick {
		t.Errorf("Expected %s, got %s", EventClick, received.Type)
	}
	if received.WidgetID != "button1" {
		t.Errorf("Expected button1, got %s", received.WidgetID)
	}
}

func TestEventQueueConcurrent(t *testing.T) {
	eq := NewEventQueue()
	defer eq.Close()

	// 并发写入
	go func() {
		for i := 0; i < 50; i++ {
			eq.Push(WidgetEvent{
				Type:     EventClick,
				WidgetID: "button1",
			})
		}
	}()

	go func() {
		for i := 0; i < 50; i++ {
			eq.Push(WidgetEvent{
				Type:     EventHover,
				WidgetID: "button2",
			})
		}
	}()

	// 读取所有事件
	count := 0
	timeout := time.After(2 * time.Second)

	for count < 100 {
		select {
		case <-eq.ch:
			count++
		case <-timeout:
			t.Fatalf("Timeout: received %d events, expected 100", count)
		}
	}

	if count != 100 {
		t.Errorf("Expected 100 events, got %d", count)
	}
}

func TestEventQueueTryPop(t *testing.T) {
	eq := NewEventQueue()
	defer eq.Close()

	// 空队列
	_, ok := eq.TryPop()
	if ok {
		t.Error("TryPop should return false for empty queue")
	}

	// 有事件
	eq.Push(WidgetEvent{Type: EventClick})
	_, ok = eq.TryPop()
	if !ok {
		t.Error("TryPop should return true when event exists")
	}
}

func TestEventQueueLen(t *testing.T) {
	eq := NewEventQueue()
	defer eq.Close()

	if eq.Len() != 0 {
		t.Errorf("Expected empty queue, got length %d", eq.Len())
	}

	eq.Push(WidgetEvent{Type: EventClick})
	eq.Push(WidgetEvent{Type: EventHover})

	if eq.Len() != 2 {
		t.Errorf("Expected 2 events, got %d", eq.Len())
	}

	eq.Pop()

	if eq.Len() != 1 {
		t.Errorf("Expected 1 event, got %d", eq.Len())
	}
}

func TestEventQueueOverflow(t *testing.T) {
	eq := NewEventQueue()
	defer eq.Close()

	// 填满队列
	success := 0
	for i := 0; i < 150; i++ { // 超过缓冲大小100
		if eq.Push(WidgetEvent{Type: EventClick}) {
			success++
		}
	}

	// 应该成功推送约100个事件，其余被丢弃
	if success < 100 || success > 100 {
		t.Logf("Successfully pushed %d events out of 150", success)
	}

	// 缓冲应该是满的
	if eq.Len() != 100 {
		t.Errorf("Expected 100 events in buffer, got %d", eq.Len())
	}
}

func BenchmarkEventQueuePush(b *testing.B) {
	eq := NewEventQueue()
	defer eq.Close()

	event := WidgetEvent{
		Type:     EventClick,
		WidgetID: "button1",
	}

	// 启动消费者防止队列满
	done := make(chan bool)
	go func() {
		for {
			select {
			case <-eq.ch:
			case <-done:
				return
			}
		}
	}()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		eq.Push(event)
	}
	close(done)
}

func BenchmarkEventQueuePop(b *testing.B) {
	eq := NewEventQueue()
	defer eq.Close()

	// 预填充事件
	event := WidgetEvent{
		Type:     EventClick,
		WidgetID: "button1",
	}

	// 生产者协程
	done := make(chan bool)
	go func() {
		for {
			select {
			case eq.ch <- event:
			case <-done:
				return
			}
		}
	}()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		eq.Pop()
	}
	close(done)
}
