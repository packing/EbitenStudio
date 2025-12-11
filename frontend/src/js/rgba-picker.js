/**
 * RGBA 颜色选择器组件
 */
class RGBAPicker {
  constructor() {
    this.currentColor = { r: 255, g: 255, b: 255, a: 255 };
    this.callback = null;
    this.propertyName = null;
  }

  /**
   * 打开颜色选择器
   * @param {string} hexColor - 十六进制颜色
   * @param {number} alpha - Alpha 值 (0-255)
   * @param {string} propertyName - 属性名称
   * @param {Function} callback - 回调函数
   */
  open(hexColor, alpha, propertyName, callback) {
    this.propertyName = propertyName;
    this.callback = callback;
    
    // 解析当前颜色
    if (hexColor && hexColor.startsWith('#')) {
      this.currentColor.r = parseInt(hexColor.slice(1, 3), 16);
      this.currentColor.g = parseInt(hexColor.slice(3, 5), 16);
      this.currentColor.b = parseInt(hexColor.slice(5, 7), 16);
    }
    this.currentColor.a = alpha !== undefined ? alpha : 255;
    
    this.createDialog();
    this.updatePreview();
  }

  createDialog() {
    // 移除已存在的对话框
    const existing = document.getElementById('rgba-picker-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'rgba-picker-overlay';
    overlay.className = 'rgba-picker-overlay';
    overlay.innerHTML = `
      <div class="rgba-picker-dialog">
        <div class="rgba-picker-title">选择颜色 - ${this.propertyName}</div>
        
        <div class="rgba-picker-preview">
          <div class="rgba-picker-preview-color" id="rgba-preview"></div>
        </div>
        
        <div class="rgba-picker-hex-input">
          <label>HEX:</label>
          <input type="text" id="rgba-hex-input" value="${this.rgbToHex()}" maxlength="7">
        </div>
        
        <div class="rgba-picker-channel">
          <div class="rgba-picker-channel-label">
            <span>Red</span>
            <span class="rgba-picker-channel-value" id="rgba-r-value">${this.currentColor.r}</span>
          </div>
          <input type="range" class="rgba-picker-slider" id="rgba-r-slider" min="0" max="255" value="${this.currentColor.r}">
        </div>
        
        <div class="rgba-picker-channel">
          <div class="rgba-picker-channel-label">
            <span>Green</span>
            <span class="rgba-picker-channel-value" id="rgba-g-value">${this.currentColor.g}</span>
          </div>
          <input type="range" class="rgba-picker-slider" id="rgba-g-slider" min="0" max="255" value="${this.currentColor.g}">
        </div>
        
        <div class="rgba-picker-channel">
          <div class="rgba-picker-channel-label">
            <span>Blue</span>
            <span class="rgba-picker-channel-value" id="rgba-b-value">${this.currentColor.b}</span>
          </div>
          <input type="range" class="rgba-picker-slider" id="rgba-b-slider" min="0" max="255" value="${this.currentColor.b}">
        </div>
        
        <div class="rgba-picker-channel">
          <div class="rgba-picker-channel-label">
            <span>Alpha</span>
            <span class="rgba-picker-channel-value" id="rgba-a-value">${this.currentColor.a}</span>
          </div>
          <input type="range" class="rgba-picker-slider" id="rgba-a-slider" min="0" max="255" value="${this.currentColor.a}">
        </div>
        
        <div class="rgba-picker-buttons">
          <button class="rgba-picker-btn" id="rgba-btn-cancel">取消</button>
          <button class="rgba-picker-btn primary" id="rgba-btn-ok">确定</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 绑定事件
    this.attachEvents();
  }

  attachEvents() {
    const overlay = document.getElementById('rgba-picker-overlay');
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // RGB 滑块
    ['r', 'g', 'b', 'a'].forEach(channel => {
      const slider = document.getElementById(`rgba-${channel}-slider`);
      const valueSpan = document.getElementById(`rgba-${channel}-value`);
      
      slider.addEventListener('input', () => {
        const value = parseInt(slider.value);
        this.currentColor[channel] = value;
        valueSpan.textContent = value;
        
        if (channel !== 'a') {
          document.getElementById('rgba-hex-input').value = this.rgbToHex();
        }
        
        this.updatePreview();
      });
    });

    // HEX 输入框
    const hexInput = document.getElementById('rgba-hex-input');
    hexInput.addEventListener('input', () => {
      const hex = hexInput.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        this.currentColor.r = parseInt(hex.slice(1, 3), 16);
        this.currentColor.g = parseInt(hex.slice(3, 5), 16);
        this.currentColor.b = parseInt(hex.slice(5, 7), 16);
        
        document.getElementById('rgba-r-slider').value = this.currentColor.r;
        document.getElementById('rgba-g-slider').value = this.currentColor.g;
        document.getElementById('rgba-b-slider').value = this.currentColor.b;
        
        document.getElementById('rgba-r-value').textContent = this.currentColor.r;
        document.getElementById('rgba-g-value').textContent = this.currentColor.g;
        document.getElementById('rgba-b-value').textContent = this.currentColor.b;
        
        this.updatePreview();
      }
    });

    // 按钮
    document.getElementById('rgba-btn-cancel').addEventListener('click', () => {
      this.close();
    });

    document.getElementById('rgba-btn-ok').addEventListener('click', () => {
      if (this.callback) {
        this.callback(this.rgbToHex(), this.currentColor.a);
      }
      this.close();
    });
  }

  updatePreview() {
    const preview = document.getElementById('rgba-preview');
    if (preview) {
      const { r, g, b, a } = this.currentColor;
      preview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    }
  }

  rgbToHex() {
    const toHex = (n) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(this.currentColor.r)}${toHex(this.currentColor.g)}${toHex(this.currentColor.b)}`;
  }

  close() {
    const overlay = document.getElementById('rgba-picker-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

// 创建全局单例
window.rgbaPicker = new RGBAPicker();
