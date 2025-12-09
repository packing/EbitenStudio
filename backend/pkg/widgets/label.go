package widgets

import "ebitenstudio/pkg/core"

func NewLabel(x, y, width, height float64, text string) *core.Widget {
	return &core.Widget{
		Type:   "label",
		X:      x,
		Y:      y,
		Width:  width,
		Height: height,
		Text:   text,
	}
}
