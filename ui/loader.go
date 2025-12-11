package ui

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"golang.org/x/image/font"
	"golang.org/x/image/font/opentype"
)

// ResourceManifest 资源清单
type ResourceManifest struct {
	Version   int            `json:"version"`
	Count     int            `json:"count"`
	Resources []ResourceInfo `json:"resources"`
}

// ResourceInfo 单个资源信息
type ResourceInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Offset int    `json:"offset"`
	Size   int    `json:"size"`
}

// Loader UI加载器（支持pak格式）
type Loader struct {
	imageCache   map[string]*ebiten.Image
	pakData      []byte
	manifest     *ResourceManifest
	pakHash      string
	resourcePath string // UI文件所在目录
}

// NewLoader 创建加载器
func NewLoader() *Loader {
	return &Loader{
		imageCache: make(map[string]*ebiten.Image),
	}
}

// LoadFromFile 从UI文件加载（支持.ui格式和旧的.json格式）
func (l *Loader) LoadFromFile(filename string) ([]Widget, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("read file error: %w", err)
	}

	var layoutData map[string]interface{}
	if err := json.Unmarshal(data, &layoutData); err != nil {
		return nil, fmt.Errorf("parse json error: %w", err)
	}

	// 保存文件路径，用于定位pak文件
	l.resourcePath = filepath.Dir(filename)

	// 检查是否有resourcePackHash（新格式）
	if hash, ok := layoutData["resourcePackHash"].(string); ok && hash != "" {
		l.pakHash = hash

		// 加载资源包
		if err := l.loadResourcePack(filename, hash); err != nil {
			return nil, fmt.Errorf("load resource pack error: %w", err)
		}
	}

	return l.LoadFromData(layoutData)
}

// loadResourcePack 加载资源包文件
func (l *Loader) loadResourcePack(uiFilePath, expectedHash string) error {
	// 查找pak文件
	// 规则：<basename>_<hash前8位>.pak
	baseName := strings.TrimSuffix(filepath.Base(uiFilePath), filepath.Ext(uiFilePath))
	hashPrefix := expectedHash[:8]
	pakFileName := fmt.Sprintf("%s_%s.pak", baseName, hashPrefix)
	pakFilePath := filepath.Join(l.resourcePath, pakFileName)

	// 读取pak文件
	pakData, err := os.ReadFile(pakFilePath)
	if err != nil {
		return fmt.Errorf("pak file not found: %s", pakFilePath)
	}

	// 验证hash
	actualHash := sha256.Sum256(pakData)
	actualHashStr := hex.EncodeToString(actualHash[:])

	if actualHashStr != expectedHash {
		return fmt.Errorf("pak file hash mismatch: expected=%s, actual=%s",
			expectedHash, actualHashStr)
	}

	l.pakData = pakData
	return nil
}

// LoadFromData 从数据加载UI
func (l *Loader) LoadFromData(data map[string]interface{}) ([]Widget, error) {
	// 解析资源清单（如果有）
	if manifestData, ok := data["resourceManifest"].(map[string]interface{}); ok {
		l.manifest = l.parseManifest(manifestData)
	}

	// 解析widgets数组
	widgetsData, ok := data["widgets"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid widgets data")
	}

	var widgets []Widget
	widgetMap := make(map[string]Widget)

	// 第一遍：创建所有控件
	for _, widgetData := range widgetsData {
		widgetObj, ok := widgetData.(map[string]interface{})
		if !ok {
			continue
		}

		widget, err := l.createWidget(widgetObj)
		if err != nil {
			return nil, err
		}

		widgets = append(widgets, widget)
		widgetMap[widget.GetID()] = widget
	}

	// 第二遍：建立父子关系
	for _, widget := range widgets {
		parentID := widget.GetParentID()
		if parentID != "" {
			if parent, exists := widgetMap[parentID]; exists {
				parent.AddChild(widget)
			}
		}
	}

	// 返回根控件（没有父控件的）
	var rootWidgets []Widget
	for _, widget := range widgets {
		if widget.GetParentID() == "" {
			rootWidgets = append(rootWidgets, widget)
		}
	}

	return rootWidgets, nil
}

// parseManifest 解析资源清单
func (l *Loader) parseManifest(data map[string]interface{}) *ResourceManifest {
	manifest := &ResourceManifest{}

	if version, ok := data["version"].(float64); ok {
		manifest.Version = int(version)
	}
	if count, ok := data["count"].(float64); ok {
		manifest.Count = int(count)
	}

	log.Printf("[Loader] Parsing resource manifest: version=%d, count=%d", manifest.Version, manifest.Count)

	if resourcesData, ok := data["resources"].([]interface{}); ok {
		log.Printf("[Loader] Found %d resources in manifest", len(resourcesData))
		for i, resData := range resourcesData {
			if resObj, ok := resData.(map[string]interface{}); ok {
				info := ResourceInfo{}
				if id, ok := resObj["id"].(string); ok {
					info.ID = id
				}
				if name, ok := resObj["name"].(string); ok {
					info.Name = name
				}
				if resType, ok := resObj["type"].(string); ok {
					info.Type = resType
				}
				if offset, ok := resObj["offset"].(float64); ok {
					info.Offset = int(offset)
				}
				if size, ok := resObj["size"].(float64); ok {
					info.Size = int(size)
				}
				log.Printf("[Loader]   Resource[%d]: ID=%s, Name=%s, Type=%s, Offset=%d, Size=%d",
					i, info.ID, info.Name, info.Type, info.Offset, info.Size)
				manifest.Resources = append(manifest.Resources, info)
			}
		}
	} else {
		log.Printf("[Loader] No resources array in manifest")
	}

	return manifest
}

// getResourceData 从pak文件中提取资源数据
func (l *Loader) getResourceData(resourceID string) ([]byte, error) {
	if l.manifest == nil || l.pakData == nil {
		return nil, fmt.Errorf("no resource pack loaded")
	}

	// 查找资源信息
	for _, resInfo := range l.manifest.Resources {
		if resInfo.ID == resourceID {
			// 提取数据
			if resInfo.Offset+resInfo.Size > len(l.pakData) {
				return nil, fmt.Errorf("resource data out of bounds: %s", resourceID)
			}
			return l.pakData[resInfo.Offset : resInfo.Offset+resInfo.Size], nil
		}
	}

	return nil, fmt.Errorf("resource not found: %s", resourceID)
}

// createWidget 创建控件实例
func (l *Loader) createWidget(data map[string]interface{}) (Widget, error) {
	widgetType, _ := data["type"].(string)

	var widget Widget

	switch WidgetType(widgetType) {
	case TypeButton:
		widget = l.createButton(data)
	case TypeLabel:
		widget = l.createLabel(data)
	case TypeTextInput:
		widget = l.createTextInput(data)
	case TypeSlider:
		widget = l.createSlider(data)
	case TypeComboBox:
		widget = l.createComboBox(data)
	case TypeCheckBox:
		widget = l.createCheckBox(data)
	case TypeRadioButton:
		widget = l.createRadioButton(data)
	case TypePanel:
		widget = l.createPanel(data)
	case TypeImage:
		widget = l.createImage(data)
	case TypeListView:
		widget = l.createListView(data)
	case TypeGridView:
		widget = l.createGridView(data)
	case TypeTableView:
		widget = l.createTableView(data)
	default:
		return nil, fmt.Errorf("unsupported widget type: %s", widgetType)
	}

	// 设置基础属性
	l.setBaseProperties(widget, data)

	return widget, nil
}

// setBaseProperties 设置控件基础属性
func (l *Loader) setBaseProperties(widget Widget, data map[string]interface{}) {
	// 使用类型switch获取BaseWidget指针
	var base *BaseWidget
	switch w := widget.(type) {
	case *ButtonWidget:
		base = &w.BaseWidget
	case *LabelWidget:
		base = &w.BaseWidget
	case *TextInputWidget:
		base = &w.BaseWidget
	case *PanelWidget:
		base = &w.BaseWidget
	case *ImageWidget:
		base = &w.BaseWidget
	case *ListViewWidget:
		base = &w.BaseWidget
	case *GridViewWidget:
		base = &w.BaseWidget
	case *TableViewWidget:
		base = &w.BaseWidget
	case *ComboBoxWidget:
		base = &w.BaseWidget
	case *SliderWidget:
		base = &w.BaseWidget
	case *CheckBoxWidget:
		base = &w.BaseWidget
	case *RadioButtonWidget:
		base = &w.BaseWidget
	default:
		return
	}

	if id, ok := data["id"].(string); ok {
		base.ID = id
	}
	if parentID, ok := data["parentId"].(string); ok {
		base.ParentID = parentID
	}
	if x, ok := data["x"].(float64); ok {
		base.X = int(x)
	}
	if y, ok := data["y"].(float64); ok {
		base.Y = int(y)
	}
	if width, ok := data["width"].(float64); ok {
		base.Width = int(width)
	}
	if height, ok := data["height"].(float64); ok {
		base.Height = int(height)
	}
	if zIndex, ok := data["zIndex"].(float64); ok {
		base.ZIndex = int(zIndex)
	}
	if visible, ok := data["visible"].(bool); ok {
		base.Visible = visible
	}
	if interactive, ok := data["interactive"].(bool); ok {
		base.Interactive = interactive
	}

	// 解析颜色
	if bgColor, ok := data["backgroundColor"].(string); ok {
		base.BackgroundColor = l.parseColor(bgColor)
	}
	if bgAlpha, ok := data["backgroundColorAlpha"].(float64); ok {
		base.BackgroundAlpha = uint8(bgAlpha)
	}
	if borderColor, ok := data["borderColor"].(string); ok {
		base.BorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["borderColorAlpha"].(float64); ok {
		base.BorderAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["borderWidth"].(float64); ok {
		base.BorderWidth = int(borderWidth)
	}
	if borderRadius, ok := data["borderRadius"].(float64); ok {
		base.BorderRadius = int(borderRadius)
	}
	if opacity, ok := data["opacity"].(float64); ok {
		base.Opacity = int(opacity)
	}

	// 解析锚点定位属性
	if positionMode, ok := data["positionMode"].(string); ok {
		base.PositionMode = positionMode
	}
	if anchorX, ok := data["anchorX"].(string); ok {
		base.AnchorX = anchorX
	}
	if anchorY, ok := data["anchorY"].(string); ok {
		base.AnchorY = anchorY
	}
	if offsetX, ok := data["offsetX"].(float64); ok {
		base.OffsetX = int(offsetX)
	}
	if offsetY, ok := data["offsetY"].(float64); ok {
		base.OffsetY = int(offsetY)
	}

	// 解析边界锚定属性
	if anchorLeft, ok := data["anchorLeft"].(bool); ok {
		base.AnchorLeft = anchorLeft
	}
	if anchorRight, ok := data["anchorRight"].(bool); ok {
		base.AnchorRight = anchorRight
	}
	if anchorTop, ok := data["anchorTop"].(bool); ok {
		base.AnchorTop = anchorTop
	}
	if anchorBottom, ok := data["anchorBottom"].(bool); ok {
		base.AnchorBottom = anchorBottom
	}
	if designMarginRight, ok := data["designMarginRight"].(float64); ok {
		base.DesignMarginRight = int(designMarginRight)
	}
	if designMarginBottom, ok := data["designMarginBottom"].(float64); ok {
		base.DesignMarginBottom = int(designMarginBottom)
	}

	// 解析Padding
	if padding, ok := data["padding"].(map[string]interface{}); ok {
		if top, ok := padding["top"].(float64); ok {
			base.Padding.Top = int(top)
		}
		if right, ok := padding["right"].(float64); ok {
			base.Padding.Right = int(right)
		}
		if bottom, ok := padding["bottom"].(float64); ok {
			base.Padding.Bottom = int(bottom)
		}
		if left, ok := padding["left"].(float64); ok {
			base.Padding.Left = int(left)
		}
	}

	// 解析Margin
	if margin, ok := data["margin"].(map[string]interface{}); ok {
		if top, ok := margin["top"].(float64); ok {
			base.Margin.Top = int(top)
		}
		if right, ok := margin["right"].(float64); ok {
			base.Margin.Right = int(right)
		}
		if bottom, ok := margin["bottom"].(float64); ok {
			base.Margin.Bottom = int(bottom)
		}
		if left, ok := margin["left"].(float64); ok {
			base.Margin.Left = int(left)
		}
	}

	// 加载背景图片
	if bgResourceID, ok := data["backgroundResourceId"].(string); ok {
		if bgResourceID != "" {
			base.BackgroundResourceID = bgResourceID
			base.backgroundImage = l.loadImage(bgResourceID)
		}
	}
}

// createButton 创建按钮
func (l *Loader) createButton(data map[string]interface{}) *ButtonWidget {
	btn := NewButton("")

	if text, ok := data["text"].(string); ok {
		btn.Text = text
	}
	if textColor, ok := data["textColor"].(string); ok {
		btn.TextColor = l.parseColor(textColor)
	}
	if textColorAlpha, ok := data["textColorAlpha"].(float64); ok {
		btn.TextColorAlpha = uint8(textColorAlpha)
	}
	if fontSize, ok := data["fontSize"].(float64); ok {
		btn.FontSize = int(fontSize)
	}
	if textAlign, ok := data["textAlignment"].(string); ok {
		btn.TextAlignment = textAlign
	}

	// 三态背景颜色
	if bgNormal, ok := data["backgroundColorNormal"].(string); ok {
		btn.BackgroundColorNormal = l.parseColor(bgNormal)
	}
	if bgNormalAlpha, ok := data["backgroundColorNormalAlpha"].(float64); ok {
		btn.BackgroundColorNormalAlpha = uint8(bgNormalAlpha)
	}
	if bgPressed, ok := data["backgroundColorPressed"].(string); ok {
		btn.BackgroundColorPressed = l.parseColor(bgPressed)
	}
	if bgPressedAlpha, ok := data["backgroundColorPressedAlpha"].(float64); ok {
		btn.BackgroundColorPressedAlpha = uint8(bgPressedAlpha)
	}
	if bgDisabled, ok := data["backgroundColorDisabled"].(string); ok {
		btn.BackgroundColorDisabled = l.parseColor(bgDisabled)
	}
	if bgDisabledAlpha, ok := data["backgroundColorDisabledAlpha"].(float64); ok {
		btn.BackgroundColorDisabledAlpha = uint8(bgDisabledAlpha)
	}

	// 三态背景资源
	if resNormal, ok := data["backgroundResourceNormal"].(string); ok {
		btn.BackgroundResourceNormal = resNormal
		btn.backgroundImageNormal = l.loadImage(resNormal)
	}
	if resPressed, ok := data["backgroundResourcePressed"].(string); ok {
		btn.BackgroundResourcePressed = resPressed
		btn.backgroundImagePressed = l.loadImage(resPressed)
	}
	if resDisabled, ok := data["backgroundResourceDisabled"].(string); ok {
		btn.BackgroundResourceDisabled = resDisabled
		btn.backgroundImageDisabled = l.loadImage(resDisabled)
	}

	if enabled, ok := data["enabled"].(bool); ok {
		btn.SetEnabled(enabled)
	}

	// 解析字体资源
	if fontResourceID, ok := data["fontResourceId"].(string); ok {
		if fontResourceID != "" {
			log.Printf("[Loader] Button '%s' has fontResourceId: %s", btn.ID, fontResourceID)
			fontFace := l.loadFont(fontResourceID)
			if fontFace != nil {
				btn.Font = fontFace
				log.Printf("[Loader] Font loaded successfully for button '%s'", btn.ID)
			} else {
				log.Printf("[Loader] Failed to load font for button '%s'", btn.ID)
			}
		}
	} else {
		log.Printf("[Loader] Button '%s' has no fontResourceId field", btn.ID)
	}

	return btn
}

// createLabel 创建标签
func (l *Loader) createLabel(data map[string]interface{}) *LabelWidget {
	label := NewLabel("")

	if text, ok := data["text"].(string); ok {
		label.Text = text
	}
	if textColor, ok := data["textColor"].(string); ok {
		label.TextColor = l.parseColor(textColor)
	}
	if textColorAlpha, ok := data["textColorAlpha"].(float64); ok {
		label.TextColorAlpha = uint8(textColorAlpha)
	}
	if fontSize, ok := data["fontSize"].(float64); ok {
		label.FontSize = int(fontSize)
	}
	if textAlign, ok := data["textAlignment"].(string); ok {
		label.TextAlignment = textAlign
		log.Printf("[Loader] Label '%s' textAlignment set to: %s", label.ID, textAlign)
	} else {
		log.Printf("[Loader] Label '%s' has no textAlignment field, using default: %s", label.ID, label.TextAlignment)
	}
	if vertAlign, ok := data["verticalAlign"].(string); ok {
		label.VerticalAlign = vertAlign
		log.Printf("[Loader] Label '%s' verticalAlign set to: %s", label.ID, vertAlign)
	}
	if wordWrap, ok := data["wordWrap"].(bool); ok {
		label.WordWrap = wordWrap
	}

	// 解析字体资源
	if fontResourceID, ok := data["fontResourceId"].(string); ok {
		if fontResourceID != "" {
			log.Printf("[Loader] Label '%s' has fontResourceId: %s", label.ID, fontResourceID)
			fontFace := l.loadFont(fontResourceID)
			if fontFace != nil {
				label.Font = fontFace
				log.Printf("[Loader] Font loaded successfully for label '%s'", label.ID)
			} else {
				log.Printf("[Loader] Failed to load font for label '%s'", label.ID)
			}
		}
	} else {
		log.Printf("[Loader] Label '%s' has no fontResourceId field", label.ID)
	}

	return label
}

// createTextInput 创建文本输入框
func (l *Loader) createTextInput(data map[string]interface{}) *TextInputWidget {
	input := NewTextInput("")

	if text, ok := data["text"].(string); ok {
		input.Text = text
	}
	if placeholder, ok := data["placeholderText"].(string); ok {
		input.PlaceholderText = placeholder
	}
	if textColor, ok := data["textColor"].(string); ok {
		input.TextColor = l.parseColor(textColor)
	}
	if textColorAlpha, ok := data["textColorAlpha"].(float64); ok {
		input.TextColorAlpha = uint8(textColorAlpha)
	}
	if fontSize, ok := data["fontSize"].(float64); ok {
		input.FontSize = int(fontSize)
	}
	if maxLength, ok := data["maxLength"].(float64); ok {
		input.MaxLength = int(maxLength)
	}

	// 三态背景
	if bgNormal, ok := data["backgroundColorNormal"].(string); ok {
		input.BackgroundColorNormal = l.parseColor(bgNormal)
	}
	if bgNormalAlpha, ok := data["backgroundColorNormalAlpha"].(float64); ok {
		input.BackgroundColorNormalAlpha = uint8(bgNormalAlpha)
	}
	if bgEditing, ok := data["backgroundColorEditing"].(string); ok {
		input.BackgroundColorEditing = l.parseColor(bgEditing)
	}
	if bgEditingAlpha, ok := data["backgroundColorEditingAlpha"].(float64); ok {
		input.BackgroundColorEditingAlpha = uint8(bgEditingAlpha)
	}
	if bgDisabled, ok := data["backgroundColorDisabled"].(string); ok {
		input.BackgroundColorDisabled = l.parseColor(bgDisabled)
	}
	if bgDisabledAlpha, ok := data["backgroundColorDisabledAlpha"].(float64); ok {
		input.BackgroundColorDisabledAlpha = uint8(bgDisabledAlpha)
	}

	if enabled, ok := data["enabled"].(bool); ok {
		input.SetEnabled(enabled)
	}

	return input
}

// createPanel 创建面板
func (l *Loader) createPanel(data map[string]interface{}) *PanelWidget {
	panel := NewPanel("")
	return panel
}

// createImage 创建图片
func (l *Loader) createImage(data map[string]interface{}) *ImageWidget {
	img := NewImage("")

	if resourceID, ok := data["imageResourceId"].(string); ok {
		img.ImageResourceID = resourceID
		img.image = l.loadImage(resourceID)
	}
	if scaleMode, ok := data["scaleMode"].(string); ok {
		img.ScaleMode = scaleMode
	}

	return img
}

// createComboBox 创建下拉选择框
func (l *Loader) createComboBox(data map[string]interface{}) *ComboBoxWidget {
	combo := NewComboBox("", 0, 0, 200, 35)

	// 解析选项列表
	if items, ok := data["items"].([]interface{}); ok {
		combo.Items = make([]string, 0, len(items))
		for _, item := range items {
			if itemStr, ok := item.(string); ok {
				combo.Items = append(combo.Items, itemStr)
			}
		}
	}

	// 解析选中索引
	if selectedIndex, ok := data["selectedIndex"].(float64); ok {
		combo.SelectedIndex = int(selectedIndex)
	}

	// 解析占位符文本
	if placeholder, ok := data["placeholderText"].(string); ok {
		combo.PlaceholderText = placeholder
	}

	// 解析最大可见项数量
	if maxVisible, ok := data["maxVisibleItems"].(float64); ok {
		combo.MaxVisibleItems = int(maxVisible)
	}

	// 解析背景颜色
	if bgColor, ok := data["backgroundColor"].(string); ok {
		combo.BackgroundColor = l.parseColor(bgColor)
	}
	if bgAlpha, ok := data["backgroundColorAlpha"].(float64); ok {
		combo.BackgroundColorAlpha = uint8(bgAlpha)
	}

	// 解析边框
	if borderColor, ok := data["borderColor"].(string); ok {
		combo.BorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["borderColorAlpha"].(float64); ok {
		combo.BorderColorAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["borderWidth"].(float64); ok {
		combo.BorderWidth = int(borderWidth)
	}

	// 解析下拉框背景
	if dropdownBg, ok := data["dropdownBgColor"].(string); ok {
		combo.DropdownBgColor = l.parseColor(dropdownBg)
	}
	if dropdownAlpha, ok := data["dropdownBgColorAlpha"].(float64); ok {
		combo.DropdownBgColorAlpha = uint8(dropdownAlpha)
	}

	// 解析项高度
	if itemHeight, ok := data["itemHeight"].(float64); ok {
		combo.ItemHeight = int(itemHeight)
	}

	// 解析选中项背景
	if selectedBg, ok := data["selectedBgColor"].(string); ok {
		combo.SelectedBgColor = l.parseColor(selectedBg)
	}
	if selectedAlpha, ok := data["selectedBgColorAlpha"].(float64); ok {
		combo.SelectedBgColorAlpha = uint8(selectedAlpha)
	}

	// 解析悬停项背景
	if hoverBg, ok := data["hoverBgColor"].(string); ok {
		combo.HoverBgColor = l.parseColor(hoverBg)
	}
	if hoverAlpha, ok := data["hoverBgColorAlpha"].(float64); ok {
		combo.HoverBgColorAlpha = uint8(hoverAlpha)
	}

	// 解析文本颜色
	if textColor, ok := data["textColor"].(string); ok {
		combo.TextColor = l.parseColor(textColor)
	}
	if textAlpha, ok := data["textColorAlpha"].(float64); ok {
		combo.TextColorAlpha = uint8(textAlpha)
	}

	// 解析字体大小
	if fontSize, ok := data["fontSize"].(float64); ok {
		combo.FontSize = int(fontSize)
	}

	// 解析箭头颜色
	if arrowColor, ok := data["arrowColor"].(string); ok {
		combo.ArrowColor = l.parseColor(arrowColor)
	}
	if arrowAlpha, ok := data["arrowColorAlpha"].(float64); ok {
		combo.ArrowColorAlpha = uint8(arrowAlpha)
	}

	// 解析展开状态
	if isExpanded, ok := data["isExpanded"].(bool); ok {
		combo.IsExpanded = isExpanded
	}

	return combo
}

// createSlider 创建滑动条
func (l *Loader) createSlider(data map[string]interface{}) *SliderWidget {
	slider := NewSlider("", 0, 0, 200, 30)

	// 解析数值属性
	if minValue, ok := data["minValue"].(float64); ok {
		slider.MinValue = minValue
	}
	if maxValue, ok := data["maxValue"].(float64); ok {
		slider.MaxValue = maxValue
	}
	if value, ok := data["value"].(float64); ok {
		slider.Value = value
	}
	if step, ok := data["step"].(float64); ok {
		slider.Step = step
	}

	// 解析方向
	if orientation, ok := data["orientation"].(string); ok {
		slider.Orientation = SliderOrientation(orientation)
	}

	// 解析尺寸
	if trackHeight, ok := data["trackHeight"].(float64); ok {
		slider.TrackHeight = int(trackHeight)
	}
	if thumbSize, ok := data["thumbSize"].(float64); ok {
		slider.ThumbSize = int(thumbSize)
	}

	// 解析轨道颜色
	if trackBg, ok := data["trackBgColor"].(string); ok {
		slider.TrackBgColor = l.parseColor(trackBg)
	}
	if trackBgAlpha, ok := data["trackBgColorAlpha"].(float64); ok {
		slider.TrackBgColorAlpha = uint8(trackBgAlpha)
	}
	if trackFill, ok := data["trackFillColor"].(string); ok {
		slider.TrackFillColor = l.parseColor(trackFill)
	}
	if trackFillAlpha, ok := data["trackFillAlpha"].(float64); ok {
		slider.TrackFillAlpha = uint8(trackFillAlpha)
	}

	// 解析滑块颜色
	if thumbColor, ok := data["thumbColor"].(string); ok {
		slider.ThumbColor = l.parseColor(thumbColor)
	}
	if thumbAlpha, ok := data["thumbColorAlpha"].(float64); ok {
		slider.ThumbColorAlpha = uint8(thumbAlpha)
	}
	if thumbHover, ok := data["thumbHoverColor"].(string); ok {
		slider.ThumbHoverColor = l.parseColor(thumbHover)
	}
	if thumbHoverAlpha, ok := data["thumbHoverAlpha"].(float64); ok {
		slider.ThumbHoverAlpha = uint8(thumbHoverAlpha)
	}

	// 解析边框
	if borderColor, ok := data["borderColor"].(string); ok {
		slider.BorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["borderColorAlpha"].(float64); ok {
		slider.BorderColorAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["borderWidth"].(float64); ok {
		slider.BorderWidth = int(borderWidth)
	}

	// 解析状态
	if showValue, ok := data["showValue"].(bool); ok {
		slider.ShowValue = showValue
	}
	if enabled, ok := data["enabled"].(bool); ok {
		slider.Enabled = enabled
	}

	return slider
}

// createCheckBox 创建复选框
func (l *Loader) createCheckBox(data map[string]interface{}) *CheckBoxWidget {
	checkbox := NewCheckBox("", 0, 0, 120, 30)

	// 解析文本
	if text, ok := data["text"].(string); ok {
		checkbox.Text = text
	}

	// 解析文本颜色
	if textColor, ok := data["textColor"].(string); ok {
		checkbox.TextColor = l.parseColor(textColor)
	}
	if textAlpha, ok := data["textColorAlpha"].(float64); ok {
		checkbox.TextColorAlpha = uint8(textAlpha)
	}

	// 解析字体大小
	if fontSize, ok := data["fontSize"].(float64); ok {
		checkbox.FontSize = int(fontSize)
	}

	// 解析复选框尺寸
	if boxSize, ok := data["boxSize"].(float64); ok {
		checkbox.BoxSize = int(boxSize)
	}

	// 解析复选框背景色
	if boxBg, ok := data["boxBgColor"].(string); ok {
		checkbox.BoxBgColor = l.parseColor(boxBg)
	}
	if boxBgAlpha, ok := data["boxBgColorAlpha"].(float64); ok {
		checkbox.BoxBgColorAlpha = uint8(boxBgAlpha)
	}

	// 解析边框
	if borderColor, ok := data["boxBorderColor"].(string); ok {
		checkbox.BoxBorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["boxBorderColorAlpha"].(float64); ok {
		checkbox.BoxBorderColorAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["boxBorderWidth"].(float64); ok {
		checkbox.BoxBorderWidth = int(borderWidth)
	}

	// 解析选中时颜色
	if checkedBg, ok := data["checkedBgColor"].(string); ok {
		checkbox.CheckedBgColor = l.parseColor(checkedBg)
	}
	if checkedBgAlpha, ok := data["checkedBgColorAlpha"].(float64); ok {
		checkbox.CheckedBgColorAlpha = uint8(checkedBgAlpha)
	}
	if checkMark, ok := data["checkMarkColor"].(string); ok {
		checkbox.CheckMarkColor = l.parseColor(checkMark)
	}
	if checkMarkAlpha, ok := data["checkMarkColorAlpha"].(float64); ok {
		checkbox.CheckMarkColorAlpha = uint8(checkMarkAlpha)
	}

	// 解析状态
	if checked, ok := data["checked"].(bool); ok {
		checkbox.Checked = checked
	}
	if enabled, ok := data["enabled"].(bool); ok {
		checkbox.Enabled = enabled
	}

	return checkbox
}

// createRadioButton 创建单选按钮
func (l *Loader) createRadioButton(data map[string]interface{}) *RadioButtonWidget {
	radio := NewRadioButton("", 0, 0, 120, 30)

	// 解析文本
	if text, ok := data["text"].(string); ok {
		radio.Text = text
	}

	// 解析文本颜色
	if textColor, ok := data["textColor"].(string); ok {
		radio.TextColor = l.parseColor(textColor)
	}
	if textAlpha, ok := data["textColorAlpha"].(float64); ok {
		radio.TextColorAlpha = uint8(textAlpha)
	}

	// 解析字体大小
	if fontSize, ok := data["fontSize"].(float64); ok {
		radio.FontSize = int(fontSize)
	}

	// 解析按钮尺寸
	if buttonSize, ok := data["buttonSize"].(float64); ok {
		radio.ButtonSize = int(buttonSize)
	}

	// 解析按钮背景色
	if buttonBg, ok := data["buttonBgColor"].(string); ok {
		radio.ButtonBgColor = l.parseColor(buttonBg)
	}
	if buttonBgAlpha, ok := data["buttonBgColorAlpha"].(float64); ok {
		radio.ButtonBgColorAlpha = uint8(buttonBgAlpha)
	}

	// 解析边框
	if borderColor, ok := data["borderColor"].(string); ok {
		radio.BorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["borderColorAlpha"].(float64); ok {
		radio.BorderColorAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["borderWidth"].(float64); ok {
		radio.BorderWidth = int(borderWidth)
	}

	// 解析选中时颜色
	if selectedBg, ok := data["selectedBgColor"].(string); ok {
		radio.SelectedBgColor = l.parseColor(selectedBg)
	}
	if selectedBgAlpha, ok := data["selectedBgColorAlpha"].(float64); ok {
		radio.SelectedBgColorAlpha = uint8(selectedBgAlpha)
	}
	if dotColor, ok := data["dotColor"].(string); ok {
		radio.DotColor = l.parseColor(dotColor)
	}
	if dotAlpha, ok := data["dotColorAlpha"].(float64); ok {
		radio.DotColorAlpha = uint8(dotAlpha)
	}

	// 解析分组和状态
	if groupName, ok := data["groupName"].(string); ok {
		radio.GroupName = groupName
	}
	if selected, ok := data["selected"].(bool); ok {
		radio.Selected = selected
	}
	if enabled, ok := data["enabled"].(bool); ok {
		radio.Enabled = enabled
	}

	return radio
}

// parseColor 解析颜色字符串 (#RRGGBB)
func (l *Loader) parseColor(colorStr string) RGBA {
	if len(colorStr) != 7 || colorStr[0] != '#' {
		return RGBA{R: 0, G: 0, B: 0, A: 255}
	}

	var r, g, b uint8
	fmt.Sscanf(colorStr, "#%02x%02x%02x", &r, &g, &b)
	return RGBA{R: r, G: g, B: b, A: 255}
}

// loadImage 加载图片资源（优先从pak，回退到文件系统）
func (l *Loader) loadImage(resourceID string) *ebiten.Image {
	if resourceID == "" {
		return nil
	}

	// 检查缓存
	if img, exists := l.imageCache[resourceID]; exists {
		return img
	}

	var img *ebiten.Image
	var err error

	// 优先从pak加载
	if l.pakData != nil && l.manifest != nil {
		resourceData, err := l.getResourceData(resourceID)
		if err == nil {
			// 从字节数组创建图片
			img, _, err = ebitenutil.NewImageFromReader(bytes.NewReader(resourceData))
			if err == nil {
				l.imageCache[resourceID] = img
				return img
			}
		}
	}

	// 回退到文件系统（兼容旧格式或预览模式）
	// 尝试在resourcePath中查找文件
	if l.resourcePath != "" {
		possiblePath := filepath.Join(l.resourcePath, resourceID)
		img, _, err = ebitenutil.NewImageFromFile(possiblePath)
		if err == nil {
			l.imageCache[resourceID] = img
			return img
		}
	}

	// 直接尝试加载resourceID作为路径
	img, _, err = ebitenutil.NewImageFromFile(resourceID)
	if err == nil {
		l.imageCache[resourceID] = img
		return img
	}

	// 加载失败，返回nil
	return nil
}

// loadFont 加载字体资源（从pak文件）
func (l *Loader) loadFont(resourceID string) font.Face {
	if resourceID == "" {
		log.Printf("[Loader] loadFont: empty resourceID")
		return nil
	}

	log.Printf("[Loader] loadFont: trying to load font '%s'", resourceID)

	// 从pak加载字体数据
	if l.pakData != nil && l.manifest != nil {
		resourceData, err := l.getResourceData(resourceID)
		if err != nil {
			log.Printf("[Loader] loadFont: failed to get resource data: %v", err)
			return nil
		}

		log.Printf("[Loader] loadFont: got resource data, size=%d bytes", len(resourceData))

		// 解析 TTF/OTF 字体
		tt, err := opentype.Parse(resourceData)
		if err != nil {
			log.Printf("[Loader] loadFont: failed to parse font: %v", err)
			return nil
		}

		// 创建字体 Face（DPI=72, 字号默认使用14，实际渲染时会被控件的 FontSize 覆盖）
		const dpi = 72
		const defaultFontSize = 14

		face, err := opentype.NewFace(tt, &opentype.FaceOptions{
			Size:    defaultFontSize,
			DPI:     dpi,
			Hinting: font.HintingFull,
		})
		if err != nil {
			log.Printf("[Loader] loadFont: failed to create font face: %v", err)
			return nil
		}

		log.Printf("[Loader] loadFont: successfully loaded font '%s'", resourceID)
		return face
	}

	log.Printf("[Loader] loadFont: no pak data available")
	return nil
}

// createListView 创建ListView控件
func (l *Loader) createListView(data map[string]interface{}) *ListViewWidget {
	lv := NewListView("")

	if itemHeight, ok := data["itemHeight"].(float64); ok {
		lv.ItemHeight = int(itemHeight)
	}
	if scrollable, ok := data["scrollable"].(bool); ok {
		lv.Scrollable = scrollable
	}
	if enabled, ok := data["enabled"].(bool); ok {
		lv.Enabled = enabled
	}

	// 解析项模板
	if itemTemplate, ok := data["itemTemplate"].(map[string]interface{}); ok {
		lv.ItemTemplate = itemTemplate
	}

	// 解析数据项
	if items, ok := data["items"].([]interface{}); ok {
		lv.Items = make([]map[string]interface{}, len(items))
		for i, item := range items {
			if itemMap, ok := item.(map[string]interface{}); ok {
				lv.Items[i] = itemMap
			}
		}
	}

	// 解析背景和边框
	if bgColor, ok := data["backgroundColor"].(string); ok {
		lv.BackgroundColor = l.parseColor(bgColor)
	}
	if bgAlpha, ok := data["backgroundColorAlpha"].(float64); ok {
		lv.BackgroundColorAlpha = uint8(bgAlpha)
	}
	if borderColor, ok := data["borderColor"].(string); ok {
		lv.BorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["borderColorAlpha"].(float64); ok {
		lv.BorderColorAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["borderWidth"].(float64); ok {
		lv.BorderWidth = int(borderWidth)
	}

	return lv
}

// createGridView 创建GridView控件
func (l *Loader) createGridView(data map[string]interface{}) *GridViewWidget {
	gv := NewGridView("")

	if itemWidth, ok := data["itemWidth"].(float64); ok {
		gv.ItemWidth = int(itemWidth)
	}
	if itemHeight, ok := data["itemHeight"].(float64); ok {
		gv.ItemHeight = int(itemHeight)
	}
	if columns, ok := data["columns"].(float64); ok {
		gv.Columns = int(columns)
	}
	if spacing, ok := data["spacing"].(float64); ok {
		gv.Spacing = int(spacing)
	}
	if scrollable, ok := data["scrollable"].(bool); ok {
		gv.Scrollable = scrollable
	}
	if enabled, ok := data["enabled"].(bool); ok {
		gv.Enabled = enabled
	}

	// 解析项模板
	if itemTemplate, ok := data["itemTemplate"].(map[string]interface{}); ok {
		gv.ItemTemplate = itemTemplate
	}

	// 解析数据项
	if items, ok := data["items"].([]interface{}); ok {
		gv.Items = make([]map[string]interface{}, len(items))
		for i, item := range items {
			if itemMap, ok := item.(map[string]interface{}); ok {
				gv.Items[i] = itemMap
			}
		}
	}

	// 解析背景和边框
	if bgColor, ok := data["backgroundColor"].(string); ok {
		gv.BackgroundColor = l.parseColor(bgColor)
	}
	if bgAlpha, ok := data["backgroundColorAlpha"].(float64); ok {
		gv.BackgroundColorAlpha = uint8(bgAlpha)
	}
	if borderColor, ok := data["borderColor"].(string); ok {
		gv.BorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["borderColorAlpha"].(float64); ok {
		gv.BorderColorAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["borderWidth"].(float64); ok {
		gv.BorderWidth = int(borderWidth)
	}

	return gv
}

// createTableView 创建TableView控件
func (l *Loader) createTableView(data map[string]interface{}) *TableViewWidget {
	tv := NewTableView("")

	if rowHeight, ok := data["rowHeight"].(float64); ok {
		tv.RowHeight = int(rowHeight)
	}
	if headerHeight, ok := data["headerHeight"].(float64); ok {
		tv.HeaderHeight = int(headerHeight)
	}
	if showHeader, ok := data["showHeader"].(bool); ok {
		tv.ShowHeader = showHeader
	}
	if alternateRowBg, ok := data["alternateRowBg"].(bool); ok {
		tv.AlternateRowBg = alternateRowBg
	}
	if showGridLines, ok := data["showGridLines"].(bool); ok {
		tv.ShowGridLines = showGridLines
	}
	if scrollable, ok := data["scrollable"].(bool); ok {
		tv.Scrollable = scrollable
	}
	if enabled, ok := data["enabled"].(bool); ok {
		tv.Enabled = enabled
	}

	// 解析列定义
	if columns, ok := data["columns"].([]interface{}); ok {
		tv.Columns = make([]TableColumn, len(columns))
		for i, colData := range columns {
			if colMap, ok := colData.(map[string]interface{}); ok {
				col := TableColumn{}
				if key, ok := colMap["key"].(string); ok {
					col.Key = key
				}
				if label, ok := colMap["label"].(string); ok {
					col.Label = label
				}
				if width, ok := colMap["width"].(float64); ok {
					col.Width = int(width)
				}
				if minWidth, ok := colMap["minWidth"].(float64); ok {
					col.MinWidth = int(minWidth)
				}
				if sortable, ok := colMap["sortable"].(bool); ok {
					col.Sortable = sortable
				}
				if alignment, ok := colMap["alignment"].(string); ok {
					col.Alignment = alignment
				}
				tv.Columns[i] = col
			}
		}
	}

	// 解析数据项
	if items, ok := data["items"].([]interface{}); ok {
		tv.Items = make([]map[string]interface{}, len(items))
		for i, item := range items {
			if itemMap, ok := item.(map[string]interface{}); ok {
				tv.Items[i] = itemMap
			}
		}
	}

	// 解析背景和样式
	if bgColor, ok := data["backgroundColor"].(string); ok {
		tv.BackgroundColor = l.parseColor(bgColor)
	}
	if bgAlpha, ok := data["backgroundAlpha"].(float64); ok {
		tv.BackgroundAlpha = uint8(bgAlpha)
	}
	if headerBgColor, ok := data["headerBgColor"].(string); ok {
		tv.HeaderBgColor = l.parseColor(headerBgColor)
	}
	if headerBgAlpha, ok := data["headerBgAlpha"].(float64); ok {
		tv.HeaderBgAlpha = uint8(headerBgAlpha)
	}
	if gridLineColor, ok := data["gridLineColor"].(string); ok {
		tv.GridLineColor = l.parseColor(gridLineColor)
	}
	if gridLineAlpha, ok := data["gridLineAlpha"].(float64); ok {
		tv.GridLineAlpha = uint8(gridLineAlpha)
	}
	if borderColor, ok := data["borderColor"].(string); ok {
		tv.BorderColor = l.parseColor(borderColor)
	}
	if borderAlpha, ok := data["borderAlpha"].(float64); ok {
		tv.BorderAlpha = uint8(borderAlpha)
	}
	if borderWidth, ok := data["borderWidth"].(float64); ok {
		tv.BorderWidth = int(borderWidth)
	}

	// 解析排序状态
	if sortColumn, ok := data["sortColumn"].(string); ok {
		tv.SortColumn = sortColumn
	}
	if sortDirection, ok := data["sortDirection"].(string); ok {
		tv.SortDirection = sortDirection
	}

	return tv
}
