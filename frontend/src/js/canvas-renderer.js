// HTML5 Canvas 渲染器 - 替代 Ebiten WASM
class CanvasRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.canvasWidth = 800;
    this.canvasHeight = 600;
    this.widgets = [];
    this.selectedID = null;
    this.dragging = false;
    this.dragID = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dragTempX = 0; // 拖拽时的临时绝对坐标
    this.dragTempY = 0;
    this.resizing = false;
    this.resizeID = null;
    this.resizeDir = null;
    this.animationFrameId = null;
    this.zoom = 1.0; // 缩放比例
    
    window.canvasRenderer = this;
  }

  init(width = 800, height = 600) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    this.canvas = document.getElementById('main-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 设置 canvas 尺寸
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    
    // 设置边框指示器
    const border = document.getElementById('canvas-border');
    border.style.position = 'absolute';
    border.style.left = '0';
    border.style.top = '0';
    border.style.width = this.canvasWidth + 'px';
    border.style.height = this.canvasHeight + 'px';
    border.style.border = '2px solid #333';
    border.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    border.style.pointerEvents = 'none';
    border.style.zIndex = '1000';
    
    // 绑定事件
    this.setupEvents();
    
    // 监听 Electron 菜单的缩放事件
    this.setupZoomEvents();
    
    // 开始渲染循环
    this.startRenderLoop();
    
    console.log('✓ Canvas Renderer initialized:', this.canvasWidth, 'x', this.canvasHeight);
    return true;
  }

  setupZoomEvents() {
    if (window.electronAPI) {
      window.electronAPI.onCanvasZoomIn(() => {
        this.setZoom(Math.min(this.zoom + 0.1, 3.0));
      });
      
      window.electronAPI.onCanvasZoomOut(() => {
        this.setZoom(Math.max(this.zoom - 0.1, 0.5));
      });
      
      window.electronAPI.onCanvasZoomReset(() => {
        this.setZoom(1.0);
      });
    }
  }

  setZoom(newZoom) {
    this.zoom = newZoom;
    
    // 更新 canvas 的 CSS transform
    this.canvas.style.transform = `scale(${this.zoom})`;
    this.canvas.style.transformOrigin = 'top left';
    
    // 同时更新边框
    const border = document.getElementById('canvas-border');
    border.style.transform = `scale(${this.zoom})`;
    border.style.transformOrigin = 'top left';
    
    // 更新右上角显示
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
      zoomDisplay.textContent = (this.zoom * 100).toFixed(0) + '%';
    }
    
    console.log('Canvas zoom:', (this.zoom * 100).toFixed(0) + '%');
  }

  setupEvents() {
    // 鼠标按下
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.zoom;
      const y = (e.clientY - rect.top) / this.zoom;
      this.handleMouseDown(x, y);
    });

    // 鼠标移动 - 在 canvas 上监听，用于悬停效果
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.zoom;
      const y = (e.clientY - rect.top) / this.zoom;
      this.handleMouseMove(x, y);
    });

    // 在 document 上监听鼠标移动和释放，确保拖拽时即使移出画布也能继续
    document.addEventListener('mousemove', (e) => {
      // 只在拖拽或调整大小时处理
      if (this.dragging || this.resizing) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;
        this.handleMouseMove(x, y);
      }
    });

    document.addEventListener('mouseup', (e) => {
      // 只在拖拽或调整大小时处理
      if (this.dragging || this.resizing) {
        this.handleMouseUp();
      }
    });
  }

  handleMouseDown(x, y) {
    // 在任何操作之前，先清除所有临时坐标（确保点击检测使用真实位置）
    this.widgets.forEach(w => {
      delete w.renderX;
      delete w.renderY;
      delete w.renderWidth;
      delete w.renderHeight;
    });
    
    // 检查是否点击了 resize handle
    if (this.selectedID) {
      const widget = this.widgets.find(w => w.id === this.selectedID);
      if (widget) {
        const absPos = this.getAbsolutePosition(widget);
        const renderWidget = { ...widget, x: absPos.x, y: absPos.y };
        
        const dir = this.getResizeHandle(renderWidget, x, y);
        if (dir) {
          this.resizing = true;
          this.resizeID = widget.id;
          this.resizeDir = dir;
          return;
        }
      }
    }

    // 检查是否点击了 widget（使用计算后的绝对坐标）
    // 按 z-index 从大到小排序，优先检测最上层的控件
    const sortedWidgets = [...this.widgets].sort((a, b) => {
      const aZ = a.zIndex || 0;
      const bZ = b.zIndex || 0;
      return bZ - aZ; // 从大到小，最上层在前面
    });
    
    for (const w of sortedWidgets) {
      const absPos = this.getAbsolutePosition(w);
      const renderX = absPos.x;
      const renderY = absPos.y;
      
      if (x >= renderX && x <= renderX + w.width && y >= renderY && y <= renderY + w.height) {
        this.dragging = true;
        this.dragID = w.id;
        this.offsetX = x - renderX;
        this.offsetY = y - renderY;
        // 初始化临时拖拽坐标为当前控件位置，避免使用旧值
        this.dragTempX = renderX;
        this.dragTempY = renderY;
        this.selectedID = w.id;
        this.notifySelection(w);
        return;
      }
    }

    // 点击空白处 - 创建模式或取消选择
    if (window.toolbar && window.toolbar.creatingType) {
      // 直接在画布上创建，不自动判断父子关系
      window.toolbar.createWidgetAt(x, y);
    } else {
      this.selectedID = null;
      if (window.app) {
        window.app.selectWidget(null);
      }
    }
  }

  // 查找点击位置的面板容器
  handleMouseMove(x, y) {
    // 拖拽中 - 实时更新显示位置，但不判断父子容器关系
    if (this.dragging && this.dragID) {
      const widget = this.widgets.find(w => w.id === this.dragID);
      if (widget) {
        // 计算新位置
        this.dragTempX = Math.max(0, Math.min(this.canvasWidth - widget.width, x - this.offsetX));
        this.dragTempY = Math.max(0, Math.min(this.canvasHeight - widget.height, y - this.offsetY));
        
        // 使用临时渲染坐标实时更新显示，不修改真实的 x/y
        widget.renderX = this.dragTempX;
        widget.renderY = this.dragTempY;
      }
      return;
    }

    // 调整大小中
    if (this.resizing && this.resizeID) {
      const widget = this.widgets.find(w => w.id === this.resizeID);
      if (widget) {
        this.handleResize(widget, x, y, this.resizeDir);
      }
      return;
    }

    // 更新鼠标样式
    this.updateCursor(x, y);
  }

  handleMouseUp() {
    if (this.dragging && this.dragID) {
      const widget = this.widgets.find(w => w.id === this.dragID);
      if (widget && window.app) {
        // 不再自动判断父子关系，只更新坐标
        // 父子关系由左侧层级树拖拽来管理
        
        if (widget.parentId) {
          // 如果有父容器，转换为相对坐标
          const parent = this.widgets.find(w => w.id === widget.parentId);
          if (parent) {
            const parentPos = this.getAbsolutePosition(parent);
            widget.x = this.dragTempX - parentPos.x;
            widget.y = this.dragTempY - parentPos.y;
            
            // 限制子控件不能超出父容器边缘
            widget.x = Math.max(0, Math.min(parent.width - widget.width, widget.x));
            widget.y = Math.max(0, Math.min(parent.height - widget.height, widget.y));
          }
        } else {
          // 无父容器，使用绝对坐标
          widget.x = this.dragTempX;
          widget.y = this.dragTempY;
        }
        
        // 清除临时渲染坐标
        delete widget.renderX;
        delete widget.renderY;
        
        window.app.updateWidgetInList(widget);
      }
    }

    if (this.resizing && this.resizeID) {
      const widget = this.widgets.find(w => w.id === this.resizeID);
      if (widget && window.app) {
        // 将临时尺寸应用到真实尺寸
        if (widget.renderWidth !== undefined) {
          widget.width = widget.renderWidth;
          delete widget.renderWidth;
        }
        if (widget.renderHeight !== undefined) {
          widget.height = widget.renderHeight;
          delete widget.renderHeight;
        }
        window.app.updateWidgetInList(widget);
      }
    }

    // 清除所有控件的临时渲染坐标和尺寸
    this.widgets.forEach(w => {
      delete w.renderX;
      delete w.renderY;
      delete w.renderWidth;
      delete w.renderHeight;
    });
    
    this.dragging = false;
    this.dragID = null;
    this.resizing = false;
    this.resizeID = null;
    this.resizeDir = null;
  }

  updateCursor(x, y) {
    let cursor = 'default';

    if (this.selectedID) {
      const widget = this.widgets.find(w => w.id === this.selectedID);
      if (widget) {
        const dir = this.getResizeHandle(widget, x, y);
        if (dir) {
          const cursorMap = {
            'se': 'nwse-resize',
            'e': 'ew-resize',
            's': 'ns-resize',
            'sw': 'nesw-resize',
            'w': 'ew-resize',
            'ne': 'nesw-resize',
            'n': 'ns-resize',
            'nw': 'nwse-resize'
          };
          cursor = cursorMap[dir] || 'default';
        }
      }
    }

    this.canvas.style.cursor = cursor;
  }

  getResizeHandle(widget, x, y) {
    const handleSize = 8;
    const { x: wx, y: wy, width, height } = widget;

    // 东南角
    if (Math.abs(x - (wx + width)) < handleSize && Math.abs(y - (wy + height)) < handleSize) {
      return 'se';
    }
    // 东边
    if (Math.abs(x - (wx + width)) < handleSize && y >= wy && y <= wy + height) {
      return 'e';
    }
    // 南边
    if (Math.abs(y - (wy + height)) < handleSize && x >= wx && x <= wx + width) {
      return 's';
    }

    return null;
  }

  handleResize(widget, x, y, dir) {
    const minSize = 20;
    
    // 计算控件的实际位置（可能在父容器中）
    const absPos = this.getAbsolutePosition(widget);

    switch (dir) {
      case 'se':
        widget.renderWidth = Math.max(minSize, x - absPos.x);
        widget.renderHeight = Math.max(minSize, y - absPos.y);
        break;
      case 'e':
        widget.renderWidth = Math.max(minSize, x - absPos.x);
        break;
      case 's':
        widget.renderHeight = Math.max(minSize, y - absPos.y);
        break;
    }
  }

  notifySelection(widget) {
    if (window.app) {
      window.app.selectWidget(widget);
    }
  }

  startRenderLoop() {
    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  render() {
    // 清空画布
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 绘制网格
    this.drawGrid();

    // 直接使用 canvas 的 widgets（保留拖拽/缩放时的临时坐标）
    // 按 zIndex 排序，确保层级正确显示
    const widgetsToRender = [...this.widgets].sort((a, b) => {
      const aZ = a.zIndex || 0;
      const bZ = b.zIndex || 0;
      return aZ - bZ;
    });

    // 绘制所有 widgets
    for (const widget of widgetsToRender) {
      const isSelected = widget.id === this.selectedID;
      this.drawWidget(widget, isSelected);
      
      // 选中时绘制坐标信息标注
      if (isSelected) {
        // 计算当前显示的坐标和尺寸（包括临时拖拽/缩放状态）
        const absPos = this.getAbsolutePosition(widget);
        const displayX = widget.renderX !== undefined ? widget.renderX : absPos.x;
        const displayY = widget.renderY !== undefined ? widget.renderY : absPos.y;
        const displayWidth = widget.renderWidth !== undefined ? widget.renderWidth : widget.width;
        const displayHeight = widget.renderHeight !== undefined ? widget.renderHeight : widget.height;
        
        this.drawWidgetInfo(widget, displayX, displayY, displayWidth, displayHeight);
      }
    }
  }

  getAbsolutePosition(widget) {
    let x = widget.x;
    let y = widget.y;
    
    if (widget.parentId) {
      const parent = this.widgets.find(w => w.id === widget.parentId);
      if (parent) {
        const parentPos = this.getAbsolutePosition(parent);
        x += parentPos.x;
        y += parentPos.y;
      }
    }
    
    return { x, y };
  }

  drawGrid() {
    const gridSize = 20;
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 1;

    // 垂直线
    for (let x = 0; x <= this.canvasWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
      this.ctx.stroke();
    }

    // 水平线
    for (let y = 0; y <= this.canvasHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
      this.ctx.stroke();
    }
  }

  drawWidget(widget, selected) {
    const { type } = widget;
    // 优先使用临时渲染坐标（拖拽/缩放时），否则计算绝对坐标
    let x, y, width, height;
    
    // 检查是否有临时坐标或临时尺寸（拖拽或缩放时）
    const hasTempCoords = widget.renderX !== undefined && widget.renderY !== undefined;
    const hasTempSize = widget.renderWidth !== undefined || widget.renderHeight !== undefined;
    
    if (hasTempCoords || hasTempSize) {
      // 拖拽或缩放时使用临时值
      const absPos = this.getAbsolutePosition(widget);
      x = widget.renderX !== undefined ? widget.renderX : absPos.x;
      y = widget.renderY !== undefined ? widget.renderY : absPos.y;
      width = widget.renderWidth !== undefined ? widget.renderWidth : widget.width;
      height = widget.renderHeight !== undefined ? widget.renderHeight : widget.height;
    } else {
      // 正常情况下计算绝对坐标
      const absPos = this.getAbsolutePosition(widget);
      x = absPos.x;
      y = absPos.y;
      width = widget.width;
      height = widget.height;
    }
    
    const isVisible = widget.visible !== false;
    
    // 创建包含绝对坐标和临时尺寸的临时对象
    const renderWidget = { ...widget, x, y, width, height };
    
    // 保存上下文状态
    this.ctx.save();
    
    // 应用透明度（考虑父容器）
    let effectiveOpacity = (widget.opacity !== undefined ? widget.opacity : 100) / 100;
    
    // 如果有父容器，继承父容器的透明度
    if (widget.parentId) {
      const parent = this.widgets.find(w => w.id === widget.parentId);
      if (parent) {
        const parentOpacity = (parent.opacity !== undefined ? parent.opacity : 100) / 100;
        effectiveOpacity *= parentOpacity;
      }
    }
    
    // 不可见控件额外降低透明度
    if (!isVisible) {
      effectiveOpacity *= 0.3;
    }
    
    this.ctx.globalAlpha = effectiveOpacity;

    // 根据类型绘制
    switch (type) {
      case 'button':
        this.drawButton(renderWidget, selected);
        break;
      case 'label':
        this.drawLabel(renderWidget, selected);
        break;
      case 'textinput':
        this.drawTextInput(renderWidget, selected);
        break;
      case 'slider':
        this.drawSlider(renderWidget, selected);
        break;
      case 'image':
        this.drawImage(renderWidget, selected);
        break;
      case 'listbox':
        this.drawListBox(renderWidget, selected);
        break;
      case 'gridview':
        this.drawGridView(renderWidget, selected);
        break;
      case 'panel':
        this.drawPanel(renderWidget, selected);
        break;
      default:
        this.drawDefault(renderWidget, selected);
    }

    // 恢复上下文状态
    this.ctx.restore();

    // 选中时绘制 resize handles
    if (selected) {
      this.drawResizeHandles(renderWidget);
    }
  }

  // 辅助函数：绘制背景和边框（支持圆角和9-patch图片）
  drawBackgroundAndBorder(widget, x, y, width, height) {
    const borderRadius = widget.borderRadius || 0;
    const borderWidth = widget.borderWidth || 0;
    const borderColor = widget.borderColor || '#666666';
    const backgroundColor = widget.backgroundColor;
    const backgroundResourceId = widget.backgroundResourceId;
    
    // 创建圆角矩形路径
    const createRoundedRectPath = (x, y, w, h, r) => {
      this.ctx.beginPath();
      if (r > 0) {
        const radius = Math.min(r, w / 2, h / 2);
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + w - radius, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        this.ctx.lineTo(x + w, y + h - radius);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        this.ctx.lineTo(x + radius, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
      } else {
        this.ctx.rect(x, y, w, h);
      }
      this.ctx.closePath();
    };
    
    // 绘制背景
    if (backgroundResourceId && window.resourceManager) {
      const resource = window.resourceManager.getResource(backgroundResourceId, 'images');
      if (resource && resource.data) {
        const img = new Image();
        img.src = resource.data;
        
        // 检查是否有9-patch切片信息
        const hasSlice = resource.sliceLeft > 0 || resource.sliceTop > 0 || 
                        resource.sliceRight > 0 || resource.sliceBottom > 0;
        
        if (hasSlice) {
          // 绘制9-patch图片
          this.draw9PatchImage(img, resource, x, y, width, height, borderRadius);
        } else {
          // 普通拉伸
          this.ctx.save();
          createRoundedRectPath(x, y, width, height, borderRadius);
          this.ctx.clip();
          this.ctx.drawImage(img, x, y, width, height);
          this.ctx.restore();
        }
      }
    } else if (backgroundColor) {
      // 纯色背景
      this.ctx.save();
      createRoundedRectPath(x, y, width, height, borderRadius);
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fill();
      this.ctx.restore();
    }
    
    // 绘制边框
    if (borderWidth > 0 && borderColor) {
      this.ctx.save();
      createRoundedRectPath(x, y, width, height, borderRadius);
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = borderWidth;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
  
  // 辅助函数：绘制9-patch图片
  draw9PatchImage(img, resource, x, y, width, height, borderRadius) {
    const sl = resource.sliceLeft || 0;
    const st = resource.sliceTop || 0;
    const sr = resource.sliceRight || 0;
    const sb = resource.sliceBottom || 0;
    
    const imgW = img.width || img.naturalWidth;
    const imgH = img.height || img.naturalHeight;
    
    // 计算源图片的9个区域
    const srcLeft = 0;
    const srcTop = 0;
    const srcRight = imgW - sr;
    const srcBottom = imgH - sb;
    const srcCenterW = srcRight - sl;
    const srcCenterH = srcBottom - st;
    
    // 计算目标区域
    const dstLeft = x;
    const dstTop = y;
    const dstRight = x + width - sr;
    const dstBottom = y + height - sb;
    const dstCenterW = dstRight - dstLeft - sl;
    const dstCenterH = dstBottom - dstTop - st;
    
    this.ctx.save();
    
    // 如果有圆角，先裁剪
    if (borderRadius > 0) {
      const radius = Math.min(borderRadius, width / 2, height / 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + width - radius, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.ctx.lineTo(x + width, y + height - radius);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.ctx.lineTo(x + radius, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
      this.ctx.clip();
    }
    
    // 绘制9个区域
    // 左上角
    if (sl > 0 && st > 0) {
      this.ctx.drawImage(img, srcLeft, srcTop, sl, st, dstLeft, dstTop, sl, st);
    }
    
    // 上边
    if (srcCenterW > 0 && st > 0 && dstCenterW > 0) {
      this.ctx.drawImage(img, sl, srcTop, srcCenterW, st, dstLeft + sl, dstTop, dstCenterW, st);
    }
    
    // 右上角
    if (sr > 0 && st > 0) {
      this.ctx.drawImage(img, srcRight, srcTop, sr, st, dstRight, dstTop, sr, st);
    }
    
    // 左边
    if (sl > 0 && srcCenterH > 0 && dstCenterH > 0) {
      this.ctx.drawImage(img, srcLeft, st, sl, srcCenterH, dstLeft, dstTop + st, sl, dstCenterH);
    }
    
    // 中心
    if (srcCenterW > 0 && srcCenterH > 0 && dstCenterW > 0 && dstCenterH > 0) {
      this.ctx.drawImage(img, sl, st, srcCenterW, srcCenterH, dstLeft + sl, dstTop + st, dstCenterW, dstCenterH);
    }
    
    // 右边
    if (sr > 0 && srcCenterH > 0 && dstCenterH > 0) {
      this.ctx.drawImage(img, srcRight, st, sr, srcCenterH, dstRight, dstTop + st, sr, dstCenterH);
    }
    
    // 左下角
    if (sl > 0 && sb > 0) {
      this.ctx.drawImage(img, srcLeft, srcBottom, sl, sb, dstLeft, dstBottom, sl, sb);
    }
    
    // 下边
    if (srcCenterW > 0 && sb > 0 && dstCenterW > 0) {
      this.ctx.drawImage(img, sl, srcBottom, srcCenterW, sb, dstLeft + sl, dstBottom, dstCenterW, sb);
    }
    
    // 右下角
    if (sr > 0 && sb > 0) {
      this.ctx.drawImage(img, srcRight, srcBottom, sr, sb, dstRight, dstBottom, sr, sb);
    }
    
    this.ctx.restore();
  }

  // 辅助函数：绘制样式化文本
  drawStyledText(widget, x, y, width, height, text) {
    const fontSize = widget.fontSize || 14;
    const fontFamily = widget.fontFamily || 'Arial';
    const fontBold = widget.fontBold ? 'bold ' : '';
    const fontItalic = widget.fontItalic ? 'italic ' : '';
    const textAlign = widget.textAlign || 'center';
    const textColor = widget.textColor || '#333333';
    const strokeColor = widget.strokeColor;
    const strokeWidth = widget.strokeWidth || 0;
    
    // 设置字体
    this.ctx.font = `${fontItalic}${fontBold}${fontSize}px ${fontFamily}`;
    this.ctx.textBaseline = 'middle';
    
    // 计算文本位置
    let textX;
    if (textAlign === 'left') {
      this.ctx.textAlign = 'left';
      textX = x + 8;
    } else if (textAlign === 'right') {
      this.ctx.textAlign = 'right';
      textX = x + width - 8;
    } else {
      this.ctx.textAlign = 'center';
      textX = x + width / 2;
    }
    const textY = y + height / 2;
    
    // 先绘制描边（如果有）
    if (strokeWidth > 0 && strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth * 2; // 加倍描边宽度使效果更明显
      this.ctx.lineJoin = 'round';
      this.ctx.miterLimit = 2;
      this.ctx.strokeText(text, textX, textY);
    }
    
    // 再绘制填充文本
    this.ctx.fillStyle = textColor;
    this.ctx.fillText(text, textX, textY);
    
    // 绘制下划线和删除线（仅标签）
    if (widget.type === 'label') {
      const metrics = this.ctx.measureText(text);
      let lineX = textX;
      if (textAlign === 'center') {
        lineX = textX - metrics.width / 2;
      } else if (textAlign === 'right') {
        lineX = textX - metrics.width;
      }
      
      this.ctx.strokeStyle = textColor;
      this.ctx.lineWidth = Math.max(1, fontSize / 14);
      
      if (widget.textUnderline) {
        this.ctx.beginPath();
        this.ctx.moveTo(lineX, textY + fontSize / 3);
        this.ctx.lineTo(lineX + metrics.width, textY + fontSize / 3);
        this.ctx.stroke();
      }
      
      if (widget.textStrikethrough) {
        this.ctx.beginPath();
        this.ctx.moveTo(lineX, textY);
        this.ctx.lineTo(lineX + metrics.width, textY);
        this.ctx.stroke();
      }
    }
  }

  drawButton(widget, selected) {
    const { x, y, width, height, text, enabled } = widget;
    
    // 绘制背景和边框
    this.drawBackgroundAndBorder(widget, x, y, width, height);
    
    // 如果没有自定义背景,使用默认按钮颜色
    if (!widget.backgroundColor && !widget.backgroundResourceId) {
      this.ctx.fillStyle = enabled !== false ? '#4287f5' : '#999';
      this.ctx.fillRect(x, y, width, height);
    }
    
    // 选中时的边框
    if (selected) {
      this.ctx.strokeStyle = '#ff8800';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    }
    
    // 文字
    this.drawStyledText(widget, x, y, width, height, text || '按钮');
  }

  drawLabel(widget, selected) {
    const { x, y, width, height, text } = widget;
    
    // 绘制背景和边框
    this.drawBackgroundAndBorder(widget, x, y, width, height);
    
    // 选中时的高亮边框
    if (selected) {
      this.ctx.strokeStyle = '#ff8800';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    }
    
    // 文字
    this.drawStyledText(widget, x, y, width, height, text || '标签');
  }

  drawTextInput(widget, selected) {
    const { x, y, width, height, text, placeholder, enabled } = widget;
    
    // 绘制背景和边框
    this.drawBackgroundAndBorder(widget, x, y, width, height);
    
    // 如果没有自定义背景,使用默认背景色
    if (!widget.backgroundColor && !widget.backgroundResourceId) {
      this.ctx.fillStyle = enabled !== false ? '#fff' : '#f0f0f0';
      this.ctx.fillRect(x, y, width, height);
    }
    
    // 选中时的边框
    if (selected) {
      this.ctx.strokeStyle = '#ff8800';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    }
    
    // 文字或占位符
    if (text) {
      this.drawStyledText(widget, x, y, width, height, text);
    } else if (placeholder) {
      const fontSize = widget.fontSize || 14;
      const fontFamily = widget.fontFamily || 'Arial';
      this.ctx.font = `${fontSize}px ${fontFamily}`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#999';
      this.ctx.fillText(placeholder, x + 8, y + height / 2);
    }
  }

  drawSlider(widget, selected) {
    const { x, y, width, height, min, max, value, enabled } = widget;
    
    const minVal = min || 0;
    const maxVal = max || 100;
    const curVal = value !== undefined ? value : 50;
    const percent = (curVal - minVal) / (maxVal - minVal);
    
    // 轨道背景
    const trackY = y + height / 2 - 2;
    this.ctx.fillStyle = enabled !== false ? '#ddd' : '#f0f0f0';
    this.ctx.fillRect(x, trackY, width, 4);
    
    // 已填充部分
    this.ctx.fillStyle = enabled !== false ? '#4287f5' : '#999';
    this.ctx.fillRect(x, trackY, width * percent, 4);
    
    // 滑块
    const thumbX = x + width * percent;
    this.ctx.beginPath();
    this.ctx.arc(thumbX, y + height / 2, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = enabled !== false ? '#4287f5' : '#999';
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 边框（选中时）
    if (selected) {
      this.ctx.strokeStyle = '#ff8800';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  drawImage(widget, selected) {
    const { x, y, width, height, imagePath, src } = widget;
    
    // 背景
    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.fillRect(x, y, width, height);
    
    // 如果有图像数据（从资源管理器），尝试绘制
    if (src) {
      // 创建或获取缓存的图像对象
      if (!this.imageCache) this.imageCache = {};
      
      const cacheKey = widget.id;
      if (!this.imageCache[cacheKey] || this.imageCache[cacheKey].src !== src) {
        const img = new Image();
        img.src = src;
        this.imageCache[cacheKey] = { img, src, loaded: false };
        
        img.onload = () => {
          this.imageCache[cacheKey].loaded = true;
          this.render(); // 重新渲染
        };
      }
      
      const cached = this.imageCache[cacheKey];
      if (cached.loaded) {
        // 绘制图像，保持宽高比
        const imgAspect = cached.img.width / cached.img.height;
        const boxAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        if (imgAspect > boxAspect) {
          drawWidth = width;
          drawHeight = width / imgAspect;
          drawX = x;
          drawY = y + (height - drawHeight) / 2;
        } else {
          drawHeight = height;
          drawWidth = height * imgAspect;
          drawX = x + (width - drawWidth) / 2;
          drawY = y;
        }
        
        this.ctx.drawImage(cached.img, drawX, drawY, drawWidth, drawHeight);
      }
    }
    
    // 边框
    this.ctx.strokeStyle = selected ? '#ff8800' : '#999';
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, width, height);
    
    // 如果没有图像，显示占位文本
    if (!src) {
      this.ctx.fillStyle = '#666';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(imagePath ? '🖼️ ' + imagePath.split('/').pop() : '🖼️ 图像', x + width / 2, y + height / 2);
    }
  }

  drawListBox(widget, selected) {
    const { x, y, width, height, items, enabled } = widget;
    
    // 背景
    this.ctx.fillStyle = enabled !== false ? '#fff' : '#f0f0f0';
    this.ctx.fillRect(x, y, width, height);
    
    // 边框
    this.ctx.strokeStyle = selected ? '#ff8800' : '#999';
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, width, height);
    
    // 示例项目
    this.ctx.fillStyle = '#333';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    
    const itemCount = items && items.length > 0 ? Math.min(items.length, 5) : 3;
    for (let i = 0; i < itemCount; i++) {
      const itemY = y + 8 + i * 24;
      const itemText = items && items[i] ? items[i] : `项目 ${i + 1}`;
      this.ctx.fillText(itemText, x + 8, itemY);
    }
  }

  drawGridView(widget, selected) {
    const { x, y, width, height, columns, enabled } = widget;
    
    // 背景
    this.ctx.fillStyle = enabled !== false ? '#fff' : '#f0f0f0';
    this.ctx.fillRect(x, y, width, height);
    
    // 边框
    this.ctx.strokeStyle = selected ? '#ff8800' : '#999';
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, width, height);
    
    // 网格项目示例
    const cols = columns || 4;
    const cellSize = Math.min(width / cols - 10, 60);
    const padding = 8;
    
    for (let i = 0; i < Math.min(cols * 2, 8); i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellX = x + padding + col * (cellSize + padding);
      const cellY = y + padding + row * (cellSize + padding);
      
      if (cellY + cellSize < y + height) {
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillRect(cellX, cellY, cellSize, cellSize);
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cellX, cellY, cellSize, cellSize);
      }
    }
  }

  drawPanel(widget, selected) {
    const { x, y, width, height, text } = widget;
    
    // 绘制背景和边框
    this.drawBackgroundAndBorder(widget, x, y, width, height);
    
    // 如果没有自定义背景,使用默认白色
    if (!widget.backgroundColor && !widget.backgroundResourceId) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(x, y, width, height);
    }
    
    // 选中时的边框
    if (selected) {
      this.ctx.strokeStyle = '#ff8800';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    }
    
    // 标题
    if (text) {
      this.ctx.fillStyle = '#666';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(text, x + 8, y + 8);
    }
  }

  drawDefault(widget, selected) {
    const { x, y, width, height, type, text } = widget;
    
    // 背景
    this.ctx.fillStyle = '#969696';
    this.ctx.fillRect(x, y, width, height);
    
    // 边框
    this.ctx.strokeStyle = selected ? '#ff8800' : '#333';
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, width, height);
    
    // 文字
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text || type, x + width / 2, y + height / 2);
  }

  drawResizeHandles(widget) {
    const { x, y, width, height } = widget;
    const handleSize = 8;

    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    // 东南角
    this.ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
    this.ctx.strokeRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);

    // 东边
    this.ctx.fillRect(x + width - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize);
    this.ctx.strokeRect(x + width - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize);

    // 南边
    this.ctx.fillRect(x + width / 2 - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
    this.ctx.strokeRect(x + width / 2 - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
  }

  drawWidgetInfo(widget, displayX, displayY, displayWidth, displayHeight) {
    // 显示原始坐标和尺寸（相对于父容器）
    const text = `x:${Math.round(widget.x)} y:${Math.round(widget.y)} w:${Math.round(displayWidth)} h:${Math.round(displayHeight)}`;
    
    // 设置字体样式
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    
    // 测量文本宽度
    const textMetrics = this.ctx.measureText(text);
    const textWidth = textMetrics.width;
    const padding = 4;
    const labelHeight = 16;
    
    // 计算标签位置（使用显示坐标，控件上方，居中对齐）
    let labelX = displayX + displayWidth / 2 - textWidth / 2 - padding;
    let labelY = displayY - labelHeight - 2;
    
    // 如果标签超出画布顶部，显示在控件下方
    if (labelY < 0) {
      labelY = displayY + displayHeight + 2;
    }
    
    // 确保标签不超出左右边界
    if (labelX < 0) labelX = 2;
    if (labelX + textWidth + padding * 2 > this.canvasWidth) {
      labelX = this.canvasWidth - textWidth - padding * 2 - 2;
    }
    
    // 绘制半透明背景
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(labelX, labelY, textWidth + padding * 2, labelHeight);
    
    // 绘制文字（使用 top 基线，从背景框顶部开始绘制）
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(text, labelX + padding, labelY + 2);
  }

  // API 方法
  setWidgets(widgets) {
    this.widgets = widgets;
  }

  selectWidget(id) {
    this.selectedID = id;
  }

  getSelectedID() {
    return this.selectedID;
  }

  updateWidget(widget) {
    const index = this.widgets.findIndex(w => w.id === widget.id);
    if (index >= 0) {
      this.widgets[index] = widget;
    }
  }

  setCanvasSize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    const border = document.getElementById('canvas-border');
    border.style.width = width + 'px';
    border.style.height = height + 'px';
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

const canvasRenderer = new CanvasRenderer();
