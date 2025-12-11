class PropertiesPanel {
  constructor() {
    this.panel = document.getElementById('properties-panel');
    this.currentWidget = null;
  }
  
  /**
   * 刷新所有资源选择器（当资源列表更新时调用）
   */
  refreshResourcePickers() {
    if (!this.currentWidget) return;
    
    // 查找所有资源选择器并更新
    const resourceSelects = this.panel.querySelectorAll('.resource-select');
    resourceSelects.forEach(select => {
      const resourceType = select.dataset.resourceType; // 'images' or 'fonts'
      const currentValue = select.value; // 保存当前选中的值
      
      // 重新生成选项
      const resources = window.resourceManager?.resources[resourceType] || [];
      let html = '<option value="">-- 无 --</option>';
      
      resources.forEach(res => {
        const selected = String(res.id) === currentValue ? 'selected' : '';
        html += `<option value="${res.id}" ${selected}>${res.name}</option>`;
      });
      
      select.innerHTML = html;
    });
  }
  
  getTypeName(type) {
    const typeNames = {
      button: '按钮',
      label: '标签',
      textinput: '输入框',
      slider: '滑动条',
      image: '图像',
      listview: '列表视图',
      gridview: '网格视图',
      tableview: '表格视图',
      combobox: '下拉选择框',
      checkbox: '复选框',
      radiobutton: '单选按钮',
      panel: '面板'
    };
    return typeNames[type] || type;
  }
  
  /**
   * 格式化 RGBA 颜色显示
   * @param {string} hexColor - 十六进制颜色 (#RRGGBB)
   * @param {number} alpha - Alpha 值 (0-255)
   * @returns {string} 格式化的 RGBA 字符串
   */
  formatRGBA(hexColor, alpha) {
    if (!hexColor) return '无';
    
    // 将 hex 转换为 RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const a = alpha !== undefined ? alpha : 255;
    
    return `rgba(${r},${g},${b},${a})`;
  }

  /**
   * 格式化 RGBA 颜色为 CSS 样式字符串
   * @param {string} hexColor - 十六进制颜色 (#RRGGBB)
   * @param {number} alpha - Alpha 值 (0-255)
   * @returns {string} CSS rgba() 字符串
   */
  formatRGBAStyle(hexColor, alpha) {
    if (!hexColor) return 'transparent';
    
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const a = alpha !== undefined ? alpha / 255 : 1;
    
    return `rgba(${r},${g},${b},${a})`;
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
    if (['button', 'textinput', 'slider', 'listview', 'gridview', 'tableview', 'combobox', 'checkbox', 'radiobutton'].includes(w.type)) {
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
          <div class="color-input-group">
            <button class="color-picker-btn" data-color-prop="textColor" title="点击选择颜色">
              <div class="color-picker-btn-color" style="background-color: ${this.formatRGBAStyle(w.textColor, w.textColorAlpha)}"></div>
            </button>
            <span class="color-status">${this.formatRGBA(w.textColor, w.textColorAlpha)}</span>
            <button class="btn-clear-color" data-color-prop="textColor" title="清除颜色">✕</button>
          </div>
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
            <div class="color-input-group">
              <button class="color-picker-btn" data-color-prop="strokeColor" title="点击选择颜色">
                <div class="color-picker-btn-color" style="background-color: ${this.formatRGBAStyle(w.strokeColor, w.strokeColorAlpha)}"></div>
              </button>
              <span class="color-status">${this.formatRGBA(w.strokeColor, w.strokeColorAlpha)}</span>
              <button class="btn-clear-color" data-color-prop="strokeColor" title="清除颜色">✕</button>
            </div>
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

    // 定位模式
    html += `
      <div class="property-group">
        <label class="property-label">定位模式</label>
        <select class="property-input" id="prop-positionMode">
          <option value="absolute" ${w.positionMode === 'absolute' ? 'selected' : ''}>绝对定位</option>
          <option value="anchor" ${w.positionMode === 'anchor' ? 'selected' : ''}>锚点定位</option>
        </select>
      </div>
    `;
    
    // 根据定位模式显示不同的属性
    if (w.positionMode === 'anchor') {
      // 锚点模式：显示锚点选择和偏移
      html += `
        <div class="property-group" id="anchor-properties">
          <label class="property-label">锚点位置</label>
          <div class="anchor-selector">
            <div class="anchor-grid">
              ${this.renderAnchorButton('left', 'top', w)}
              ${this.renderAnchorButton('center', 'top', w)}
              ${this.renderAnchorButton('right', 'top', w)}
              ${this.renderAnchorButton('left', 'middle', w)}
              ${this.renderAnchorButton('center', 'middle', w)}
              ${this.renderAnchorButton('right', 'middle', w)}
              ${this.renderAnchorButton('left', 'bottom', w)}
              ${this.renderAnchorButton('center', 'bottom', w)}
              ${this.renderAnchorButton('right', 'bottom', w)}
            </div>
          </div>
          
          <div class="property-row" style="margin-top: 8px;">
            <div>
              <label class="property-label">偏移 X</label>
              <input type="number" class="property-input" id="prop-offsetX" value="${Math.round(w.offsetX || 0)}">
            </div>
            <div>
              <label class="property-label">偏移 Y</label>
              <input type="number" class="property-input" id="prop-offsetY" value="${Math.round(w.offsetY || 0)}">
            </div>
          </div>
        </div>
      `;
    } else {
      // 绝对定位模式：显示X/Y
      html += `
        <div class="property-group" id="absolute-properties">
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
      `;
    }

    // 尺寸
    html += `
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
        <label class="property-label">边界锚定 (响应式尺寸)</label>
        <div class="edge-anchor-selector">
          <div style="display: grid; grid-template-columns: auto 1fr auto; grid-template-rows: auto 1fr auto; gap: 5px; align-items: center; justify-items: center; padding: 10px;">
            <div></div>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
              <input type="checkbox" id="prop-anchorTop" ${w.anchorTop ? 'checked' : ''}>
              <span>上</span>
            </label>
            <div></div>
            
            <label style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
              <input type="checkbox" id="prop-anchorLeft" ${w.anchorLeft ? 'checked' : ''}>
              <span>左</span>
            </label>
            <div style="width: 60px; height: 40px; border: 2px solid #666; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #888;">
              控件
            </div>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
              <input type="checkbox" id="prop-anchorRight" ${w.anchorRight ? 'checked' : ''}>
              <span>右</span>
            </label>
            
            <div></div>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
              <input type="checkbox" id="prop-anchorBottom" ${w.anchorBottom ? 'checked' : ''}>
              <span>下</span>
            </label>
            <div></div>
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 5px;">
            提示: 勾选边界后，控件在该方向上会随窗口大小伸缩
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
      
      <!-- Padding 属性 -->
      <div class="property-section-title">内边距 (Padding)</div>
      
      <div class="property-group">
        <div class="property-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label class="property-label">上</label>
            <input type="number" class="property-input" id="prop-paddingTop" value="${w.padding?.top || 0}" min="0">
          </div>
          <div>
            <label class="property-label">右</label>
            <input type="number" class="property-input" id="prop-paddingRight" value="${w.padding?.right || 0}" min="0">
          </div>
          <div>
            <label class="property-label">下</label>
            <input type="number" class="property-input" id="prop-paddingBottom" value="${w.padding?.bottom || 0}" min="0">
          </div>
          <div>
            <label class="property-label">左</label>
            <input type="number" class="property-input" id="prop-paddingLeft" value="${w.padding?.left || 0}" min="0">
          </div>
        </div>
      </div>
      
      <!-- Margin 属性 -->
      <div class="property-section-title">外边距 (Margin)</div>
      
      <div class="property-group">
        <div class="property-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label class="property-label">上</label>
            <input type="number" class="property-input" id="prop-marginTop" value="${w.margin?.top || 0}" min="0">
          </div>
          <div>
            <label class="property-label">右</label>
            <input type="number" class="property-input" id="prop-marginRight" value="${w.margin?.right || 0}" min="0">
          </div>
          <div>
            <label class="property-label">下</label>
            <input type="number" class="property-input" id="prop-marginBottom" value="${w.margin?.bottom || 0}" min="0">
          </div>
          <div>
            <label class="property-label">左</label>
            <input type="number" class="property-input" id="prop-marginLeft" value="${w.margin?.left || 0}" min="0">
          </div>
        </div>
      </div>
      
      <!-- 边框属性 -->
      <div class="property-section-title">边框</div>
      
      <div class="property-group">
        <label class="property-label">边框宽度</label>
        <input type="number" class="property-input" id="prop-borderWidth" value="${w.borderWidth || 0}" min="0" max="20">
      </div>
      
      <div class="property-group">
        <label class="property-label">边框颜色</label>
        <div class="color-input-group">
          <button class="color-picker-btn" data-color-prop="borderColor" title="点击选择颜色">
            <div class="color-picker-btn-color" style="background-color: ${this.formatRGBAStyle(w.borderColor, w.borderColorAlpha)}"></div>
          </button>
          <span class="color-status">${this.formatRGBA(w.borderColor, w.borderColorAlpha)}</span>
          <button class="btn-clear-color" data-color-prop="borderColor" title="清除颜色">✕</button>
        </div>
      </div>
      
      <div class="property-group">
        <label class="property-label">圆角半径</label>
        <input type="number" class="property-input" id="prop-borderRadius" value="${w.borderRadius || 0}" min="0" max="100">
      </div>
      
      <!-- 背景属性 -->
      <div class="property-section-title">背景</div>
      
      ${this.renderBackgroundProperties(w)}
    `;

    this.panel.innerHTML = html;
    this.attachEventListeners();
  }

  renderBackgroundProperties(w) {
    // 图像控件不需要背景设置（它本身就是图片）
    if (w.type === 'image') {
      return '';
    }
    
    // 判断是否需要三态背景
    const hasThreeStates = w.type === 'button' || w.type === 'textinput';
    
    if (hasThreeStates) {
      const states = w.type === 'button' 
        ? [
            { key: 'Normal', label: '常态' },
            { key: 'Pressed', label: '按下' },
            { key: 'Disabled', label: '禁用' }
          ]
        : [
            { key: 'Normal', label: '常态' },
            { key: 'Editing', label: '编辑中' },
            { key: 'Disabled', label: '禁用' }
          ];
      
      let html = '';
      states.forEach(state => {
        const colorProp = `backgroundColor${state.key}`;
        const alphaProp = `backgroundColor${state.key}Alpha`;
        const resourceProp = `backgroundResource${state.key}`;
        
        html += `
          <div class="property-group">
            <label class="property-label">${state.label}背景色</label>
            <div class="color-input-group">
              <button class="color-picker-btn" data-color-prop="${colorProp}" title="点击选择颜色">
                <div class="color-picker-btn-color" style="background-color: ${this.formatRGBAStyle(w[colorProp], w[alphaProp])}"></div>
              </button>
              <span class="color-status">${this.formatRGBA(w[colorProp], w[alphaProp])}</span>
              <button class="btn-clear-color" data-color-prop="${colorProp}" title="清除颜色">✕</button>
            </div>
          </div>
          
          <div class="property-group">
            <label class="property-label">${state.label}背景图</label>
            <div class="resource-picker">
              <select class="property-input resource-select" data-resource-type="images" data-state-key="${state.key}">
                <option value="">-- 无 --</option>
                ${this.getResourceOptions('images', w[resourceProp])}
              </select>
            </div>
          </div>
        `;
      });
      
      return html;
    } else {
      // 普通单一背景
      return `
        <div class="property-group">
          <label class="property-label">背景颜色</label>
          <div class="color-input-group">
            <button class="color-picker-btn" data-color-prop="backgroundColor" title="点击选择颜色">
              <div class="color-picker-btn-color" style="background-color: ${this.formatRGBAStyle(w.backgroundColor, w.backgroundColorAlpha)}"></div>
            </button>
            <span class="color-status">${this.formatRGBA(w.backgroundColor, w.backgroundColorAlpha)}</span>
            <button class="btn-clear-color" data-color-prop="backgroundColor" title="清除颜色">✕</button>
          </div>
        </div>
        
        <div class="property-group">
          <label class="property-label">背景图片</label>
          <div class="resource-picker">
            <select class="property-input resource-select" data-resource-type="images" data-bg-type="single">
              <option value="">-- 无 --</option>
              ${this.getResourceOptions('images', w.backgroundResourceId)}
            </select>
          </div>
        </div>
      `;
    }
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
  
  getResourceOptions(resourceKey, selectedResourceId) {
    const resources = resourceManager.resources[resourceKey] || [];
    return resources.map(res => {
      const selected = res.id === selectedResourceId ? 'selected' : '';
      return `<option value="${res.id}" ${selected}>${res.name}</option>`;
    }).join('');
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
            <input type="number" class="property-input" id="prop-minValue" value="${w.minValue !== undefined ? w.minValue : 0}">
          </div>
          <div class="property-group">
            <label class="property-label">最大值</label>
            <input type="number" class="property-input" id="prop-maxValue" value="${w.maxValue !== undefined ? w.maxValue : 100}">
          </div>
          <div class="property-group">
            <label class="property-label">当前值</label>
            <input type="number" class="property-input" id="prop-value" value="${w.value !== undefined ? w.value : 50}">
          </div>
          <div class="property-group">
            <label class="property-label">步长</label>
            <input type="number" class="property-input" id="prop-step" value="${w.step !== undefined ? w.step : 1}" min="0" step="0.1">
          </div>
          <div class="property-group">
            <label class="property-label">方向</label>
            <select class="property-input" id="prop-orientation">
              <option value="horizontal" ${w.orientation === 'horizontal' ? 'selected' : ''}>水平</option>
              <option value="vertical" ${w.orientation === 'vertical' ? 'selected' : ''}>垂直</option>
            </select>
          </div>
          <div class="property-group">
            <label class="property-label">轨道高度</label>
            <input type="number" class="property-input" id="prop-trackHeight" value="${w.trackHeight || 6}" min="2">
          </div>
          <div class="property-group">
            <label class="property-label">滑块尺寸</label>
            <input type="number" class="property-input" id="prop-thumbSize" value="${w.thumbSize || 16}" min="8">
          </div>
          <div class="property-group">
            <label class="property-label">
              <input type="checkbox" id="prop-showValue" ${w.showValue !== false ? 'checked' : ''}>
              显示数值
            </label>
          </div>
        `;
        break;

      case 'checkbox':
        html += `
          <div class="property-group">
            <label class="property-label">文本</label>
            <input type="text" class="property-input" id="prop-text" value="${w.text || '复选框'}">
          </div>
          <div class="property-group">
            <label class="property-label">复选框尺寸</label>
            <input type="number" class="property-input" id="prop-boxSize" value="${w.boxSize || 18}" min="12" max="32">
          </div>
          <div class="property-group">
            <label class="property-label">
              <input type="checkbox" id="prop-checked" ${w.checked ? 'checked' : ''}>
              选中状态
            </label>
          </div>
        `;
        break;

      case 'radiobutton':
        html += `
          <div class="property-group">
            <label class="property-label">文本</label>
            <input type="text" class="property-input" id="prop-text" value="${w.text || '单选按钮'}">
          </div>
          <div class="property-group">
            <label class="property-label">分组名称</label>
            <input type="text" class="property-input" id="prop-groupName" value="${w.groupName || 'default'}">
          </div>
          <div class="property-group">
            <label class="property-label">按钮尺寸</label>
            <input type="number" class="property-input" id="prop-buttonSize" value="${w.buttonSize || 18}" min="12" max="32">
          </div>
          <div class="property-group">
            <label class="property-label">
              <input type="checkbox" id="prop-selected" ${w.selected ? 'checked' : ''}>
              选中状态
            </label>
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
            <button class="btn btn-secondary" id="btn-match-image-size" style="margin-top: 5px; width: 100%; font-size: 12px;" title="将控件宽高设置为图像资源的原始尺寸">
              匹配资源尺寸
            </button>
          </div>
          <div class="property-group">
            <label class="property-label">图像路径 (手动)</label>
            <input class="property-input" id="prop-imagePath" value="${w.imagePath || ''}">
          </div>
          <div class="property-group">
            <label class="property-label">源图裁剪区域</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
              <div>
                <label style="font-size: 11px; color: #888;">X:</label>
                <input type="number" class="property-input" id="prop-clipX" value="${w.clipX || 0}" min="0">
              </div>
              <div>
                <label style="font-size: 11px; color: #888;">Y:</label>
                <input type="number" class="property-input" id="prop-clipY" value="${w.clipY || 0}" min="0">
              </div>
              <div>
                <label style="font-size: 11px; color: #888;">宽度:</label>
                <input type="number" class="property-input" id="prop-clipWidth" value="${w.clipWidth || 0}" min="0" placeholder="0=全部">
              </div>
              <div>
                <label style="font-size: 11px; color: #888;">高度:</label>
                <input type="number" class="property-input" id="prop-clipHeight" value="${w.clipHeight || 0}" min="0" placeholder="0=全部">
              </div>
            </div>
          </div>
          <div class="property-group">
            <label class="property-label">缩放模式</label>
            <select class="property-input" id="prop-scaleMode">
              <option value="fit" ${w.scaleMode === 'fit' ? 'selected' : ''}>适应 (Fit)</option>
              <option value="fill" ${w.scaleMode === 'fill' ? 'selected' : ''}>填充 (Fill)</option>
              <option value="stretch" ${w.scaleMode === 'stretch' ? 'selected' : ''}>拉伸 (Stretch)</option>
              <option value="none" ${w.scaleMode === 'none' ? 'selected' : ''}>原始 (None)</option>
            </select>
          </div>
        `;
        break;

      case 'gridview':
        html += `
          <div class="property-group">
            <label class="property-label">列数</label>
            <input type="number" class="property-input" id="prop-columns" value="${w.columns || 4}" min="1">
          </div>
          <div class="property-group">
            <label class="property-label">项宽度</label>
            <input type="number" class="property-input" id="prop-itemWidth" value="${w.itemWidth || 80}" min="20">
          </div>
          <div class="property-group">
            <label class="property-label">项高度</label>
            <input type="number" class="property-input" id="prop-itemHeight" value="${w.itemHeight || 80}" min="20">
          </div>
          <div class="property-group">
            <label class="property-label">间距</label>
            <input type="number" class="property-input" id="prop-spacing" value="${w.spacing || 8}" min="0">
          </div>
        `;
        break;

      case 'listview':
        html += `
          <div class="property-group">
            <label class="property-label">项高度</label>
            <input type="number" class="property-input" id="prop-itemHeight" value="${w.itemHeight || 40}" min="20">
          </div>
        `;
        break;

      case 'tableview':
        html += `
          <div class="property-group">
            <label class="property-label">行高度</label>
            <input type="number" class="property-input" id="prop-rowHeight" value="${w.rowHeight || 30}" min="20">
          </div>
          <div class="property-group">
            <label class="property-label">表头高度</label>
            <input type="number" class="property-input" id="prop-headerHeight" value="${w.headerHeight || 35}" min="20">
          </div>
          <div class="property-group">
            <label class="property-label">
              <input type="checkbox" id="prop-showHeader" ${w.showHeader !== false ? 'checked' : ''}>
              显示表头
            </label>
          </div>
          <div class="property-group">
            <label class="property-label">
              <input type="checkbox" id="prop-alternateRowBg" ${w.alternateRowBg !== false ? 'checked' : ''}>
              交替行背景
            </label>
          </div>
          <div class="property-group">
            <label class="property-label">
              <input type="checkbox" id="prop-showGridLines" ${w.showGridLines !== false ? 'checked' : ''}>
              显示网格线
            </label>
          </div>
        `;
        break;

      case 'combobox':
        html += `
          <div class="property-group">
            <label class="property-label">占位符文本</label>
            <input type="text" class="property-input" id="prop-placeholderText" value="${w.placeholderText || '请选择...'}">
          </div>
          <div class="property-group">
            <label class="property-label">选中索引</label>
            <input type="number" class="property-input" id="prop-selectedIndex" value="${w.selectedIndex || -1}" min="-1">
          </div>
          <div class="property-group">
            <label class="property-label">项高度</label>
            <input type="number" class="property-input" id="prop-itemHeight" value="${w.itemHeight || 30}" min="20">
          </div>
          <div class="property-group">
            <label class="property-label">最大可见项</label>
            <input type="number" class="property-input" id="prop-maxVisibleItems" value="${w.maxVisibleItems || 5}" min="1" max="10">
          </div>
          <div class="property-group">
            <label class="property-label">
              <input type="checkbox" id="prop-isExpanded" ${w.isExpanded ? 'checked' : ''}>
              展开状态（预览）
            </label>
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
    const inputs = ['text', 'x', 'y', 'width', 'height', 'placeholder', 'placeholderText', 'min', 'max', 'value', 'minValue', 'maxValue', 'step', 'orientation', 'trackHeight', 'thumbSize', 'boxSize', 'buttonSize', 'groupName', 'imagePath', 'columns', 'itemWidth', 'itemHeight', 'spacing', 'rowHeight', 'headerHeight', 'maxVisibleItems', 'selectedIndex', 'zIndex', 'opacity', 'fontSize', 'strokeWidth', 'borderWidth', 'borderRadius', 'clipX', 'clipY', 'clipWidth', 'clipHeight'];
    inputs.forEach(prop => {
      const input = document.getElementById(`prop-${prop}`);
      if (input) {
        input.addEventListener('change', () => this.updateProperty(prop, input.value));
      }
    });
    
    // Padding 属性
    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
      const input = document.getElementById(`prop-${prop}`);
      if (input) {
        input.addEventListener('change', () => {
          const side = prop.replace('padding', '').toLowerCase();
          this.updatePadding(side, parseInt(input.value) || 0);
        });
      }
    });
    
    // Margin 属性
    ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
      const input = document.getElementById(`prop-${prop}`);
      if (input) {
        input.addEventListener('change', () => {
          const side = prop.replace('margin', '').toLowerCase();
          this.updateMargin(side, parseInt(input.value) || 0);
        });
      }
    });
    
    // 颜色选择器按钮
    const colorButtons = document.querySelectorAll('.color-picker-btn');
    colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = btn.getAttribute('data-color-prop');
        const widget = window.app?.selectedWidget;
        if (!widget) return;
        
        const hexColor = widget[prop] || '#ffffff';
        const alpha = widget[`${prop}Alpha`] !== undefined ? widget[`${prop}Alpha`] : 255;
        
        // 打开 RGBA 颜色选择器
        window.rgbaPicker.open(hexColor, alpha, prop, (newHex, newAlpha) => {
          this.updateProperty(prop, newHex);
          this.updateProperty(`${prop}Alpha`, newAlpha);
          this.render(); // 刷新显示
        });
      });
    });
    
    // 清除颜色按钮
    const clearColorButtons = document.querySelectorAll('.btn-clear-color');
    clearColorButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prop = e.target.dataset.colorProp;
        if (prop) {
          this.updateProperty(prop, '');
          this.render(); // 重新渲染以更新显示
        }
      });
    });
    
    // 清除按钮 (旧的,保留兼容性)
    const clearButtons = document.querySelectorAll('.btn-clear-value');
    clearButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prop = e.target.dataset.prop;
        this.updateProperty(prop, '');
        this.render(); // 重新渲染以更新显示
      });
    });
    
    // 下拉选择框
    const selectInputs = ['textAlign', 'scaleMode'];
    selectInputs.forEach(prop => {
      const select = document.getElementById(`prop-${prop}`);
      if (select) {
        select.addEventListener('change', () => this.updateProperty(prop, select.value));
      }
    });

    // 复选框
    const checkboxes = ['visible', 'interactive', 'enabled', 'fontBold', 'fontItalic', 'textUnderline', 'textStrikethrough', 'showHeader', 'alternateRowBg', 'showGridLines', 'isExpanded', 'showValue', 'checked', 'selected'];
    checkboxes.forEach(prop => {
      const checkbox = document.getElementById(`prop-${prop}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => this.updateProperty(prop, checkbox.checked));
      }
    });
    
    // 边界锚定复选框
    const edgeAnchors = ['anchorLeft', 'anchorRight', 'anchorTop', 'anchorBottom'];
    edgeAnchors.forEach(prop => {
      const checkbox = document.getElementById(`prop-${prop}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.toggleEdgeAnchor(prop, checkbox.checked);
        });
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
    
    // 匹配图像资源尺寸按钮
    const matchImageSizeBtn = document.getElementById('btn-match-image-size');
    if (matchImageSizeBtn) {
      matchImageSizeBtn.addEventListener('click', () => {
        this.matchImageResourceSize();
      });
    }
    
    // 定位模式切换
    const positionModeSelect = document.getElementById('prop-positionMode');
    if (positionModeSelect) {
      positionModeSelect.addEventListener('change', (e) => {
        this.switchPositionMode(e.target.value);
      });
    }
    
    // 锚点按钮
    const anchorButtons = document.querySelectorAll('.anchor-btn');
    anchorButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const anchorX = btn.dataset.anchorX;
        const anchorY = btn.dataset.anchorY;
        this.setAnchor(anchorX, anchorY);
      });
    });
    
    // 偏移量输入
    const offsetXInput = document.getElementById('prop-offsetX');
    const offsetYInput = document.getElementById('prop-offsetY');
    if (offsetXInput) {
      offsetXInput.addEventListener('change', () => {
        this.updateProperty('offsetX', parseInt(offsetXInput.value) || 0);
      });
    }
    if (offsetYInput) {
      offsetYInput.addEventListener('change', () => {
        this.updateProperty('offsetY', parseInt(offsetYInput.value) || 0);
      });
    }
  }
  
  applyResource(resourceType, resourceId) {
    if (!this.currentWidget) return;
    
    const widget = this.currentWidget;
    const selectElement = event.target;
    const stateKey = selectElement.dataset.stateKey; // Normal, Pressed, Disabled, Editing
    const bgType = selectElement.dataset.bgType; // single
    
    if (resourceType === 'images') {
      // 判断是否为背景资源
      const isBackground = stateKey || bgType === 'single';
      
      if (isBackground) {
        // 背景图片资源
        if (stateKey) {
          // 三态背景
          const propName = `backgroundResource${stateKey}`;
          widget[propName] = resourceId;
        } else {
          // 普通单一背景
          widget.backgroundResourceId = resourceId;
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
  
  updatePadding(side, value) {
    if (!this.currentWidget) return;
    
    // 确保 padding 对象存在
    if (!this.currentWidget.padding) {
      this.currentWidget.padding = { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    // 更新指定方向的 padding
    this.currentWidget.padding[side] = value;
    console.log('Padding updated:', side, value);
    app.updateWidgetInList(this.currentWidget);
  }
  
  updateMargin(side, value) {
    if (!this.currentWidget) return;
    
    // 确保 margin 对象存在
    if (!this.currentWidget.margin) {
      this.currentWidget.margin = { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    // 更新指定方向的 margin
    this.currentWidget.margin[side] = value;
    console.log('Margin updated:', side, value);
    app.updateWidgetInList(this.currentWidget);
  }
  
  /**
   * 渲染锚点选择按钮（9宫格）
   */
  renderAnchorButton(anchorX, anchorY, widget) {
    const isActive = widget.anchorX === anchorX && widget.anchorY === anchorY;
    const className = isActive ? 'anchor-btn active' : 'anchor-btn';
    return `<button class="${className}" data-anchor-x="${anchorX}" data-anchor-y="${anchorY}"></button>`;
  }
  
  /**
   * 切换定位模式
   */
  switchPositionMode(newMode) {
    if (!this.currentWidget) return;
    
    const canvasWidth = window.app?.canvasConfig?.width || 800;
    const canvasHeight = window.app?.canvasConfig?.height || 600;
    
    if (newMode === 'anchor' && this.currentWidget.positionMode === 'absolute') {
      // 绝对 → 锚点
      this.currentWidget.convertToAnchor(canvasWidth, canvasHeight);
    } else if (newMode === 'absolute' && this.currentWidget.positionMode === 'anchor') {
      // 锚点 → 绝对
      this.currentWidget.convertToAbsolute(canvasWidth, canvasHeight);
    }
    
    // 重新渲染属性面板
    this.show(this.currentWidget);
    
    // 更新画布显示
    app.updateWidgetInList(this.currentWidget);
  }
  
  /**
   * 设置锚点（切换锚点时自动重新计算偏移，保持控件位置不变）
   */
  setAnchor(anchorX, anchorY) {
    if (!this.currentWidget || this.currentWidget.positionMode !== 'anchor') return;
    
    const widget = this.currentWidget;
    const canvasWidth = window.app?.canvasConfig?.width || 800;
    const canvasHeight = window.app?.canvasConfig?.height || 600;
    
    // 1. 计算当前控件的实际位置（基于旧锚点）
    const currentPos = widget.calculatePosition(canvasWidth, canvasHeight);
    const currentX = currentPos.x;
    const currentY = currentPos.y;
    
    // 2. 计算新锚点的位置
    let newAnchorX = 0;
    switch (anchorX) {
      case 'left': newAnchorX = 0; break;
      case 'center': newAnchorX = canvasWidth / 2; break;
      case 'right': newAnchorX = canvasWidth; break;
    }
    
    let newAnchorY = 0;
    switch (anchorY) {
      case 'top': newAnchorY = 0; break;
      case 'middle': newAnchorY = canvasHeight / 2; break;
      case 'bottom': newAnchorY = canvasHeight; break;
    }
    
    // 3. 计算新的偏移值 = 当前位置 - 新锚点位置
    const newOffsetX = currentX - newAnchorX;
    const newOffsetY = currentY - newAnchorY;
    
    // 4. 更新锚点和偏移
    widget.anchorX = anchorX;
    widget.anchorY = anchorY;
    widget.offsetX = Math.round(newOffsetX);
    widget.offsetY = Math.round(newOffsetY);
    
    console.log(`Anchor changed: (${anchorX}, ${anchorY}), offset: (${widget.offsetX}, ${widget.offsetY})`);
    
    // 重新渲染属性面板以更新按钮状态和偏移值
    this.show(this.currentWidget);
    
    // 更新画布显示
    app.updateWidgetInList(this.currentWidget);
  }
  
  /**
   * 将图像控件的尺寸设置为其引用资源的原始尺寸
   */
  matchImageResourceSize() {
    const widget = this.currentWidget;
    if (!widget || widget.type !== 'image') {
      return;
    }
    
    // 检查是否有资源ID
    if (!widget.resourceId) {
      alert('该图像控件未引用任何资源');
      return;
    }
    
    // 获取资源
    const resource = window.resourceManager?.getResource(widget.resourceId, 'images');
    if (!resource) {
      alert('无法找到资源ID: ' + widget.resourceId);
      return;
    }
    
    // 从资源的data URL创建Image对象来获取原始尺寸
    const img = new Image();
    img.onload = () => {
      // 设置控件尺寸
      widget.width = img.width;
      widget.height = img.height;
      
      console.log(`Image widget size matched to resource: ${img.width}x${img.height}`);
      
      // 更新显示
      this.render();
      if (window.app) {
        window.app.updateWidgetInList(widget);
      }
    };
    
    img.onerror = () => {
      alert('无法加载图像资源');
    };
    
    img.src = resource.data;
  }
  
  /**
   * 切换边界锚定状态
   * @param {string} prop - 属性名 ('anchorLeft', 'anchorRight', 'anchorTop', 'anchorBottom')
   * @param {boolean} value - 是否启用
   */
  toggleEdgeAnchor(prop, value) {
    const widget = this.currentWidget;
    if (!widget) return;
    
    // 更新属性
    widget[prop] = value;
    
    // 如果启用了边界锚定，需要更新设计时边距
    if (value && (prop === 'anchorRight' || prop === 'anchorBottom')) {
      // 获取画布尺寸
      const canvasWidth = window.canvasRenderer?.canvasWidth || 800;
      const canvasHeight = window.canvasRenderer?.canvasHeight || 600;
      
      // 更新设计时边距
      widget.updateDesignMargins(canvasWidth, canvasHeight);
    }
    
    console.log(`Edge anchor ${prop}: ${value}`);
    
    // 更新画布显示
    if (window.app) {
      window.app.updateWidgetInList(widget);
    }
  }
}

const properties = new PropertiesPanel();
window.propertiesPanel = properties; // 暴露到全局以便其他模块访问
