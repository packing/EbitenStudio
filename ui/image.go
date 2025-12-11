package ui

import (
	"image"

	"github.com/hajimehoshi/ebiten/v2"
)

// ImageWidget 图片控件
type ImageWidget struct {
	BaseWidget

	// 图片资源
	ImageResourceID string `json:"imageResourceId"`
	image           *ebiten.Image

	// 缩放模式
	ScaleMode string `json:"scaleMode"` // fit, fill, stretch, none

	// 源图裁剪区域（相对于原始图片，在缩放前应用）
	ClipX      int `json:"clipX"`
	ClipY      int `json:"clipY"`
	ClipWidth  int `json:"clipWidth"`  // 0表示使用图片剩余宽度
	ClipHeight int `json:"clipHeight"` // 0表示使用图片剩余高度
}

// NewImage 创建图片控件
func NewImage(id string) *ImageWidget {
	return &ImageWidget{
		BaseWidget: BaseWidget{
			ID:          id,
			Type:        TypeImage,
			Visible:     true,
			Interactive: false,
			Width:       200,
			Height:      200,
			Opacity:     100,
		},
		ScaleMode: "fit",
	}
}

// Draw 绘制图片
func (img *ImageWidget) Draw(screen *ebiten.Image, parentX, parentY, parentWidth, parentHeight int) {
	if !img.Visible || img.image == nil {
		return
	}

	// 计算实际位置（支持锚点）
	localX, localY := img.CalculatePosition(parentWidth, parentHeight)
	absX := parentX + localX
	absY := parentY + localY

	// 计算响应式尺寸（支持边界锚定）
	renderWidth, renderHeight := img.CalculateSize(parentWidth, parentHeight, localX, localY)

	// 注意：Image控件不绘制背景色/背景图片
	// 只显示图片本身，保持透明背景

	// 绘制图片
	if img.image != nil {
		img.drawImage(screen, absX, absY)
	}

	// 绘制子控件
	img.BaseWidget.DrawChildren(screen, absX, absY, renderWidth, renderHeight)
}

// drawImage 根据缩放模式绘制图片
func (img *ImageWidget) drawImage(dst *ebiten.Image, x, y int) {
	// 第一步：处理源图裁剪
	clipX := img.ClipX
	clipY := img.ClipY
	clipW := img.ClipWidth
	clipH := img.ClipHeight

	srcW, srcH := img.image.Size()

	// 如果裁剪宽高为0，使用图片剩余尺寸
	if clipW == 0 {
		clipW = srcW - clipX
	}
	if clipH == 0 {
		clipH = srcH - clipY
	}

	// 防止越界
	if clipX < 0 {
		clipX = 0
	}
	if clipY < 0 {
		clipY = 0
	}
	if clipX+clipW > srcW {
		clipW = srcW - clipX
	}
	if clipY+clipH > srcH {
		clipH = srcH - clipY
	}

	// 裁剪图像（如果需要）
	sourceImg := img.image
	if clipX != 0 || clipY != 0 || clipW != srcW || clipH != srcH {
		sourceImg = img.image.SubImage(image.Rectangle{
			Min: image.Point{X: clipX, Y: clipY},
			Max: image.Point{X: clipX + clipW, Y: clipY + clipH},
		}).(*ebiten.Image)
	}

	// 第二步：根据缩放模式计算目标绘制区域
	dstW := float64(img.Width)
	dstH := float64(img.Height)
	srcWidth := float64(clipW)
	srcHeight := float64(clipH)

	op := &ebiten.DrawImageOptions{}

	switch img.ScaleMode {
	case "fit":
		// 等比例缩放，保持宽高比，完整显示（居中）
		scale := dstW / srcWidth
		if dstH/srcHeight < scale {
			scale = dstH / srcHeight
		}

		scaledW := srcWidth * scale
		scaledH := srcHeight * scale

		// 居中
		offsetX := (dstW - scaledW) / 2
		offsetY := (dstH - scaledH) / 2

		op.GeoM.Scale(scale, scale)
		op.GeoM.Translate(float64(x)+offsetX, float64(y)+offsetY)

		// fit模式需要裁剪超出部分
		// 创建一个临时图像作为裁剪区域
		clippedDst := dst.SubImage(image.Rectangle{
			Min: image.Point{X: x, Y: y},
			Max: image.Point{X: x + img.Width, Y: y + img.Height},
		}).(*ebiten.Image)

		// 应用透明度
		if img.Opacity < 100 {
			op.ColorScale.ScaleAlpha(float32(img.Opacity) / 100.0)
		}

		clippedDst.DrawImage(sourceImg, op)
		return

	case "fill":
		// 填充整个区域，保持宽高比，可能裁剪（居中）
		scale := dstW / srcWidth
		if dstH/srcHeight > scale {
			scale = dstH / srcHeight
		}

		scaledW := srcWidth * scale
		scaledH := srcHeight * scale

		// 居中
		offsetX := (dstW - scaledW) / 2
		offsetY := (dstH - scaledH) / 2

		op.GeoM.Scale(scale, scale)
		op.GeoM.Translate(float64(x)+offsetX, float64(y)+offsetY)

	case "stretch":
		// 拉伸填充
		scaleX := dstW / srcWidth
		scaleY := dstH / srcHeight
		op.GeoM.Scale(scaleX, scaleY)
		op.GeoM.Translate(float64(x), float64(y))

	case "none":
		// 不缩放，原始尺寸，左上角对齐
		op.GeoM.Translate(float64(x), float64(y))

		// none模式也需要裁剪超出部分
		clippedDst := dst.SubImage(image.Rectangle{
			Min: image.Point{X: x, Y: y},
			Max: image.Point{X: x + img.Width, Y: y + img.Height},
		}).(*ebiten.Image)

		// 应用透明度
		if img.Opacity < 100 {
			op.ColorScale.ScaleAlpha(float32(img.Opacity) / 100.0)
		}

		clippedDst.DrawImage(sourceImg, op)
		return

	default:
		// 默认fit模式
		scale := dstW / srcWidth
		if dstH/srcHeight < scale {
			scale = dstH / srcHeight
		}

		scaledW := srcWidth * scale
		scaledH := srcHeight * scale

		offsetX := (dstW - scaledW) / 2
		offsetY := (dstH - scaledH) / 2

		op.GeoM.Scale(scale, scale)
		op.GeoM.Translate(float64(x)+offsetX, float64(y)+offsetY)
	}

	// 应用透明度
	if img.Opacity < 100 {
		op.ColorScale.ScaleAlpha(float32(img.Opacity) / 100.0)
	}

	dst.DrawImage(sourceImg, op)
}

// SetImage 设置图片
func (img *ImageWidget) SetImage(image *ebiten.Image) {
	img.image = image
}
