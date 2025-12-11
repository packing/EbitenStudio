package ui

import (
	"image"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

// Renderer UI渲染器
type Renderer struct {
	imageCache map[string]*ebiten.Image
}

// NewRenderer 创建渲染器
func NewRenderer() *Renderer {
	return &Renderer{
		imageCache: make(map[string]*ebiten.Image),
	}
}

// DrawWidget 绘制控件
func (r *Renderer) DrawWidget(screen *ebiten.Image, widget Widget, parentX, parentY int) {
	if !widget.IsVisible() {
		return
	}

	absX := parentX + widget.GetX()
	absY := parentY + widget.GetY()
	width := widget.GetWidth()
	height := widget.GetHeight()

	// 创建裁剪区域
	if widget.GetBorderRadius() > 0 {
		// 使用子图像实现圆角裁剪
		clipped := r.createClippedImage(screen, absX, absY, width, height, widget.GetBorderRadius())
		if clipped != nil {
			r.drawBackgroundAndBorder(clipped, widget, 0, 0, width, height)
		}
	} else {
		r.drawBackgroundAndBorder(screen, widget, absX, absY, width, height)
	}

	// 让控件绘制自己的内容（传入父容器尺寸）
	parentWidth := screen.Bounds().Dx()
	parentHeight := screen.Bounds().Dy()
	widget.Draw(screen, parentX, parentY, parentWidth, parentHeight)
}

// drawBackgroundAndBorder 绘制背景和边框
func (r *Renderer) drawBackgroundAndBorder(dst *ebiten.Image, widget Widget, x, y, width, height int) {
	bounds := image.Rect(x, y, x+width, y+height)

	// 绘制背景颜色
	bgColor := widget.GetBackgroundColor()
	if bgColor.A > 0 {
		r.fillRoundedRect(dst, bounds, widget.GetBorderRadius(), bgColor)
	}

	// 绘制背景图片
	bgImage := widget.GetBackgroundImage()
	if bgImage != nil {
		r.drawBackgroundImage(dst, bgImage, bounds, widget.GetBorderRadius())
	}

	// 绘制边框
	borderWidth := widget.GetBorderWidth()
	if borderWidth > 0 {
		borderColor := widget.GetBorderColor()
		r.strokeRoundedRect(dst, bounds, widget.GetBorderRadius(), float32(borderWidth), borderColor)
	}
}

// fillRoundedRect 填充圆角矩形
func (r *Renderer) fillRoundedRect(dst *ebiten.Image, rect image.Rectangle, radius int, col RGBA) {
	if radius <= 0 {
		// 无圆角，直接填充矩形
		vector.DrawFilledRect(dst, float32(rect.Min.X), float32(rect.Min.Y),
			float32(rect.Dx()), float32(rect.Dy()), col.ToColor(), false)
		return
	}

	// 使用 vector 绘制圆角矩形
	x := float32(rect.Min.X)
	y := float32(rect.Min.Y)
	w := float32(rect.Dx())
	h := float32(rect.Dy())
	rad := float32(radius)

	// 限制圆角半径
	maxRadius := float32(math.Min(float64(w), float64(h))) / 2
	if rad > maxRadius {
		rad = maxRadius
	}

	path := &vector.Path{}

	// 从左上角开始，顺时针绘制
	path.MoveTo(x+rad, y)
	path.LineTo(x+w-rad, y)
	path.Arc(x+w-rad, y+rad, rad, -math.Pi/2, 0, vector.Clockwise) // 右上角
	path.LineTo(x+w, y+h-rad)
	path.Arc(x+w-rad, y+h-rad, rad, 0, math.Pi/2, vector.Clockwise) // 右下角
	path.LineTo(x+rad, y+h)
	path.Arc(x+rad, y+h-rad, rad, math.Pi/2, math.Pi, vector.Clockwise) // 左下角
	path.LineTo(x, y+rad)
	path.Arc(x+rad, y+rad, rad, math.Pi, math.Pi*3/2, vector.Clockwise) // 左上角
	path.Close()

	// 填充路径
	vertices, indices := path.AppendVerticesAndIndicesForFilling(nil, nil)
	for i := range vertices {
		vertices[i].ColorR = float32(col.R) / 255
		vertices[i].ColorG = float32(col.G) / 255
		vertices[i].ColorB = float32(col.B) / 255
		vertices[i].ColorA = float32(col.A) / 255
	}
	dst.DrawTriangles(vertices, indices, ebiten.NewImage(1, 1).SubImage(image.Rect(0, 0, 1, 1)).(*ebiten.Image), nil)
}

// strokeRoundedRect 描边圆角矩形
func (r *Renderer) strokeRoundedRect(dst *ebiten.Image, rect image.Rectangle, radius int, width float32, col RGBA) {
	if radius <= 0 {
		// 无圆角，绘制矩形边框
		x := float32(rect.Min.X)
		y := float32(rect.Min.Y)
		w := float32(rect.Dx())
		h := float32(rect.Dy())
		c := col.ToColor()

		vector.StrokeLine(dst, x, y, x+w, y, width, c, false)     // 上
		vector.StrokeLine(dst, x+w, y, x+w, y+h, width, c, false) // 右
		vector.StrokeLine(dst, x+w, y+h, x, y+h, width, c, false) // 下
		vector.StrokeLine(dst, x, y+h, x, y, width, c, false)     // 左
		return
	}

	// 使用 vector 绘制圆角矩形边框
	x := float32(rect.Min.X)
	y := float32(rect.Min.Y)
	w := float32(rect.Dx())
	h := float32(rect.Dy())
	rad := float32(radius)

	maxRadius := float32(math.Min(float64(w), float64(h))) / 2
	if rad > maxRadius {
		rad = maxRadius
	}

	path := &vector.Path{}

	path.MoveTo(x+rad, y)
	path.LineTo(x+w-rad, y)
	path.Arc(x+w-rad, y+rad, rad, -math.Pi/2, 0, vector.Clockwise)
	path.LineTo(x+w, y+h-rad)
	path.Arc(x+w-rad, y+h-rad, rad, 0, math.Pi/2, vector.Clockwise)
	path.LineTo(x+rad, y+h)
	path.Arc(x+rad, y+h-rad, rad, math.Pi/2, math.Pi, vector.Clockwise)
	path.LineTo(x, y+rad)
	path.Arc(x+rad, y+rad, rad, math.Pi, math.Pi*3/2, vector.Clockwise)
	path.Close()

	vertices, indices := path.AppendVerticesAndIndicesForStroke(nil, nil, &vector.StrokeOptions{
		Width: width,
	})
	for i := range vertices {
		vertices[i].ColorR = float32(col.R) / 255
		vertices[i].ColorG = float32(col.G) / 255
		vertices[i].ColorB = float32(col.B) / 255
		vertices[i].ColorA = float32(col.A) / 255
	}
	dst.DrawTriangles(vertices, indices, ebiten.NewImage(1, 1).SubImage(image.Rect(0, 0, 1, 1)).(*ebiten.Image), nil)
}

// drawBackgroundImage 绘制背景图片
func (r *Renderer) drawBackgroundImage(dst *ebiten.Image, src *ebiten.Image, bounds image.Rectangle, radius int) {
	// TODO: 实现9-patch支持
	// 目前简单拉伸绘制
	op := &ebiten.DrawImageOptions{}

	srcW, srcH := src.Size()
	dstW := float64(bounds.Dx())
	dstH := float64(bounds.Dy())

	op.GeoM.Scale(dstW/float64(srcW), dstH/float64(srcH))
	op.GeoM.Translate(float64(bounds.Min.X), float64(bounds.Min.Y))

	dst.DrawImage(src, op)
}

// createClippedImage 创建裁剪区域图像
func (r *Renderer) createClippedImage(screen *ebiten.Image, x, y, width, height, radius int) *ebiten.Image {
	// 创建临时图像作为遮罩
	mask := ebiten.NewImage(width, height)

	// 绘制圆角矩形遮罩
	r.fillRoundedRect(mask, image.Rect(0, 0, width, height), radius, RGBA{255, 255, 255, 255})

	// 使用遮罩裁剪
	clipped := ebiten.NewImage(width, height)
	op := &ebiten.DrawImageOptions{}
	op.Blend = ebiten.BlendSourceIn
	clipped.DrawImage(mask, op)

	return clipped
}

// LoadImage 加载图片到缓存
func (r *Renderer) LoadImage(id string, img *ebiten.Image) {
	r.imageCache[id] = img
}

// GetImage 从缓存获取图片
func (r *Renderer) GetImage(id string) *ebiten.Image {
	return r.imageCache[id]
}
