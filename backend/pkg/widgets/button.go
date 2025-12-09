package widgets

import "ebitenstudio/pkg/core"

func NewButton(x, y, width, height float64, text string) *core.Widget {
	return &core.Widget{
		Type:   "button",
		X:      x,
		Y:      y,
		Width:  width,
		Height: height,
		Text:   text,
	}
}
