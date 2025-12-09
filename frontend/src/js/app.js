class App {
  constructor() {
    this.widgets = [];
    this.selectedWidget = null;
    this.init();
  }

  async init() {
    // 连接 WebSocket
    api.connectWebSocket();

    // 监听事件
    api.on('widget:created', (widget) => {
      console.log('Widget created event:', widget);
    });

    api.on('widget:updated', (widget) => {
      console.log('Widget updated event:', widget);
      this.updateWidgetInList(widget);
    });

    api.on('widget:deleted', (data) => {
      console.log('Widget deleted event:', data);
      this.removeWidgetFromList(data.id);
    });

    api.on('widget:selected', (widget) => {
      console.log('Widget selected event:', widget);
      this.selectWidget(widget);
    });

    api.on('ws:connected', () => {
      document.getElementById('connection-status').textContent = '● 已连接';
      document.getElementById('connection-status').style.color = '#4caf50';
    });

    api.on('ws:closed', () => {
      document.getElementById('connection-status').textContent = '● 断开连接';
      document.getElementById('connection-status').style.color = '#f44336';
    });

    // 加载现有 widgets
    await this.loadWidgets();
  }

  async loadWidgets() {
    try {
      this.widgets = await api.getWidgets();
      this.renderWidgetList();
    } catch (error) {
      console.error('Failed to load widgets:', error);
    }
  }

  renderWidgetList() {
    const tree = document.getElementById('widget-tree');
    
    if (this.widgets.length === 0) {
      tree.innerHTML = '<p class="empty-hint">暂无组件</p>';
      return;
    }

    tree.innerHTML = this.widgets
      .map(w => `
        <div class="widget-item ${this.selectedWidget?.id === w.id ? 'selected' : ''}" 
             data-id="${w.id}">
          ${this.getWidgetIcon(w.type)} ${w.type} - ${w.text || w.id.slice(0, 8)}
        </div>
      `)
      .join('');

    // 添加点击事件
    tree.querySelectorAll('.widget-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const widget = this.widgets.find(w => w.id === id);
        if (widget) {
          this.selectWidget(widget);
        }
      });
    });
  }

  getWidgetIcon(type) {
    const icons = {
      button: '🔘',
      label: '📝',
      panel: '📦',
    };
    return icons[type] || '📦';
  }

  selectWidget(widget) {
    this.selectedWidget = widget;
    this.renderWidgetList();
    properties.show(widget);
  }

  addWidgetToList(widget) {
    this.widgets.push(widget);
    this.renderWidgetList();
  }

  updateWidgetInList(widget) {
    const index = this.widgets.findIndex(w => w.id === widget.id);
    if (index !== -1) {
      this.widgets[index] = widget;
      this.renderWidgetList();
      if (this.selectedWidget?.id === widget.id) {
        this.selectedWidget = widget;
        properties.show(widget);
      }
    }
  }

  removeWidgetFromList(id) {
    this.widgets = this.widgets.filter(w => w.id !== id);
    this.renderWidgetList();
  }
}

const app = new App();
