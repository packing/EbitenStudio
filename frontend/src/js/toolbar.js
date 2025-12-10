class Toolbar {
  constructor() {
    this.creatingType = null; // 当前要创建的类型
    // 为每种控件类型维护独立的计数器
    this.typeCounters = {
      button: 1,
      label: 1,
      textinput: 1,
      slider: 1,
      image: 1,
      listbox: 1,
      gridview: 1,
      panel: 1
    };
    this.setupEventListeners();
  }
  
  generateId(type) {
    if (!this.typeCounters[type]) {
      this.typeCounters[type] = 1;
    }
    const id = `${type}${this.typeCounters[type]}`;
    this.typeCounters[type]++;
    return id;
  }
  
  // 重新初始化计数器（从现有控件列表）
  resetCounters(widgets) {
    // 重置所有计数器
    Object.keys(this.typeCounters).forEach(type => {
      this.typeCounters[type] = 1;
    });
    
    // 从现有控件中找出最大序号
    widgets.forEach(widget => {
      const match = widget.id.match(/^([a-z]+)(\d+)$/i);
      if (match) {
        const type = match[1];
        const num = parseInt(match[2]);
        if (this.typeCounters[type] !== undefined) {
          this.typeCounters[type] = Math.max(this.typeCounters[type], num + 1);
        }
      }
    });
  }

  setupEventListeners() {
    // 创建组件按钮
    document.querySelectorAll('[id^="btn-create-"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.startCreateMode(type);
      });
    });

    // 删除按钮
    document.getElementById('btn-delete').addEventListener('click', () => {
      this.deleteSelectedWidget();
    });
  }

  startCreateMode(type) {
    this.creatingType = type;
    
    // 更新按钮状态
    document.querySelectorAll('[id^="btn-create-"]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // 改变鼠标样式
    document.getElementById('canvas-container').style.cursor = 'crosshair';
    
    console.log('Click on canvas to place', type);
  }

  createWidgetAt(x, y) {
    if (!this.creatingType) return;
    
    // 直接在画布上创建，不自动判断父子关系
    // 父子关系由左侧层级树拖拽管理
    const widget = this.createWidgetByType(this.creatingType, x, y, null);

    console.log('Widget created at:', x, y, widget);
    app.addWidgetToList(widget);
    
    // 退出创建模式
    this.exitCreateMode();
  }

  createWidgetByType(type, x, y, parentId = null) {
    // 基础属性
    const baseWidget = {
      id: this.generateId(type),
      type: type,
      x: x,
      y: y,
      visible: true,
      interactive: true,
      parentId: parentId, // 父容器ID
      zIndex: 0, // z-index 层级
      opacity: 100, // 透明度 0-100
      // 边框属性
      borderWidth: 0,
      borderColor: '#666666',
      borderRadius: 0,
      // 背景属性
      backgroundColor: '',
      backgroundResourceId: null, // 背景图片资源ID
    };

    // 根据类型添加特定属性
    switch (type) {
      case 'button':
        return {
          ...baseWidget,
          width: 120,
          height: 40,
          text: '按钮',
          enabled: true,
          fontSize: 14,
          fontFamily: 'Arial',
          fontBold: false,
          fontItalic: false,
          textAlign: 'center',
          textColor: '#333333',
        };
      
      case 'label':
        return {
          ...baseWidget,
          width: 120,
          height: 30,
          text: '标签文本',
          fontSize: 14,
          fontFamily: 'Arial',
          fontBold: false,
          fontItalic: false,
          textUnderline: false,
          textStrikethrough: false,
          textAlign: 'center',
          textColor: '#333333',
          strokeColor: '',
          strokeWidth: 0,
        };
      
      case 'textinput':
        return {
          ...baseWidget,
          width: 200,
          height: 32,
          text: '',
          placeholder: '请输入...',
          enabled: true,
          fontSize: 14,
          fontFamily: 'Arial',
          textColor: '#333333',
        };
      
      case 'slider':
        return {
          ...baseWidget,
          width: 200,
          height: 24,
          min: 0,
          max: 100,
          value: 50,
          enabled: true,
        };
      
      case 'image':
        return {
          ...baseWidget,
          width: 128,
          height: 128,
          imagePath: '',
        };
      
      case 'listbox':
        return {
          ...baseWidget,
          width: 200,
          height: 150,
          items: [],
          enabled: true,
        };
      
      case 'gridview':
        return {
          ...baseWidget,
          width: 300,
          height: 200,
          items: [],
          columns: 4,
          enabled: true,
        };
      
      case 'panel':
        return {
          ...baseWidget,
          width: 300,
          height: 200,
          text: '面板',
          children: [], // 子控件列表
        };
      
      default:
        return {
          ...baseWidget,
          width: 100,
          height: 100,
          text: type,
        };
    }
  }

  exitCreateMode() {
    this.creatingType = null;
    document.querySelectorAll('[id^="btn-create-"]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById('canvas-container').style.cursor = 'default';
  }

  deleteSelectedWidget() {
    const selected = app.selectedWidget;
    if (!selected) {
      alert('请先选择一个组件');
      return;
    }

    app.removeWidgetFromList(selected.id);
    app.selectedWidget = null;
    properties.clear();
  }
}

const toolbar = new Toolbar();
window.toolbar = toolbar; // 暴露给 canvas-bridge
