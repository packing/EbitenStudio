class Toolbar {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 创建组件按钮
    document.querySelectorAll('[id^="btn-create-"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.createWidget(type);
      });
    });

    // 删除按钮
    document.getElementById('btn-delete').addEventListener('click', () => {
      this.deleteSelectedWidget();
    });
  }

  async createWidget(type) {
    try {
      const defaultText = {
        button: '按钮',
        label: '标签文本',
        panel: '面板',
      };

      const widget = await api.createWidget({
        type,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 120,
        height: 40,
        text: defaultText[type] || type,
      });

      console.log('Widget created:', widget);
      app.addWidgetToList(widget);
    } catch (error) {
      console.error('Failed to create widget:', error);
    }
  }

  async deleteSelectedWidget() {
    const selected = app.selectedWidget;
    if (!selected) {
      alert('请先选择一个组件');
      return;
    }

    try {
      await api.deleteWidget(selected.id);
      app.removeWidgetFromList(selected.id);
      app.selectedWidget = null;
      properties.clear();
    } catch (error) {
      console.error('Failed to delete widget:', error);
    }
  }
}

const toolbar = new Toolbar();
