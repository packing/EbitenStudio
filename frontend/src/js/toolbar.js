class Toolbar {
  constructor() {
    this.creatingType = null; // 当前要创建的类型
    this.setupEventListeners();
  }
  
  // 重新初始化计数器（从现有控件列表）
  resetCounters(widgets) {
    Widget.resetCounters(widgets);
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
    
    // 使用新的类系统创建控件
    const widget = this.createWidgetByType(this.creatingType, x, y, null);

    console.log('Widget created at:', x, y, widget);
    app.addWidgetToList(widget);
    
    // 退出创建模式
    this.exitCreateMode();
  }

  createWidgetByType(type, x, y, parentId = null) {
    // 使用 Widget 类系统创建实例
    const WidgetClass = Widget.getWidgetClass(type);
    console.log('Creating widget:', type, 'WidgetClass:', WidgetClass, 'at', x, y);
    const widget = new WidgetClass(x, y, parentId);
    console.log('Created widget:', widget);
    
    // 返回实例 (已包含所有属性)
    return widget;
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
