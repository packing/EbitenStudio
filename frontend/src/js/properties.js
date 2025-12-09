class PropertiesPanel {
  constructor() {
    this.panel = document.getElementById('properties-panel');
    this.currentWidget = null;
  }

  show(widget) {
    this.currentWidget = widget;
    this.render();
  }

  clear() {
    this.panel.innerHTML = '<p class="empty-hint">未选择组件</p>';
    this.currentWidget = null;
  }

  render() {
    if (!this.currentWidget) {
      this.clear();
      return;
    }

    const w = this.currentWidget;
    this.panel.innerHTML = `
      <div class="property-group">
        <label class="property-label">ID</label>
        <input class="property-input" value="${w.id}" disabled>
      </div>

      <div class="property-group">
        <label class="property-label">类型</label>
        <input class="property-input" value="${w.type}" disabled>
      </div>

      <div class="property-group">
        <label class="property-label">文本</label>
        <input class="property-input" id="prop-text" value="${w.text || ''}">
      </div>

      <div class="property-group">
        <label class="property-label">位置</label>
        <div class="property-row">
          <div>
            <label class="property-label">X</label>
            <input type="number" class="property-input" id="prop-x" value="${Math.round(w.x)}">
          </div>
          <div>
            <label class="property-label">Y</label>
            <input type="number" class="property-input" id="prop-y" value="${Math.round(w.y)}">
          </div>
        </div>
      </div>

      <div class="property-group">
        <label class="property-label">尺寸</label>
        <div class="property-row">
          <div>
            <label class="property-label">宽</label>
            <input type="number" class="property-input" id="prop-width" value="${Math.round(w.width)}">
          </div>
          <div>
            <label class="property-label">高</label>
            <input type="number" class="property-input" id="prop-height" value="${Math.round(w.height)}">
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const inputs = ['text', 'x', 'y', 'width', 'height'];
    inputs.forEach(prop => {
      const input = document.getElementById(`prop-${prop}`);
      if (input) {
        input.addEventListener('change', () => this.updateProperty(prop, input.value));
      }
    });
  }

  async updateProperty(prop, value) {
    if (!this.currentWidget) return;

    try {
      const data = {};
      if (prop === 'text') {
        data.text = value;
      } else {
        data[prop] = parseFloat(value);
      }

      const updated = await api.updateWidget(this.currentWidget.id, data);
      this.currentWidget = updated;
      app.updateWidgetInList(updated);
    } catch (error) {
      console.error('Failed to update widget:', error);
    }
  }
}

const properties = new PropertiesPanel();
