/**
 * 按钮控件
 */
class ButtonWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('button', x, y, parentId);
    
    this.width = 120;
    this.height = 40;
    
    // 按钮特有属性
    this.text = '按钮';
    this.enabled = true;
    
    // 文本样式
    this.fontSize = 14;
    this.fontFamily = 'Arial';
    this.fontBold = false;
    this.fontItalic = false;
    this.textAlign = 'center';
    this.textColor = '#333333';
    this.textColorAlpha = 255;
    this.fontResourceId = null;
    
    // 三态背景颜色 (常态、按下、禁用)
    this.backgroundColorNormal = '#4287f5';
    this.backgroundColorNormalAlpha = 255;
    this.backgroundColorPressed = '#3670d9';
    this.backgroundColorPressedAlpha = 255;
    this.backgroundColorDisabled = '#999999';
    this.backgroundColorDisabledAlpha = 255;
    
    // 三态背景图片资源 (常态、按下、禁用)
    this.backgroundResourceNormal = null;
    this.backgroundResourcePressed = null;
    this.backgroundResourceDisabled = null;
    
    // 当前状态 (normal, pressed, disabled)
    this.currentState = 'normal';
  }
  
  /**
   * 获取当前状态的背景属性
   * @returns {Object} 包含 backgroundColor, backgroundColorAlpha, backgroundResourceId
   */
  getStateBackground() {
    if (!this.enabled) {
      return {
        backgroundColor: this.backgroundColorDisabled,
        backgroundColorAlpha: this.backgroundColorDisabledAlpha,
        backgroundResourceId: this.backgroundResourceDisabled
      };
    } else if (this.currentState === 'pressed') {
      return {
        backgroundColor: this.backgroundColorPressed,
        backgroundColorAlpha: this.backgroundColorPressedAlpha,
        backgroundResourceId: this.backgroundResourcePressed
      };
    } else {
      return {
        backgroundColor: this.backgroundColorNormal,
        backgroundColorAlpha: this.backgroundColorNormalAlpha,
        backgroundResourceId: this.backgroundResourceNormal
      };
    }
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    // 绘制文本
    renderer.drawStyledText(this, contentX, contentY, contentWidth, contentHeight, this.text);
  }
}

/**
 * 标签控件
 */
class LabelWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('label', x, y, parentId);
    
    this.width = 120;
    this.height = 30;
    
    // 标签特有属性
    this.text = '标签文本';
    
    // 文本样式
    this.fontSize = 14;
    this.fontFamily = 'Arial';
    this.fontBold = false;
    this.fontItalic = false;
    this.textUnderline = false;
    this.textStrikethrough = false;
    this.textAlign = 'center';
    this.textColor = '#333333';
    this.textColorAlpha = 255;
    this.strokeColor = '';
    this.strokeColorAlpha = 255;
    this.strokeWidth = 0;
    this.fontResourceId = null;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    renderer.drawStyledText(this, contentX, contentY, contentWidth, contentHeight, this.text);
  }
}

/**
 * 文本输入框控件
 */
class TextInputWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('textinput', x, y, parentId);
    
    this.width = 200;
    this.height = 32;
    
    // 输入框特有属性
    this.text = '';
    this.placeholder = '请输入...';
    this.enabled = true;
    
    // 文本样式
    this.fontSize = 14;
    this.fontFamily = 'Arial';
    this.textColor = '#333333';
    this.textColorAlpha = 255;
    this.fontResourceId = null;
    
    // 三态背景颜色 (常态、编辑中、禁用)
    this.backgroundColorNormal = '#ffffff';
    this.backgroundColorNormalAlpha = 255;
    this.backgroundColorEditing = '#ffffcc';
    this.backgroundColorEditingAlpha = 255;
    this.backgroundColorDisabled = '#f0f0f0';
    this.backgroundColorDisabledAlpha = 255;
    
    // 三态背景图片资源 (常态、编辑中、禁用)
    this.backgroundResourceNormal = null;
    this.backgroundResourceEditing = null;
    this.backgroundResourceDisabled = null;
    
    // 当前状态 (normal, editing, disabled)
    this.currentState = 'normal';
  }
  
  /**
   * 获取当前状态的背景属性
   * @returns {Object} 包含 backgroundColor, backgroundColorAlpha, backgroundResourceId
   */
  getStateBackground() {
    if (!this.enabled) {
      return {
        backgroundColor: this.backgroundColorDisabled,
        backgroundColorAlpha: this.backgroundColorDisabledAlpha,
        backgroundResourceId: this.backgroundResourceDisabled
      };
    } else if (this.currentState === 'editing') {
      return {
        backgroundColor: this.backgroundColorEditing,
        backgroundColorAlpha: this.backgroundColorEditingAlpha,
        backgroundResourceId: this.backgroundResourceEditing
      };
    } else {
      return {
        backgroundColor: this.backgroundColorNormal,
        backgroundColorAlpha: this.backgroundColorNormalAlpha,
        backgroundResourceId: this.backgroundResourceNormal
      };
    }
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    // 绘制文本或占位符
    if (this.text) {
      renderer.drawStyledText(this, contentX, contentY, contentWidth, contentHeight, this.text);
    } else if (this.placeholder) {
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#999';
      ctx.fillText(this.placeholder, contentX + 8, y + height / 2);
    }
  }
}

/**
 * 滑动条控件
 */
class SliderWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('slider', x, y, parentId);
    
    this.width = 200;
    this.height = 24;
    
    // 滑动条特有属性
    this.min = 0;
    this.max = 100;
    this.value = 50;
    this.enabled = true;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    const minVal = this.min || 0;
    const maxVal = this.max || 100;
    const curVal = this.value !== undefined ? this.value : 50;
    const percent = (curVal - minVal) / (maxVal - minVal);
    
    // 轨道背景
    const trackY = contentY + contentHeight / 2 - 2;
    ctx.fillStyle = this.enabled ? '#ddd' : '#f0f0f0';
    ctx.fillRect(contentX, trackY, contentWidth, 4);
    
    // 已填充部分
    ctx.fillStyle = this.enabled ? '#4287f5' : '#999';
    ctx.fillRect(contentX, trackY, contentWidth * percent, 4);
    
    // 滑块
    const thumbX = contentX + contentWidth * percent;
    ctx.beginPath();
    ctx.arc(thumbX, contentY + contentHeight / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = this.enabled ? '#4287f5' : '#999';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 图片控件
 */
class ImageWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('image', x, y, parentId);
    
    this.width = 128;
    this.height = 128;
    
    // 图片特有属性
    this.imagePath = '';
    this.src = null; // Base64 数据
    this.resourceId = null;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    // 如果有图像数据，绘制图像
    if (this.src) {
      if (!renderer.imageCache) renderer.imageCache = {};
      
      const cacheKey = this.id;
      if (!renderer.imageCache[cacheKey] || renderer.imageCache[cacheKey].src !== this.src) {
        const img = new Image();
        img.src = this.src;
        renderer.imageCache[cacheKey] = { img, src: this.src, loaded: false };
        
        img.onload = () => {
          renderer.imageCache[cacheKey].loaded = true;
        };
      }
      
      const cached = renderer.imageCache[cacheKey];
      if (cached.loaded) {
        const imgAspect = cached.img.width / cached.img.height;
        const boxAspect = contentWidth / contentHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        if (imgAspect > boxAspect) {
          drawWidth = contentWidth;
          drawHeight = contentWidth / imgAspect;
          drawX = contentX;
          drawY = contentY + (contentHeight - drawHeight) / 2;
        } else {
          drawHeight = contentHeight;
          drawWidth = contentHeight * imgAspect;
          drawX = contentX + (contentWidth - drawWidth) / 2;
          drawY = contentY;
        }
        
        ctx.drawImage(cached.img, drawX, drawY, drawWidth, drawHeight);
      }
    } else {
      // 占位文本
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.imagePath ? '🖼️ ' + this.imagePath.split('/').pop() : '🖼️ 图像', contentX + contentWidth / 2, contentY + contentHeight / 2);
    }
  }
}

/**
 * 列表框控件
 */
class ListBoxWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('listbox', x, y, parentId);
    
    this.width = 200;
    this.height = 150;
    
    // 列表框特有属性
    this.items = [];
    this.enabled = true;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    // 示例项目
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const itemCount = this.items && this.items.length > 0 ? Math.min(this.items.length, 5) : 3;
    for (let i = 0; i < itemCount; i++) {
      const itemY = contentY + i * 24;
      const itemText = this.items && this.items[i] ? this.items[i] : `项目 ${i + 1}`;
      ctx.fillText(itemText, contentX + 8, itemY);
    }
  }
}

/**
 * 网格视图控件
 */
class GridViewWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('gridview', x, y, parentId);
    
    this.width = 300;
    this.height = 200;
    
    // 网格视图特有属性
    this.items = [];
    this.columns = 4;
    this.enabled = true;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    // 网格项目示例
    const cols = this.columns || 4;
    const cellSize = Math.min(contentWidth / cols - 10, 60);
    const padding = 8;
    
    for (let i = 0; i < Math.min(cols * 2, 8); i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellX = contentX + padding + col * (cellSize + padding);
      const cellY = contentY + padding + row * (cellSize + padding);
      
      if (cellY + cellSize < contentY + contentHeight) {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX, cellY, cellSize, cellSize);
      }
    }
  }
}

/**
 * 面板容器控件
 */
class PanelWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('panel', x, y, parentId);
    
    this.width = 300;
    this.height = 200;
    
    // 面板特有属性
    this.text = ''; // 标题
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 如果没有自定义背景,使用默认白色
    if (!this.backgroundColor && !this.backgroundResourceId) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, width, height);
    }
    
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    
    // 标题
    if (this.text) {
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.text, contentX + 8, contentY + 8);
    }
  }
}
