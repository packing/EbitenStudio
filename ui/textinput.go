package ui

import (
	"image/color"
	"strings"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
	"github.com/hajimehoshi/ebiten/v2/text"
	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
)

// TextInputState 文本输入状态
type TextInputState string

const (
	TextInputStateNormal   TextInputState = "normal"
	TextInputStateEditing  TextInputState = "editing"
	TextInputStateDisabled TextInputState = "disabled"
)

// TextInputWidget 文本输入控件
type TextInputWidget struct {
	BaseWidget

	// 三态背景颜色
	BackgroundColorNormal        RGBA  `json:"backgroundColorNormal"`
	BackgroundColorNormalAlpha   uint8 `json:"backgroundColorNormalAlpha"`
	BackgroundColorEditing       RGBA  `json:"backgroundColorEditing"`
	BackgroundColorEditingAlpha  uint8 `json:"backgroundColorEditingAlpha"`
	BackgroundColorDisabled      RGBA  `json:"backgroundColorDisabled"`
	BackgroundColorDisabledAlpha uint8 `json:"backgroundColorDisabledAlpha"`

	// 三态背景资源
	BackgroundResourceNormal   string `json:"backgroundResourceNormal"`
	BackgroundResourceEditing  string `json:"backgroundResourceEditing"`
	BackgroundResourceDisabled string `json:"backgroundResourceDisabled"`

	backgroundImageNormal   *ebiten.Image
	backgroundImageEditing  *ebiten.Image
	backgroundImageDisabled *ebiten.Image

	// 文本属性
	Text            string `json:"text"`
	PlaceholderText string `json:"placeholderText"`
	TextColor       RGBA   `json:"textColor"`
	TextColorAlpha  uint8  `json:"textColorAlpha"`
	FontSize        int    `json:"fontSize"`
	MaxLength       int    `json:"maxLength"`

	// 状态
	CurrentState TextInputState
	Enabled      bool
	Focused      bool

	// 光标
	CursorPos     int
	CursorVisible bool
	cursorTimer   time.Time

	// 字体
	Font font.Face
}

// NewTextInput 创建文本输入框
func NewTextInput(id string) *TextInputWidget {
	return &TextInputWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeTextInput,
			Visible:     true,
			Interactive: true,
			Width:       200,
			Height:      32,
			Opacity:     100,
		},
		BackgroundColorNormal:        RGBA{255, 255, 255, 255},
		BackgroundColorNormalAlpha:   255,
		BackgroundColorEditing:       RGBA{255, 255, 240, 255},
		BackgroundColorEditingAlpha:  255,
		BackgroundColorDisabled:      RGBA{240, 240, 240, 255},
		BackgroundColorDisabledAlpha: 255,
		Text:                         "",
		PlaceholderText:              "Enter text...",
		TextColor:                    RGBA{0, 0, 0, 255},
		TextColorAlpha:               255,
		FontSize:                     14,
		MaxLength:                    100,
		CurrentState:                 TextInputStateNormal,
		Enabled:                      true,
		Focused:                      false,
		CursorPos:                    0,
		CursorVisible:                true,
		Font:                         basicfont.Face7x13,
	}
}

// GetStateBackground 获取当前状态的背景属性
func (t *TextInputWidget) GetStateBackground() (RGBA, *ebiten.Image) {
	if !t.Enabled {
		bgColor := RGBA{
			R: t.BackgroundColorDisabled.R,
			G: t.BackgroundColorDisabled.G,
			B: t.BackgroundColorDisabled.B,
			A: t.BackgroundColorDisabledAlpha,
		}
		return bgColor, t.backgroundImageDisabled
	}

	if t.CurrentState == TextInputStateEditing {
		bgColor := RGBA{
			R: t.BackgroundColorEditing.R,
			G: t.BackgroundColorEditing.G,
			B: t.BackgroundColorEditing.B,
			A: t.BackgroundColorEditingAlpha,
		}
		return bgColor, t.backgroundImageEditing
	}

	bgColor := RGBA{
		R: t.BackgroundColorNormal.R,
		G: t.BackgroundColorNormal.G,
		B: t.BackgroundColorNormal.B,
		A: t.BackgroundColorNormalAlpha,
	}
	return bgColor, t.backgroundImageNormal
}

// Update 更新文本输入框
func (t *TextInputWidget) Update() error {
	if !t.Interactive || !t.Enabled {
		return t.BaseWidget.Update()
	}

	// 处理焦点
	if inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft) {
		x, y := ebiten.CursorPosition()
		if t.OnHover(x, y) {
			t.Focused = true
			t.CurrentState = TextInputStateEditing
		} else {
			t.Focused = false
			t.CurrentState = TextInputStateNormal
		}
	}

	// 处理输入
	if t.Focused {
		// 光标闪烁
		if time.Since(t.cursorTimer) > 500*time.Millisecond {
			t.CursorVisible = !t.CursorVisible
			t.cursorTimer = time.Now()
		}

		// 处理字符输入
		chars := ebiten.AppendInputChars(nil)
		for _, ch := range chars {
			if len(t.Text) < t.MaxLength {
				runes := []rune(t.Text)
				runes = append(runes[:t.CursorPos], append([]rune{ch}, runes[t.CursorPos:]...)...)
				t.Text = string(runes)
				t.CursorPos++
			}
		}

		// 处理退格
		if inpututil.IsKeyJustPressed(ebiten.KeyBackspace) && t.CursorPos > 0 {
			runes := []rune(t.Text)
			runes = append(runes[:t.CursorPos-1], runes[t.CursorPos:]...)
			t.Text = string(runes)
			t.CursorPos--
		}

		// 处理删除
		if inpututil.IsKeyJustPressed(ebiten.KeyDelete) && t.CursorPos < len([]rune(t.Text)) {
			runes := []rune(t.Text)
			runes = append(runes[:t.CursorPos], runes[t.CursorPos+1:]...)
			t.Text = string(runes)
		}

		// 处理左右箭头
		if inpututil.IsKeyJustPressed(ebiten.KeyLeft) && t.CursorPos > 0 {
			t.CursorPos--
		}
		if inpututil.IsKeyJustPressed(ebiten.KeyRight) && t.CursorPos < len([]rune(t.Text)) {
			t.CursorPos++
		}

		// 处理Home/End
		if inpututil.IsKeyJustPressed(ebiten.KeyHome) {
			t.CursorPos = 0
		}
		if inpututil.IsKeyJustPressed(ebiten.KeyEnd) {
			t.CursorPos = len([]rune(t.Text))
		}
	}

	return t.BaseWidget.Update()
}

// Draw 绘制文本输入框
func (t *TextInputWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !t.Visible {
		return
	}

	// 计算实际位置（支持锚点）
	localX, localY := t.CalculatePosition(parentWidth, parentHeight)
	absX := parentX + localX
	absY := parentY + localY

	// 计算响应式尺寸（支持边界锚定）
	renderWidth, renderHeight := t.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 创建输入框图像
	inputImage := ebiten.NewImage(renderWidth, renderHeight)

	// 绘制背景
	bgColor, bgImage := t.GetStateBackground()
	if bgColor.A > 0 {
		inputImage.Fill(bgColor.ToColor())
	}

	if bgImage != nil {
		op := &ebiten.DrawImageOptions{}
		srcW, srcH := bgImage.Size()
		scaleX := float64(renderWidth) / float64(srcW)
		scaleY := float64(renderHeight) / float64(srcH)
		op.GeoM.Scale(scaleX, scaleY)
		inputImage.DrawImage(bgImage, op)
	}

	// 绘制边框
	if t.BorderWidth > 0 {
		// TODO: 实现边框绘制
	}

	// 绘制文本
	t.drawText(inputImage)

	// 将输入框绘制到屏幕
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(float64(absX), float64(absY))

	if t.Opacity < 100 {
		op.ColorScale.ScaleAlpha(float32(t.Opacity) / 100.0)
	}

	screen.DrawImage(inputImage, op)

	// 绘制子控件
	t.BaseWidget.DrawChildren(screen, absX, absY, renderWidth, renderHeight)
}

// drawText 绘制文本和光标
func (t *TextInputWidget) drawText(dst *ebiten.Image) {
	if t.Font == nil {
		t.Font = basicfont.Face7x13
	}

	textColor := color.RGBA{
		R: t.TextColor.R,
		G: t.TextColor.G,
		B: t.TextColor.B,
		A: t.TextColorAlpha,
	}

	displayText := t.Text
	if displayText == "" && !t.Focused {
		// 显示占位符
		displayText = t.PlaceholderText
		textColor.A = 128 // 半透明
	}

	// 绘制文本
	textX := t.Padding.Left + 5
	textY := t.Height/2 + 7
	text.Draw(dst, displayText, t.Font, textX, textY, textColor)

	// 绘制光标
	if t.Focused && t.CursorVisible {
		cursorText := string([]rune(t.Text)[:t.CursorPos])
		cursorBounds := text.BoundString(t.Font, cursorText)
		cursorX := textX + cursorBounds.Dx()
		cursorY1 := t.Height/2 - 8
		cursorY2 := t.Height/2 + 8

		// 绘制光标线
		for i := 0; i < 2; i++ {
			for y := cursorY1; y <= cursorY2; y++ {
				dst.Set(cursorX+i, y, textColor)
			}
		}
	}
}

// SetEnabled 设置启用状态
func (t *TextInputWidget) SetEnabled(enabled bool) {
	t.Enabled = enabled
	if !enabled {
		t.CurrentState = TextInputStateDisabled
		t.Focused = false
	} else {
		t.CurrentState = TextInputStateNormal
	}
}

// SetText 设置文本
func (t *TextInputWidget) SetText(text string) {
	text = strings.TrimSpace(text)
	if len(text) > t.MaxLength {
		text = text[:t.MaxLength]
	}
	t.Text = text
	t.CursorPos = len([]rune(text))
}

// GetText 获取文本
func (t *TextInputWidget) GetText() string {
	return t.Text
}
