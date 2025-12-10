class PropertiesPanel {
  constructor() {
    this.panel = document.getElementById('properties-panel');
    this.currentWidget = null;
  }
  
  getTypeName(type) {
    const typeNames = {
      button: '按钮',
      label: '标签',
      textinput: '输入框',
      slider: '滑动条',
      image: '图像',
      listbox: '列表框',
      gridview: '网格视图',
      panel: '面板'
    };
    return typeNames[type] || type;
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
    let html = `
      <div class="property-group">
        <label class="property-label">ID</label>
        <input class="property-input" id="prop-id" value="${w.id}">
      </div>

      <div class="property-group">
        <label class="property-label">类型</label>
        <div class="property-value">${this.getTypeName(w.type)}</div>
      </div>

      <!-- 通用属性 -->
      <div class="property-group">
        <label class="property-label">
          <input type="checkbox" id="prop-visible" ${w.visible !== false ? 'checked' : ''}>
          可见
        </label>
      </div>

      <div class="property-group">
        <label class="property-label">
          <input type="checkbox" id="prop-interactive" ${w.interactive !== false ? 'checked' : ''}>
          可交互
        </label>
      </div>
    `;

    // enabled 属性（按钮、输入框、滑动条等）
    if (['button', 'textinput', 'slider', 'listbox', 'gridview'].includes(w.type)) {
      html += `
        <div class="property-group">
          <label class="property-label">
            <input type="checkbox" id="prop-enabled" ${w.enabled !== false ? 'checked' : ''}>
            启用
          </label>
        </div>
      `;
    }

    // 文本属性
    if (['button', 'label', 'textinput', 'panel'].includes(w.type)) {
      html += `
        <div class="property-group">
          <label class="property-label">${w.type === 'textinput' ? '默认值' : '文本'}</label>
          <input class="property-input" id="prop-text" value="${w.text || ''}">
        </div>
        
        <div class="property-group">
          <label class="property-label">字体资源</label>
          <div class="resource-picker">
            ${this.renderResourcePicker('font', w.fontResourceId)}
          </div>
        </div>
        
        <div class="property-group">
          <label class="property-label">字号</label>
          <input type="number" class="property-input" id="prop-fontSize" value="${w.fontSize || 14}" min="8" max="72">
        </div>
        
        <div class="property-group">
          <label class="property-label">文本颜色</label>
          <input type="color" class="property-input" id="prop-textColor" value="${w.textColor || '#333333'}">
        </div>
        
        <div class="property-group">
          <label class="property-label">对齐方式</label>
          <select class="property-input" id="prop-textAlign">
            <option value="left" ${w.textAlign === 'left' ? 'selected' : ''}>左对齐</option>
            <option value="center" ${w.textAlign === 'center' || !w.textAlign ? 'selected' : ''}>居中</option>
            <option value="right" ${w.textAlign === 'right' ? 'selected' : ''}>右对齐</option>
          </select>
        </div>
        
        <div class="property-group">
          <label class="property-label">文本样式</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" id="prop-fontBold" ${w.fontBold ? 'checked' : ''}>
              <span style="font-weight: bold;">粗体</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" id="prop-fontItalic" ${w.fontItalic ? 'checked' : ''}>
              <span style="font-style: italic;">斜体</span>
            </label>
          </div>
        </div>
      `;
      
      // 标签特有的装饰样式
      if (w.type === 'label') {
        html += `
          <div class="property-group">
            <label class="property-label">文本装饰</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 4px;">
                <input type="checkbox" id="prop-textUnderline" ${w.textUnderline ? 'checked' : ''}>
                <span style="text-decoration: underline;">下划线</span>
              </label>
              <label style="display: flex; align-items: center; gap: 4px;">
                <input type="checkbox" id="prop-textStrikethrough" ${w.textStrikethrough ? 'checked' : ''}>
                <span style="text-decoration: line-through;">删除线</span>
              </label>
            </div>
          </div>
          
          <div class="property-group">
            <label class="property-label">描边颜色</label>
            <input type="color" class="property-input" id="prop-strokeColor" value="${w.strokeColor || '#000000'}">
          </div>
          
          <div class="property-group">
            <label class="property-label">描边宽度</label>
            <input type="number" class="property-input" id="prop-strokeWidth" value="${w.strokeWidth || 0}" min="0" max="10">
          </div>
        `;
      }
    }

    // 特殊属性
    html += this.renderSpecialProperties(w);

    // 位置和尺寸
    html += `
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
      
      <div class="property-group">
        <label class="property-label">层级 (Z-Index)</label>
        <input type="number" class="property-input" id="prop-zIndex" value="${w.zIndex || 0}">
      </div>
      
      <div class="property-group">
        <label class="property-label">透明度 (%)</label>
        <input type="number" class="property-input" id="prop-opacity" value="${w.opacity !== undefined ? w.opacity : 100}" min="0" max="100">
      </div>
      
      <!-- 边框属性 -->
      <div class="property-section-title">边框</div>
      
      <div class="property-group">
        <label class="property-label">边框宽度</label>
        <input type="number" class="property-input" id="prop-borderWidth" value="${w.borderWidth || 0}" min="0" max="20">
      </div>
      
      <div class="property-group">
        <label class="property-label">边框颜色</label>
        <input type="color" class="property-input" id="prop-borderColor" value="${w.borderColor || '#666666'}">
      </div>
      
      <div class="property-group">
        <label class="property-label">圆角半径</label>
        <input type="number" class="property-input" id="prop-borderRadius" value="${w.borderRadius || 0}" min="0" max="100">
      </div>
      
      <!-- 背景属性 -->
      <div class="property-section-title">背景</div>
      
      <div class="property-group">
        <label class="property-label">背景颜色</label>
        <input type="color" class="property-input" id="prop-backgroundColor" value="${w.backgroundColor || '#ffffff'}">
        <button class="btn-clear-value" data-prop="backgroundColor" title="清除背景颜色">✕</button>
      </div>
      
      <div class="property-group">
        <label class="property-label">背景图片</label>
        <div class="resource-picker">
          ${this.renderResourcePicker('image', w.backgroundResourceId)}
        </div>
      </div>
    `;

    this.panel.innerHTML = html;
    this.attachEventListeners();
  }

  renderResourcePicker(resourceType, selectedResourceId) {
    const resourceKey = resourceType === 'image' ? 'images' : 'fonts';
    const resources = resourceManager.resources[resourceKey] || [];
    
    let html = '<select class="property-input resource-select" data-resource-type="' + resourceKey + '">';
    html += '<option value="">-- 无 --</option>';
    
    resources.forEach(res => {
      const selected = res.id === selectedResourceId ? 'selected' : '';
      html += `<option value="${res.id}" ${selected}>${res.name}</option>`;
    });
    
    html += '</select>';
    return html;
  }

  renderSpecialProperties(w) {
    let html = '';

    switch (w.type) {
      case 'textinput':
        html += `
          <div class="property-group">
            <label class="property-label">占位符</label>
            <input class="property-input" id="prop-placeholder" value="${w.placeholder || ''}">
          </div>
        `;
        break;

      case 'slider':
        html += `
          <div class="property-group">
            <label class="property-label">最小值</label>
            <input type="number" class="property-input" id="prop-min" value="${w.min || 0}">
          </div>
          <div class="property-group">
            <label class="property-label">最大值</label>
            <input type="number" class="property-input" id="prop-max" value="${w.max || 100}">
          </div>
          <div class="property-group">
            <label class="property-label">当前值</label>
            <input type="number" class="property-input" id="prop-value" value="${w.value || 0}">
          </div>
        `;
        break;

      case 'image':
        html += `
          <div class="property-group">
            <label class="property-label">图像资源</label>
            <div class="resource-picker">
              ${this.renderResourcePicker('image', w.resourceId)}
            </div>
          </div>
          <div class="property-group">
            <label class="property-label">图像路径 (手动)</label>
            <input class="property-input" id="prop-imagePath" value="${w.imagePath || ''}">
          </div>
        `;
        break;

      case 'gridview':
        html += `
          <div class="property-group">
            <label class="property-label">列数</label>
            <input type="number" class="property-input" id="prop-columns" value="${w.columns || 4}" min="1">
          </div>
        `;
        break;
    }

    return html;
  }

  attachEventListeners() {
    // ID特殊处理 - 需要验证唯一性
    const idInput = document.getElementById('prop-id');
    if (idInput) {
      idInput.addEventListener('change', () => this.updateId(idInput.value));
    }
    
    // 文本和数字输入框
    const inputs = ['text', 'x', 'y', 'width', 'height', 'placeholder', 'min', 'max', 'value', 'imagePath', 'columns', 'zIndex', 'opacity', 'fontSize', 'strokeWidth', 'borderWidth', 'borderRadius'];
    inputs.forEach(prop => {
      const input = document.getElementById(`prop-${prop}`);
      if (input) {
        input.addEventListener('change', () => this.updateProperty(prop, input.value));
      }
    });
    
    // 颜色输入框
    const colorInputs = ['textColor', 'strokeColor', 'borderColor', 'backgroundColor'];
    colorInputs.forEach(prop => {
      const input = document.getElementById(`prop-${prop}`);
      if (input) {
        input.addEventListener('change', () => this.updateProperty(prop, input.value));
      }
    });
    
    // 清除按钮
    const clearButtons = document.querySelectorAll('.btn-clear-value');
    clearButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prop = e.target.dataset.prop;
        this.updateProperty(prop, '');
        this.render(); // 重新渲染以更新显示
      });
    });
    
    // 下拉选择框
    const selectInputs = ['textAlign'];
    selectInputs.forEach(prop => {
      const select = document.getElementById(`prop-${prop}`);
      if (select) {
        select.addEventListener('change', () => this.updateProperty(prop, select.value));
      }
    });

    // 复选框
    const checkboxes = ['visible', 'interactive', 'enabled', 'fontBold', 'fontItalic', 'textUnderline', 'textStrikethrough'];
    checkboxes.forEach(prop => {
      const checkbox = document.getElementById(`prop-${prop}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => this.updateProperty(prop, checkbox.checked));
      }
    });
    
    // 资源选择器
    const resourceSelects = document.querySelectorAll('.resource-select');
    resourceSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const resourceType = e.target.dataset.resourceType;
        const resourceId = e.target.value ? parseInt(e.target.value) : null;
        this.applyResource(resourceType, resourceId);
      });
    });
  }
  
  applyResource(resourceType, resourceId) {
    if (!this.currentWidget) return;
    
    const widget = this.currentWidget;
    const selectElement = event.target;
    const isBackgroundPicker = selectElement.closest('.property-group')?.querySelector('.property-label')?.textContent.includes('背景图片');
    
    if (resourceType === 'images') {
      if (isBackgroundPicker) {
        // 背景图片资源
        if (resourceId) {
          const resource = resourceManager.getResource(resourceId, resourceType);
          if (resource) {
            widget.backgroundImage = resource.data;
            widget.backgroundResourceId = resourceId;
          }
        } else {
          widget.backgroundImage = null;
          widget.backgroundResourceId = null;
        }
      } else {
        // 图片控件的资源
        if (resourceId) {
          const resource = resourceManager.getResource(resourceId, resourceType);
          if (resource) {
            widget.src = resource.data;
            widget.resourceId = resourceId;
          }
        } else {
          widget.src = null;
          widget.resourceId = null;
        }
      }
    } else if (resourceType === 'fonts') {
      if (resourceId) {
        const resource = resourceManager.getResource(resourceId, resourceType);
        if (resource) {
          widget.fontFamily = resource.fontName || resource.name.replace(/\.[^.]+$/, '');
          widget.fontResourceId = resourceId;
        }
      } else {
        widget.fontFamily = 'Arial';
        widget.fontResourceId = null;
      }
    }
    
    app.updateWidgetInList(widget);
  }

  updateId(newId) {
    if (!this.currentWidget) return;
    
    const oldId = this.currentWidget.id;
    newId = newId.trim();
    
    // 验证ID不为空
    if (!newId) {
      alert('ID不能为空');
      this.render(); // 恢复显示
      return;
    }
    
    // 验证ID唯一性
    if (newId !== oldId && window.app) {
      const exists = window.app.widgets.some(w => w.id === newId && w !== this.currentWidget);
      if (exists) {
        alert(`ID "${newId}" 已存在，请使用其他ID`);
        this.render(); // 恢复显示
        return;
      }
      
      // 更新所有引用此ID的parentId
      window.app.widgets.forEach(w => {
        if (w.parentId === oldId) {
          w.parentId = newId;
        }
      });
    }
    
    // 更新ID
    this.currentWidget.id = newId;
    console.log('ID updated:', oldId, '->', newId);
    app.updateWidgetInList(this.currentWidget);
  }

  updateProperty(prop, value) {
    if (!this.currentWidget) return;

    // 转换数字类型
    const numberProps = ['x', 'y', 'width', 'height', 'min', 'max', 'value', 'columns', 'zIndex', 'opacity', 'fontSize', 'strokeWidth'];
    if (numberProps.includes(prop)) {
      value = parseFloat(value);
    }

    // 更新本地数据
    this.currentWidget[prop] = value;
    console.log('Property updated:', prop, value);
    app.updateWidgetInList(this.currentWidget);
  }
}

const properties = new PropertiesPanel();
