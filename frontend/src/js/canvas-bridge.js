// Ebiten WASM Canvas 桥接
class CanvasBridge {
  constructor() {
    this.ready = false;
    this.canvasWidth = 800;   // 默认画布宽度
    this.canvasHeight = 600;  // 默认画布高度
  }

  async init(width = 800, height = 600) {
    console.log('Initializing Ebiten WASM with canvas size:', width, 'x', height);
    
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    // 设置全局配置供 iframe 内的 WASM 使用
    window.canvasConfig = {
      width: this.canvasWidth,
      height: this.canvasHeight
    };
    
    const iframe = document.getElementById('canvas-frame');
    if (!iframe) {
      console.error('Canvas iframe not found!');
      return false;
    }
    
    // 加载 canvas.html 到 iframe
    iframe.src = '../public/canvas.html';
    iframe.style.display = 'block';
    
    // 等待 iframe 加载
    await new Promise((resolve) => {
      iframe.onload = resolve;
    });
    
    // 等待 WASM 初始化
    await this.waitForEbiten(iframe);
    
    this.ready = true;
    console.log('✓ Ebiten WASM ready in iframe');
    
    // 隐藏加载提示
    const loading = document.getElementById('canvas-loading');
    if (loading) {
      loading.style.display = 'none';
    }
    
    return true;
  }

  async waitForEbiten(iframe) {
    // 通过 postMessage 等待 iframe 内 Ebiten 初始化完成
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ebiten initialization timeout'));
      }, 10000); // 10秒超时
      
      const messageHandler = (e) => {
        if (e.source === iframe.contentWindow) {
          if (e.data.type === 'ebiten:ready') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            resolve();
          } else if (e.data.type === 'ebiten:error') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            reject(new Error(e.data.error));
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
    });
  }

  setCanvasSize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    window.canvasConfig = { width, height };
    
    // 重新加载 iframe 以应用新尺寸
    const iframe = document.getElementById('canvas-frame');
    if (iframe) {
      this.ready = false;
      const loading = document.getElementById('canvas-loading');
      if (loading) loading.style.display = 'flex';
      
      // 强制刷新 iframe
      iframe.src = '../public/canvas.html?' + Date.now();
      
      // 等待重新初始化
      iframe.onload = async () => {
        await this.waitForEbiten(iframe);
        this.ready = true;
        if (loading) loading.style.display = 'none';
        
        // 恢复 widgets 数据
        if (window.app && window.app.widgets) {
          this.setWidgets(window.app.widgets);
        }
      };
    }
  }

  getIframeWindow() {
    const iframe = document.getElementById('canvas-frame');
    return iframe ? iframe.contentWindow : null;
  }

  callEbitenMethod(method, ...args) {
    const win = this.getIframeWindow();
    if (win && win.ebitenCanvas && win.ebitenCanvas[method]) {
      return win.ebitenCanvas[method](...args);
    }
    console.warn(`Ebiten method ${method} not available`);
    return null;
  }

  // 设置 widgets 数据
  setWidgets(widgets) {
    if (!this.ready) return;
    this.callEbitenMethod('setWidgets', JSON.stringify(widgets));
  }

  // 选择 widget
  selectWidget(id) {
    if (!this.ready) return;
    this.callEbitenMethod('selectWidget', id);
  }

  // 获取选中的 widget ID
  getSelectedID() {
    if (!this.ready) return null;
    return this.callEbitenMethod('getSelectedID');
  }

  // 更新 widget
  updateWidget(widget) {
    if (!this.ready) return;
    this.callEbitenMethod('updateWidget', JSON.stringify(widget));
  }

  // 获取指定位置的 widget
  getWidgetAtPos(x, y) {
    if (!this.ready) return null;
    const result = this.callEbitenMethod('getWidgetAtPos', x, y);
    return result ? JSON.parse(result) : null;
  }
}

const canvasBridge = new CanvasBridge();

// 监听来自 iframe 内 Ebiten 的事件
window.addEventListener('message', (e) => {
  // 确保消息来自 canvas iframe
  const iframe = document.getElementById('canvas-frame');
  if (!iframe || e.source !== iframe.contentWindow) {
    return;
  }
  
  try {
    const event = e.data;
    
    // 跳过 Ebiten 就绪消息
    if (event.type === 'ebiten:ready' || event.type === 'ebiten:error') {
      return;
    }
    
    // 解析 JSON 数据
    let eventData = event.data;
    if (typeof eventData === 'string') {
      try {
        eventData = JSON.parse(eventData);
      } catch (parseError) {
        console.error('Failed to parse event data:', parseError);
        return;
      }
    }
    
    switch (event.type) {
      case 'widget:selected':
        if (window.app) {
          window.app.selectWidget(eventData);
        }
        break;
      
      case 'widget:dragging':
        // 拖拽中,可以实时更新属性面板
        break;
      
      case 'widget:updated':
        if (window.app) {
          window.app.updateWidgetInList(eventData);
        }
        break;
      
      case 'canvas:click':
        // Canvas 点击事件，用于创建模式
        if (window.toolbar && window.toolbar.creatingType) {
          window.toolbar.createWidgetAt(eventData.x, eventData.y);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling canvas event:', error);
  }
});

// 保留旧的全局函数用于兼容
window.ebitenCanvasEvent = function(jsonStr) {
  const event = JSON.parse(jsonStr);
  // 通过 postMessage 转发
  window.postMessage(event, '*');
};
