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
    this.scaleMode = 'fit'; // fit, fill, stretch, none, clip
    
    // Clip模式的裁剪区域（相对于原始图片）
    this.clipX = 0;
    this.clipY = 0;
    this.clipWidth = 0;  // 0表示使用图片宽度
    this.clipHeight = 0; // 0表示使用图片高度
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
        const img = cached.img;
        const scaleMode = this.scaleMode || 'fit';
        
        // 第一步：确定源图裁剪区域
        let sx = this.clipX || 0;
        let sy = this.clipY || 0;
        let sw = this.clipWidth || (img.width - sx);
        let sh = this.clipHeight || (img.height - sy);
        
        // 防止越界
        if (sx < 0) sx = 0;
        if (sy < 0) sy = 0;
        if (sx + sw > img.width) sw = img.width - sx;
        if (sy + sh > img.height) sh = img.height - sy;
        
        // 第二步：根据缩放模式计算目标绘制区域
        let drawWidth, drawHeight, drawX, drawY;
        
        switch (scaleMode) {
          case 'fit':
            // 等比例缩放，保持宽高比，完整显示（居中）
            const fitScale = Math.min(contentWidth / sw, contentHeight / sh);
            drawWidth = sw * fitScale;
            drawHeight = sh * fitScale;
            drawX = contentX + (contentWidth - drawWidth) / 2;
            drawY = contentY + (contentHeight - drawHeight) / 2;
            break;
            
          case 'fill':
            // 填充整个区域，保持宽高比，可能裁剪（居中）
            const fillScale = Math.max(contentWidth / sw, contentHeight / sh);
            drawWidth = sw * fillScale;
            drawHeight = sh * fillScale;
            drawX = contentX + (contentWidth - drawWidth) / 2;
            drawY = contentY + (contentHeight - drawHeight) / 2;
            break;
            
          case 'stretch':
            // 拉伸填充
            drawWidth = contentWidth;
            drawHeight = contentHeight;
            drawX = contentX;
            drawY = contentY;
            break;
            
          case 'none':
            // 不缩放，原始尺寸，左上角对齐
            drawWidth = sw;
            drawHeight = sh;
            drawX = contentX;
            drawY = contentY;
            break;
            
          default:
            // 默认fit模式
            const defaultScale = Math.min(contentWidth / sw, contentHeight / sh);
            drawWidth = sw * defaultScale;
            drawHeight = sh * defaultScale;
            drawX = contentX + (contentWidth - drawWidth) / 2;
            drawY = contentY + (contentHeight - drawHeight) / 2;
        }
        
        // 第三步：对fit和none模式，裁剪超出控件的部分
        if (scaleMode === 'fit' || scaleMode === 'none') {
          ctx.save();
          ctx.beginPath();
          ctx.rect(contentX, contentY, contentWidth, contentHeight);
          ctx.clip();
        }
        
        // 绘制图像（使用9参数版本支持裁剪）
        ctx.drawImage(img, sx, sy, sw, sh, drawX, drawY, drawWidth, drawHeight);
        
        // 恢复裁剪区域
        if (scaleMode === 'fit' || scaleMode === 'none') {
          ctx.restore();
        }
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
class ListViewWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('listview', x, y, parentId);
    
    this.width = 200;
    this.height = 150;
    
    // 列表视图特有属性
    this.items = [];  // 数据数组，如 [{name: 'Item 1', icon: 'icon1'}, ...]
    this.itemTemplate = null;  // 项模板，结构为 {children: [widget1, widget2, ...]}
    this.itemHeight = 40;  // 单项高度
    this.enabled = true;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    // 计算可见项数量
    const itemHeight = this.itemHeight || 40;
    const visibleItemCount = Math.floor(contentHeight / itemHeight);
    const itemCount = this.items && this.items.length > 0 ? Math.min(this.items.length, visibleItemCount) : Math.min(3, visibleItemCount);
    
    // 绘制项
    for (let i = 0; i < itemCount; i++) {
      const itemY = contentY + i * itemHeight;
      
      // 项背景（交替颜色）
      ctx.fillStyle = i % 2 === 0 ? '#f8f8f8' : '#ffffff';
      ctx.fillRect(contentX + 2, itemY + 2, contentWidth - 4, itemHeight - 4);
      
      // 项文本
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      let itemText;
      if (this.items && this.items[i]) {
        // 如果是对象，尝试显示name或第一个属性
        if (typeof this.items[i] === 'object') {
          itemText = this.items[i].name || this.items[i].title || JSON.stringify(this.items[i]).substring(0, 20);
        } else {
          itemText = String(this.items[i]);
        }
      } else {
        itemText = `项目 ${i + 1}`;
      }
      
      ctx.fillText(itemText, contentX + 10, itemY + itemHeight / 2);
    }
    
    // 如果配置了模板，显示提示
    if (this.itemTemplate && this.itemTemplate.children && this.itemTemplate.children.length > 0) {
      ctx.fillStyle = 'rgba(0, 150, 0, 0.1)';
      ctx.fillRect(contentX + 5, contentY + 5, contentWidth - 10, 20);
      ctx.fillStyle = '#090';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`✓ 已配置项模板 (${this.itemTemplate.children.length}个控件)`, contentX + 10, contentY + 10);
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
    this.items = [];  // 数据数组
    this.itemTemplate = null;  // 项模板
    this.columns = 4;  // 列数
    this.itemWidth = 80;  // 单项宽度
    this.itemHeight = 80;  // 单项高度
    this.spacing = 8;  // 项之间的间距
    this.enabled = true;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域 (减去 padding)
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    // 网格布局参数
    const cols = this.columns || 4;
    const cellWidth = this.itemWidth || 80;
    const cellHeight = this.itemHeight || 80;
    const spacing = this.spacing || 8;
    
    // 计算可见行数
    const visibleRows = Math.floor(contentHeight / (cellHeight + spacing)) + 1;
    const itemCount = Math.min(cols * visibleRows, this.items && this.items.length > 0 ? this.items.length : 8);
    
    // 绘制网格项
    for (let i = 0; i < itemCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellX = contentX + spacing + col * (cellWidth + spacing);
      const cellY = contentY + spacing + row * (cellHeight + spacing);
      
      // 检查是否在可见区域内
      if (cellY + cellHeight > contentY + contentHeight) {
        break;
      }
      
      // 项背景
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
      
      // 项边框
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
      
      // 项文本
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let itemText;
      if (this.items && this.items[i]) {
        if (typeof this.items[i] === 'object') {
          itemText = this.items[i].name || this.items[i].title || `Item ${i + 1}`;
        } else {
          itemText = String(this.items[i]);
        }
      } else {
        itemText = `Item ${i + 1}`;
      }
      
      ctx.fillText(itemText, cellX + cellWidth / 2, cellY + cellHeight / 2);
    }
    
    // 如果配置了模板，显示提示
    if (this.itemTemplate && this.itemTemplate.children && this.itemTemplate.children.length > 0) {
      ctx.fillStyle = 'rgba(0, 150, 0, 0.1)';
      ctx.fillRect(contentX + 5, contentY + 5, contentWidth - 10, 20);
      ctx.fillStyle = '#090';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`✓ 已配置项模板 (${this.itemTemplate.children.length}个控件)`, contentX + 10, contentY + 10);
    }
  }
}

/**
 * 表格视图控件（多列数据表格带列头）
 */
class TableViewWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('tableview', x, y, parentId);
    
    this.width = 400;
    this.height = 300;
    
    // 表格视图特有属性
    this.columns = [];  // 列定义数组 [{key, label, width, sortable, alignment}, ...]
    this.items = [];  // 数据数组
    this.rowHeight = 30;  // 行高度
    this.headerHeight = 35;  // 表头高度
    this.showHeader = true;  // 是否显示表头
    this.alternateRowBg = true;  // 是否交替行背景
    this.showGridLines = true;  // 是否显示网格线
    this.enabled = true;
  }
  
  drawContent(ctx, renderer, x, y, width, height) {
    // 计算内容区域
    const contentX = x + this.padding.left;
    const contentY = y + this.padding.top;
    const contentWidth = width - this.padding.left - this.padding.right;
    const contentHeight = height - this.padding.top - this.padding.bottom;
    
    if (this.columns.length === 0) {
      // 没有列定义，显示占位符
      this.drawPlaceholder(ctx, contentX, contentY, contentWidth, contentHeight);
      return;
    }
    
    let currentY = contentY;
    
    // 绘制表头
    if (this.showHeader) {
      this.drawHeader(ctx, contentX, currentY, contentWidth, this.headerHeight);
      currentY += this.headerHeight;
    }
    
    // 绘制数据行
    const remainingHeight = contentY + contentHeight - currentY;
    if (this.items.length > 0) {
      this.drawRows(ctx, contentX, currentY, contentWidth, remainingHeight);
    } else {
      // 空数据提示
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('无数据', contentX + contentWidth / 2, currentY + remainingHeight / 2);
    }
  }
  
  drawHeader(ctx, x, y, width, height) {
    // 表头背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x, y, width, height);
    
    // 绘制列头
    let currentX = x;
    this.columns.forEach((col, i) => {
      const colWidth = col.width || 100;
      
      // 列头文本
      ctx.fillStyle = '#333';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(col.label || col.key, currentX + 8, y + height / 2);
      
      // 列分隔线
      if (this.showGridLines && i < this.columns.length - 1) {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(currentX + colWidth, y);
        ctx.lineTo(currentX + colWidth, y + height);
        ctx.stroke();
      }
      
      currentX += colWidth;
    });
    
    // 表头底部线
    if (this.showGridLines) {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
    }
  }
  
  drawRows(ctx, x, y, width, height) {
    const rowHeight = this.rowHeight || 30;
    const visibleRows = Math.min(Math.ceil(height / rowHeight), this.items.length);
    
    for (let i = 0; i < visibleRows; i++) {
      const rowY = y + i * rowHeight;
      const rowData = this.items[i];
      
      // 交替行背景
      if (this.alternateRowBg && i % 2 === 1) {
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(x, rowY, width, rowHeight);
      }
      
      // 绘制单元格
      let currentX = x;
      this.columns.forEach((col, j) => {
        const colWidth = col.width || 100;
        const cellValue = rowData[col.key] !== undefined ? String(rowData[col.key]) : '';
        
        // 单元格文本
        ctx.fillStyle = '#333';
        ctx.font = '13px Arial';
        ctx.textAlign = col.alignment || 'left';
        ctx.textBaseline = 'middle';
        
        const textX = col.alignment === 'center' ? currentX + colWidth / 2 : 
                     col.alignment === 'right' ? currentX + colWidth - 8 : 
                     currentX + 8;
        
        ctx.fillText(cellValue, textX, rowY + rowHeight / 2);
        
        // 列分隔线
        if (this.showGridLines && j < this.columns.length - 1) {
          ctx.strokeStyle = '#eee';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(currentX + colWidth, rowY);
          ctx.lineTo(currentX + colWidth, rowY + rowHeight);
          ctx.stroke();
        }
        
        currentX += colWidth;
      });
      
      // 行底部线
      if (this.showGridLines) {
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, rowY + rowHeight);
        ctx.lineTo(x + width, rowY + rowHeight);
        ctx.stroke();
      }
    }
  }
  
  drawPlaceholder(ctx, x, y, width, height) {
    // 示例表头
    const headerHeight = 35;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x, y, width, headerHeight);
    
    const colCount = 3;
    const colWidth = width / colCount;
    
    for (let i = 0; i < colCount; i++) {
      const colX = x + i * colWidth;
      ctx.fillStyle = '#333';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`列 ${i + 1}`, colX + 8, y + headerHeight / 2);
      
      if (i < colCount - 1) {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colX + colWidth, y);
        ctx.lineTo(colX + colWidth, y + headerHeight);
        ctx.stroke();
      }
    }
    
    // 表头底部线
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerHeight);
    ctx.lineTo(x + width, y + headerHeight);
    ctx.stroke();
    
    // 示例数据行
    const rowHeight = 30;
    const rowCount = Math.min(3, Math.floor((height - headerHeight) / rowHeight));
    
    for (let i = 0; i < rowCount; i++) {
      const rowY = y + headerHeight + i * rowHeight;
      
      if (i % 2 === 1) {
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(x, rowY, width, rowHeight);
      }
      
      for (let j = 0; j < colCount; j++) {
        const colX = x + j * colWidth;
        ctx.fillStyle = '#666';
        ctx.font = '13px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`数据 ${i + 1}-${j + 1}`, colX + 8, rowY + rowHeight / 2);
      }
      
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, rowY + rowHeight);
      ctx.lineTo(x + width, rowY + rowHeight);
      ctx.stroke();
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

/**
 * 下拉选择框控件
 */
class ComboBoxWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('combobox', x, y, parentId);
    
    this.width = 200;
    this.height = 35;
    
    // 下拉框特有属性
    this.items = [];  // 选项列表
    this.selectedIndex = -1;  // 当前选中索引 (-1表示未选中)
    this.placeholderText = '请选择...';  // 占位符文本
    this.maxVisibleItems = 5;  // 最大可见选项数量
    this.itemHeight = 30;  // 选项高度
    
    // 状态
    this.isExpanded = false;  // 是否展开
    this.hoverIndex = -1;  // 悬停项索引
    
    // 颜色
    this.backgroundColor = '#ffffff';
    this.borderColor = '#cccccc';
    this.borderWidth = 1;
    this.textColor = '#333333';
    this.arrowColor = '#666666';
    this.dropdownBgColor = '#ffffff';
    this.selectedBgColor = '#4682b4';
    this.hoverBgColor = '#e6f0fa';
  }

  drawContent(ctx, renderer, x, y, width, height) {
    // 绘制主框背景
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(x, y, width, height);
    
    // 绘制边框
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.strokeRect(x, y, width, height);
    }
    
    // 绘制当前选中文本或占位符
    ctx.save();
    ctx.fillStyle = this.textColor;
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const textX = x + 8;
    const textY = y + height / 2;
    
    if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
      ctx.fillText(this.items[this.selectedIndex], textX, textY);
    } else {
      ctx.globalAlpha = 0.5;
      ctx.fillText(this.placeholderText, textX, textY);
      ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();
    
    // 绘制下拉箭头
    const arrowX = x + width - 20;
    const arrowY = y + height / 2;
    const arrowSize = 4;
    
    ctx.fillStyle = this.arrowColor;
    ctx.beginPath();
    if (this.isExpanded) {
      // 向上箭头
      ctx.moveTo(arrowX - arrowSize, arrowY + 2);
      ctx.lineTo(arrowX, arrowY - 2);
      ctx.lineTo(arrowX + arrowSize, arrowY + 2);
    } else {
      // 向下箭头
      ctx.moveTo(arrowX - arrowSize, arrowY - 2);
      ctx.lineTo(arrowX, arrowY + 2);
      ctx.lineTo(arrowX + arrowSize, arrowY - 2);
    }
    ctx.closePath();
    ctx.fill();
    
    // 如果展开，绘制下拉列表
    if (this.isExpanded && this.items.length > 0) {
      this.drawDropdown(ctx, x, y, width, height);
    }
    
    // 绘制占位符提示（编辑器预览）
    if (this.items.length === 0) {
      this.drawPlaceholder(ctx, x, y, width, height);
    }
  }
  
  drawDropdown(ctx, x, y, width, height) {
    const dropdownY = y + height;
    const visibleCount = Math.min(this.items.length, this.maxVisibleItems);
    const dropdownHeight = visibleCount * this.itemHeight;
    
    // 绘制下拉框背景
    ctx.fillStyle = this.dropdownBgColor;
    ctx.fillRect(x, dropdownY, width, dropdownHeight);
    
    // 绘制边框
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.strokeRect(x, dropdownY, width, dropdownHeight);
    }
    
    // 绘制选项
    ctx.save();
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < visibleCount; i++) {
      const itemY = dropdownY + i * this.itemHeight;
      
      // 绘制选中项或悬停项背景
      if (i === this.selectedIndex) {
        ctx.fillStyle = this.selectedBgColor;
        ctx.fillRect(x, itemY, width, this.itemHeight);
      } else if (i === this.hoverIndex) {
        ctx.fillStyle = this.hoverBgColor;
        ctx.fillRect(x, itemY, width, this.itemHeight);
      }
      
      // 绘制项文本
      ctx.fillStyle = i === this.selectedIndex ? '#ffffff' : this.textColor;
      ctx.fillText(this.items[i], x + 8, itemY + this.itemHeight / 2);
      
      // 绘制分隔线
      if (i < visibleCount - 1) {
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, itemY + this.itemHeight);
        ctx.lineTo(x + width, itemY + this.itemHeight);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
  
  drawPlaceholder(ctx, x, y, width, height) {
    // 显示示例选项提示
    ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
    ctx.fillRect(x + 5, y + 5, width - 10, height - 10);
    
    ctx.fillStyle = '#999';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('下拉选择框', x + width / 2, y + height / 2);
  }
}

/**
 * 滑动条控件
 */
class SliderWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('slider', x, y, parentId);
    
    this.width = 200;
    this.height = 30;
    
    // 滑动条特有属性
    this.minValue = 0;  // 最小值
    this.maxValue = 100;  // 最大值
    this.value = 50;  // 当前值
    this.step = 1;  // 步长（0表示连续）
    
    this.orientation = 'horizontal';  // 方向: horizontal | vertical
    this.trackHeight = 6;  // 轨道高度/宽度
    this.thumbSize = 16;  // 滑块尺寸
    
    this.showValue = true;  // 是否显示数值
    
    // 颜色
    this.trackBgColor = '#dcdcdc';
    this.trackFillColor = '#4682b4';
    this.thumbColor = '#ffffff';
    this.thumbHoverColor = '#f0f0f0';
    this.borderColor = '#969696';
    this.borderWidth = 1;
  }

  drawContent(ctx, renderer, x, y, width, height) {
    if (this.orientation === 'horizontal') {
      this.drawHorizontal(ctx, x, y, width, height);
    } else {
      this.drawVertical(ctx, x, y, width, height);
    }
  }
  
  drawHorizontal(ctx, x, y, width, height) {
    // 计算轨道位置（垂直居中）
    const trackY = y + (height - this.trackHeight) / 2;
    const trackWidth = width - this.thumbSize;
    
    // 绘制轨道背景
    ctx.fillStyle = this.trackBgColor;
    ctx.fillRect(x + this.thumbSize / 2, trackY, trackWidth, this.trackHeight);
    
    // 绘制边框
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.strokeRect(x + this.thumbSize / 2, trackY, trackWidth, this.trackHeight);
    }
    
    // 计算滑块位置
    const ratio = (this.value - this.minValue) / (this.maxValue - this.minValue);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const thumbX = x + this.thumbSize / 2 + trackWidth * clampedRatio;
    
    // 绘制已滑过部分
    const fillWidth = trackWidth * clampedRatio;
    ctx.fillStyle = this.trackFillColor;
    ctx.fillRect(x + this.thumbSize / 2, trackY, fillWidth, this.trackHeight);
    
    // 绘制滑块
    const thumbY = y + height / 2;
    this.drawThumb(ctx, thumbX, thumbY);
    
    // 显示数值
    if (this.showValue) {
      this.drawValueText(ctx, x + width + 5, y + height / 2);
    }
  }
  
  drawVertical(ctx, x, y, width, height) {
    // 计算轨道位置（水平居中）
    const trackX = x + (width - this.trackHeight) / 2;
    const trackHeight = height - this.thumbSize;
    
    // 绘制轨道背景
    ctx.fillStyle = this.trackBgColor;
    ctx.fillRect(trackX, y + this.thumbSize / 2, this.trackHeight, trackHeight);
    
    // 绘制边框
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.strokeRect(trackX, y + this.thumbSize / 2, this.trackHeight, trackHeight);
    }
    
    // 计算滑块位置（从底部开始）
    const ratio = (this.value - this.minValue) / (this.maxValue - this.minValue);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const thumbY = y + this.thumbSize / 2 + trackHeight * (1 - clampedRatio);
    
    // 绘制已滑过部分（从滑块到底部）
    const fillHeight = y + height - this.thumbSize / 2 - thumbY;
    ctx.fillStyle = this.trackFillColor;
    ctx.fillRect(trackX, thumbY, this.trackHeight, fillHeight);
    
    // 绘制滑块
    const thumbX = x + width / 2;
    this.drawThumb(ctx, thumbX, thumbY);
    
    // 显示数值
    if (this.showValue) {
      this.drawValueText(ctx, x + width + 5, y + height / 2);
    }
  }
  
  drawThumb(ctx, centerX, centerY) {
    const radius = this.thumbSize / 2;
    
    // 绘制圆形滑块
    ctx.fillStyle = this.thumbColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制滑块边框
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  drawValueText(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#505050';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 格式化数值
    let valueStr;
    if (this.step >= 1) {
      valueStr = Math.round(this.value).toString();
    } else {
      valueStr = this.value.toFixed(1);
    }
    
    ctx.fillText(valueStr, x, y);
    ctx.restore();
  }
}

/**
 * 复选框控件
 */
class CheckBoxWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('checkbox', x, y, parentId);
    
    this.width = 120;
    this.height = 30;
    
    // 复选框特有属性
    this.text = '复选框';  // 标签文本
    this.checked = false;  // 是否选中
    this.boxSize = 18;  // 复选框尺寸
    
    // 颜色
    this.textColor = '#333333';
    this.boxBgColor = '#ffffff';
    this.boxBorderColor = '#b4b4b4';
    this.boxBorderWidth = 1;
    this.checkedBgColor = '#4682b4';
    this.checkMarkColor = '#ffffff';
  }

  drawContent(ctx, renderer, x, y, width, height) {
    // 计算复选框位置（垂直居中）
    const boxY = y + (height - this.boxSize) / 2;
    
    // 绘制复选框
    this.drawBox(ctx, x, boxY);
    
    // 如果选中，绘制对勾
    if (this.checked) {
      this.drawCheckMark(ctx, x, boxY);
    }
    
    // 绘制文本标签
    if (this.text) {
      const textX = x + this.boxSize + 8;
      const textY = y + height / 2;
      this.drawText(ctx, textX, textY);
    }
  }
  
  drawBox(ctx, x, y) {
    // 绘制背景
    ctx.fillStyle = this.checked ? this.checkedBgColor : this.boxBgColor;
    ctx.fillRect(x, y, this.boxSize, this.boxSize);
    
    // 绘制边框
    if (this.boxBorderWidth > 0) {
      ctx.strokeStyle = this.boxBorderColor;
      ctx.lineWidth = this.boxBorderWidth;
      ctx.strokeRect(x, y, this.boxSize, this.boxSize);
    }
  }
  
  drawCheckMark(ctx, x, y) {
    ctx.strokeStyle = this.checkMarkColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 绘制对勾（两条线段）
    const centerX = x + this.boxSize / 2;
    const centerY = y + this.boxSize / 2;
    const size = this.boxSize * 0.6;
    
    ctx.beginPath();
    // 第一段：左下到中间
    ctx.moveTo(centerX - size * 0.3, centerY);
    ctx.lineTo(centerX - size * 0.05, centerY + size * 0.25);
    // 第二段：中间到右上
    ctx.lineTo(centerX + size * 0.35, centerY - size * 0.3);
    ctx.stroke();
  }
  
  drawText(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = this.textColor;
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, x, y);
    ctx.restore();
  }
}
/**
 * 单选按钮控件
 */
class RadioButtonWidget extends Widget {
  constructor(x, y, parentId = null) {
    super('radiobutton', x, y, parentId);
    
    this.width = 150;
    this.height = 30;
    
    // 单选按钮特有属性
    this.text = '单选按钮';
    this.textColor = '#000000';
    this.textColorAlpha = 255;
    this.fontSize = 16;
    this.buttonSize = 18;
    this.buttonBgColor = '#FFFFFF';
    this.buttonBgColorAlpha = 255;
    this.borderColor = '#CCCCCC';
    this.borderColorAlpha = 255;
    this.borderWidth = 1;
    this.selectedBgColor = '#2196F3';
    this.selectedBgColorAlpha = 255;
    this.dotColor = '#FFFFFF';
    this.dotColorAlpha = 255;
    this.groupName = 'default';
    this.selected = false;
    this.enabled = true;
  }

  drawContent(ctx, renderer, x, y, width, height) {
    ctx.save();

    const padding = 5;
    const buttonRadius = this.buttonSize / 2;
    const centerX = x + padding + buttonRadius;
    const centerY = y + height / 2;

    // 绘制圆形按钮
    this.drawButton(ctx, centerX, centerY, buttonRadius);

    // 如果选中，绘制内圆点
    if (this.selected) {
      this.drawDot(ctx, centerX, centerY, buttonRadius);
    }

    // 绘制文本
    this.drawText(ctx, x + padding * 2 + this.buttonSize, centerY);

    ctx.restore();
  }

  drawButton(ctx, centerX, centerY, radius) {
    // 绘制背景
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    const bgColor = this.selected ? this.selectedBgColor : this.buttonBgColor;
    const bgAlpha = this.selected ? this.selectedBgColorAlpha : this.buttonBgColorAlpha;
    ctx.fillStyle = this.alphaColor(bgColor, bgAlpha);
    ctx.fill();

    // 绘制边框
    if (this.borderWidth > 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.alphaColor(this.borderColor, this.borderColorAlpha);
      ctx.lineWidth = this.borderWidth;
      ctx.stroke();
    }
  }

  drawDot(ctx, centerX, centerY, outerRadius) {
    const dotRadius = outerRadius * 0.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.alphaColor(this.dotColor, this.dotColorAlpha);
    ctx.fill();
  }

  drawText(ctx, x, y) {
    if (!this.text) return;

    ctx.fillStyle = this.alphaColor(this.textColor, this.textColorAlpha);
    ctx.font = `${this.fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, x, y);
  }

  alphaColor(color, alpha) {
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha / 255})`;
  }
}

// 将所有Widget类显式附加到window对象，供base.js的getWidgetClass使用
window.ButtonWidget = ButtonWidget;
window.LabelWidget = LabelWidget;
window.TextInputWidget = TextInputWidget;
window.ImageWidget = ImageWidget;
window.ListViewWidget = ListViewWidget;
window.GridViewWidget = GridViewWidget;
window.TableViewWidget = TableViewWidget;
window.PanelWidget = PanelWidget;
window.ComboBoxWidget = ComboBoxWidget;
window.SliderWidget = SliderWidget;
window.CheckBoxWidget = CheckBoxWidget;
window.RadioButtonWidget = RadioButtonWidget;