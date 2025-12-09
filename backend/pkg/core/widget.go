package core

type Widget struct {
	ID     string  `json:"id"`
	Type   string  `json:"type"` // button, label, panel, etc.
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Text   string  `json:"text"`
}
