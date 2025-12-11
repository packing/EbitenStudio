package ui

import (
	"github.com/hajimehoshi/ebiten/v2"
)

// PanelWidget 面板控件（容器）
type PanelWidget struct {
	BaseWidget
}

// NewPanel 创建面板
func NewPanel(id string) *PanelWidget {
	return &PanelWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypePanel,
			Visible:     true,
			Interactive: false,
			Width:       400,
			Height:      300,
			Opacity:     100,
		},
	}
}

// Draw 绘制面板
func (p *PanelWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !p.Visible {
		return
	}

	// 计算实际位置（支持锚点）
	localX, localY := p.CalculatePosition(parentWidth, parentHeight)
	absX := parentX + localX
	absY := parentY + localY

	// 计算响应式尺寸（支持边界锚定）
	renderWidth, renderHeight := p.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 创建面板图像
	if p.BackgroundAlpha > 0 || p.backgroundImage != nil {
		panelImage := ebiten.NewImage(renderWidth, renderHeight)

		// 背景颜色
		if p.BackgroundAlpha > 0 {
			bgColor := RGBA{
				R: p.BackgroundColor.R,
				G: p.BackgroundColor.G,
				B: p.BackgroundColor.B,
				A: p.BackgroundAlpha,
			}
			panelImage.Fill(bgColor.ToColor())
		}

		// 背景图片
		if p.backgroundImage != nil {
			op := &ebiten.DrawImageOptions{}
			srcW, srcH := p.backgroundImage.Size()
			scaleX := float64(renderWidth) / float64(srcW)
			scaleY := float64(renderHeight) / float64(srcH)
			op.GeoM.Scale(scaleX, scaleY)
			panelImage.DrawImage(p.backgroundImage, op)
		}

		// 绘制到屏幕
		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(float64(absX), float64(absY))

		if p.Opacity < 100 {
			op.ColorScale.ScaleAlpha(float32(p.Opacity) / 100.0)
		}

		screen.DrawImage(panelImage, op)
	}

	// 绘制子控件（传递Panel自己的绝对坐标和响应式尺寸作为子控件的父容器信息）
	p.BaseWidget.DrawChildren(screen, absX, absY, renderWidth, renderHeight)
}
