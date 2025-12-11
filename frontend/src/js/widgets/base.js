/**
 * Widget 基类 - 所有UI控件的基础类
 */
class Widget {
  constructor(type, x, y, parentId = null) {
    // 标识属性
    this.id = this.generateId(type);
    this.type = type;
    
    // 位置和尺寸
    this.x = x;
    this.y = y;
    this.width = 100;
    this.height = 30;
    
    // 层级和可见性
    this.zIndex = 0;
    this.visible = true;
    this.interactive = true;
    this.opacity = 100; // 0-100
    
    // 父子关系
    this.parentId = parentId;
    
    // 边距 (影响布局)
    this.margin = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
    
    // 内边距 (影响内容区域)
    this.padding = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
    
    // 边框属性
    this.borderWidth = 0;
    this.borderColor = '#666666';
    this.borderColorAlpha = 255; // Alpha 通道 (0-255)
    this.borderRadius = 0;
    
    // 背景属性
    this.backgroundColor = '';
    this.backgroundColorAlpha = 255; // Alpha 通道 (0-255)
    this.backgroundResourceId = null;
  }
  
  /**
   * 生成唯一ID
   */
  generateId(type) {
    if (!Widget.typeCounters) {
      Widget.typeCounters = {
        button: 1,
        label: 1,
        textinput: 1,
        slider: 1,
        image: 1,
        listbox: 1,
        gridview: 1,
        panel: 1
      };
    }
    
    if (!Widget.typeCounters[type]) {
      Widget.typeCounters[type] = 1;
    }
    
    return `${type}${Widget.typeCounters[type]++}`;
  }
  
  /**
   * 重置ID计数器 (加载项目时使用)
   */
  static resetCounters(widgets) {
    Widget.typeCounters = {
      button: 1,
      label: 1,
      textinput: 1,
      slider: 1,
      image: 1,
      listbox: 1,
      gridview: 1,
      panel: 1
    };
    
    // 分析现有 ID，更新计数器
    widgets.forEach(widget => {
      const match = widget.id.match(/^([a-z]+)(\d+)$/);
      if (match) {
        const type = match[1];
        const num = parseInt(match[2]);
        if (Widget.typeCounters[type] !== undefined) {
          Widget.typeCounters[type] = Math.max(Widget.typeCounters[type], num + 1);
        }
      }
    });
  }
  
  /**
   * 获取内容区域 (减去 padding)
   */
  getContentBounds() {
    return {
      x: this.x + this.padding.left,
      y: this.y + this.padding.top,
      width: this.width - this.padding.left - this.padding.right,
      height: this.height - this.padding.top - this.padding.bottom
    };
  }
  
  /**
   * 获取外部边界 (包含 margin)
   */
  getOuterBounds() {
    return {
      x: this.x - this.margin.left,
      y: this.y - this.margin.top,
      width: this.width + this.margin.left + this.margin.right,
      height: this.height + this.margin.top + this.margin.bottom
    };
  }
  
  /**
   * 创建圆角矩形路径
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {number} w - 宽度
   * @param {number} h - 高度
   * @param {number} r - 圆角半径
   */
  createRoundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (r > 0) {
      const radius = Math.min(r, w / 2, h / 2);
      
      // 使用 arc() 绘制真正的圆弧
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.closePath();
  }
  
  /**
   * 渲染控件 - 公共渲染流程
   * 子类应该重写 drawContent() 而不是这个方法
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {CanvasRenderer} renderer - 渲染器对象
   * @param {boolean} selected - 是否被选中
   * @param {Object} tempRenderWidget - 临时渲染对象（拖拽/缩放时使用，包含临时坐标和尺寸）
   */
  render(ctx, renderer, selected, tempRenderWidget = null) {
    // 使用临时渲染对象或当前对象
    const renderObj = tempRenderWidget || this;
    
    // 获取绝对坐标
    const absPos = renderer.getAbsolutePosition(renderObj);
    const x = absPos.x;
    const y = absPos.y;
    const width = renderObj.width;
    const height = renderObj.height;
    
    // 保存上下文
    ctx.save();
    
    // 应用透明度
    const effectiveOpacity = this.getEffectiveOpacity(renderer);
    const isVisible = renderObj.visible !== false;
    if (!isVisible) {
      ctx.globalAlpha = effectiveOpacity * 0.3; // 不可见控件降低透明度
    } else {
      ctx.globalAlpha = effectiveOpacity;
    }
    
    // 绘制 margin 区域 (选中时显示)
    if (selected && (this.margin.top > 0 || this.margin.right > 0 || this.margin.bottom > 0 || this.margin.left > 0)) {
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)'; // 橙色虚线
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      const marginX = x - this.margin.left;
      const marginY = y - this.margin.top;
      const marginWidth = width + this.margin.left + this.margin.right;
      const marginHeight = height + this.margin.top + this.margin.bottom;
      ctx.strokeRect(marginX, marginY, marginWidth, marginHeight);
      ctx.setLineDash([]); // 重置虚线
    }
    
    // 获取当前状态的背景 (子类可以覆盖 getStateBackground)
    const stateBackground = this.getStateBackground ? this.getStateBackground() : null;
    const renderWidget = stateBackground ? { ...renderObj, ...stateBackground } : renderObj;
    
    // 如果有圆角，创建裁剪区域
    const borderRadius = renderObj.borderRadius || 0;
    if (borderRadius > 0) {
      ctx.save();
      this.createRoundedRectPath(ctx, x, y, width, height, borderRadius);
      ctx.clip();
    }
    
    // 绘制背景和边框
    renderer.drawBackgroundAndBorder(renderWidget, x, y, width, height);
    
    // 绘制内容 (子类实现)
    this.drawContent(ctx, renderer, x, y, width, height);
    
    // 恢复裁剪区域
    if (borderRadius > 0) {
      ctx.restore();
    }
    
    // 恢复上下文
    ctx.restore();
    
    // 选中时绘制调整手柄
    if (selected) {
      const handleWidget = { ...renderObj, x, y, width, height };
      renderer.drawResizeHandles(handleWidget);
    }
  }
  
  /**
   * 绘制控件内容 - 子类必须实现
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {CanvasRenderer} renderer - 渲染器对象
   * @param {number} x - 绘制 X 坐标
   * @param {number} y - 绘制 Y 坐标
   * @param {number} width - 绘制宽度
   * @param {number} height - 绘制高度
   */
  drawContent(ctx, renderer, x, y, width, height) {
    // 默认实现 - 显示类型名称
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type, x + width / 2, y + height / 2);
  }
  
  /**
   * 计算有效透明度 (考虑父容器)
   */
  getEffectiveOpacity(renderer) {
    let opacity = (this.opacity !== undefined ? this.opacity : 100) / 100;
    
    // 继承父容器透明度
    if (this.parentId) {
      const parent = renderer.widgets.find(w => w.id === this.parentId);
      if (parent && parent.getEffectiveOpacity) {
        const parentOpacity = parent.getEffectiveOpacity(renderer);
        opacity *= parentOpacity;
      }
    }
    
    // 不可见控件额外降低透明度
    if (!this.visible) {
      opacity *= 0.3;
    }
    
    return opacity;
  }
  
  /**
   * 序列化为普通对象 (用于保存)
   */
  toJSON() {
    // 返回所有可序列化属性
    const obj = {};
    for (const key in this) {
      if (this.hasOwnProperty(key) && typeof this[key] !== 'function') {
        obj[key] = this[key];
      }
    }
    return obj;
  }
  
  /**
   * 从普通对象恢复 (用于加载)
   */
  static fromJSON(data) {
    // 根据类型创建对应的实例
    const WidgetClass = Widget.getWidgetClass(data.type);
    const widget = new WidgetClass(data.x, data.y, data.parentId);
    
    // 复制所有属性
    Object.assign(widget, data);
    
    return widget;
  }
  
  /**
   * 根据类型获取对应的类
   */
  static getWidgetClass(type) {
    const classMap = {
      button: ButtonWidget,
      label: LabelWidget,
      textinput: TextInputWidget,
      slider: SliderWidget,
      image: ImageWidget,
      listbox: ListBoxWidget,
      gridview: GridViewWidget,
      panel: PanelWidget
    };
    
    return classMap[type] || Widget;
  }
}

// 静态属性
Widget.typeCounters = null;
