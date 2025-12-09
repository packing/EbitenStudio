package bridge

func Subscribe() chan Event {
	state.subLock.Lock()
	defer state.subLock.Unlock()

	ch := make(chan Event, 10)
	state.subscribers = append(state.subscribers, ch)
	return ch
}

func Unsubscribe(ch chan Event) {
	state.subLock.Lock()
	defer state.subLock.Unlock()

	for i, sub := range state.subscribers {
		if sub == ch {
			state.subscribers = append(state.subscribers[:i], state.subscribers[i+1:]...)
			close(ch)
			break
		}
	}
}

func EmitEvent(eventType string, data interface{}) {
	state.subLock.RLock()
	defer state.subLock.RUnlock()

	event := Event{
		Type: eventType,
		Data: data,
	}

	for _, ch := range state.subscribers {
		select {
		case ch <- event:
		default:
			// 如果通道满了,跳过
		}
	}
}
