package bridge

import (
	"ebitenstudio/pkg/core"
	"sync"
)

var (
	state     *State
	stateLock sync.RWMutex
)

type State struct {
	Widgets     map[string]*core.Widget
	SelectedID  string
	subscribers []chan Event
	subLock     sync.RWMutex
}

type Event struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func InitState() {
	state = &State{
		Widgets:     make(map[string]*core.Widget),
		subscribers: make([]chan Event, 0),
	}
}

// Widget 操作
func AddWidget(w *core.Widget) {
	stateLock.Lock()
	defer stateLock.Unlock()
	state.Widgets[w.ID] = w
}

func GetWidget(id string) *core.Widget {
	stateLock.RLock()
	defer stateLock.RUnlock()
	return state.Widgets[id]
}

func GetAllWidgets() []*core.Widget {
	stateLock.RLock()
	defer stateLock.RUnlock()

	widgets := make([]*core.Widget, 0, len(state.Widgets))
	for _, w := range state.Widgets {
		widgets = append(widgets, w)
	}
	return widgets
}

func UpdateWidget(w *core.Widget) {
	stateLock.Lock()
	defer stateLock.Unlock()
	state.Widgets[w.ID] = w
}

func DeleteWidget(id string) bool {
	stateLock.Lock()
	defer stateLock.Unlock()

	if _, exists := state.Widgets[id]; !exists {
		return false
	}
	delete(state.Widgets, id)
	return true
}

// 选择操作
func SetSelected(id string) {
	stateLock.Lock()
	defer stateLock.Unlock()
	state.SelectedID = id
}

func GetSelected() string {
	stateLock.RLock()
	defer stateLock.RUnlock()
	return state.SelectedID
}
