/**
 * 资源管理器
 * 管理项目中的图像、字体等资源
 */
class ResourceManager {
  constructor() {
    this.resources = {
      images: [],   // { id, name, path, type: 'image', data: base64 }
      fonts: [],    // { id, name, path, type: 'font', data: base64 }
      // 未来可扩展: sounds, animations 等
    };
    this.nextId = 1;
    this.selectedResourceType = 'images'; // 当前选择的资源类型标签
    this.init();
  }

  init() {
    this.setupUI();
    this.setupEventListeners();
  }

  setupUI() {
    // 资源面板已在 HTML 中定义
    this.renderResourcePanel();
  }

  setupEventListeners() {
    // 资源类型标签切换
    const tabs = document.querySelectorAll('.resource-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        this.switchResourceType(type);
      });
    });

    // 添加资源按钮
    const btnAddImage = document.getElementById('btn-add-image');
    const btnAddFont = document.getElementById('btn-add-font');
    
    if (btnAddImage) {
      btnAddImage.addEventListener('click', () => this.addResource('images'));
    }
    
    if (btnAddFont) {
      btnAddFont.addEventListener('click', () => this.addResource('fonts'));
    }

    // 删除资源按钮
    const btnDeleteResource = document.getElementById('btn-delete-resource');
    if (btnDeleteResource) {
      btnDeleteResource.addEventListener('click', () => this.deleteSelectedResource());
    }
  }

  switchResourceType(type) {
    this.selectedResourceType = type;
    
    // 更新标签激活状态
    document.querySelectorAll('.resource-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });
    
    // 更新工具栏按钮显示
    document.getElementById('btn-add-image').style.display = type === 'images' ? 'inline-block' : 'none';
    document.getElementById('btn-add-font').style.display = type === 'fonts' ? 'inline-block' : 'none';
    
    // 重新渲染资源列表
    this.renderResourceList();
  }

  renderResourcePanel() {
    // 渲染资源类型标签和列表
    this.renderResourceList();
  }

  renderResourceList() {
    const container = document.getElementById('resource-list');
    if (!container) return;

    const resources = this.resources[this.selectedResourceType] || [];
    
    if (resources.length === 0) {
      container.innerHTML = '<p class="empty-hint">暂无资源</p>';
      return;
    }

    container.innerHTML = resources.map(res => `
      <div class="resource-item" data-id="${res.id}" data-type="${this.selectedResourceType}">
        <div class="resource-preview">
          ${this.selectedResourceType === 'images' 
            ? `<img src="${res.data}" alt="${res.name}" />` 
            : `<span class="font-preview" style="font-family: '${res.name}'">Aa</span>`}
        </div>
        <div class="resource-info">
          <div class="resource-name">${res.name}</div>
          <div class="resource-path">${res.path}</div>
          ${this.selectedResourceType === 'images' 
            ? `<button class="btn-edit-slice" data-id="${res.id}" title="编辑9-patch切片">9-patch</button>` 
            : ''}
        </div>
      </div>
    `).join('');

    // 添加点击事件
    container.querySelectorAll('.resource-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // 如果点击的是编辑按钮,不触发选中
        if (e.target.classList.contains('btn-edit-slice')) {
          return;
        }
        
        // 选中资源
        container.querySelectorAll('.resource-item').forEach(i => i.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        
        // 设置焦点到资源管理器
        if (window.app) {
          window.app.setFocusContext('resource');
        }
      });
      
      // 双击应用到选中的控件
      item.addEventListener('dblclick', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const type = e.currentTarget.dataset.type;
        this.applyResourceToSelectedWidget(id, type);
      });
    });
    
    // 9-patch编辑按钮事件
    container.querySelectorAll('.btn-edit-slice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(e.currentTarget.dataset.id);
        this.openSliceEditor(id);
      });
    });
  }

  async addResource(type) {
    if (!window.electronAPI) {
      alert('此功能需要在 Electron 环境中运行');
      return;
    }

    try {
      // 调用 Electron API 打开文件选择对话框
      const filters = type === 'images' 
        ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] }]
        : [{ name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }];
      
      const result = await window.electronAPI.selectFile(filters);
      
      if (result.canceled) return;

      const filePath = result.filePaths[0];
      const fileName = filePath.split(/[\/\\]/).pop();
      const fileExt = fileName.split('.').pop().toLowerCase();
      
      // 字体名称（不带扩展名）
      const fontName = type === 'fonts' ? fileName.replace(/\.[^.]+$/, '') : fileName;

      // 读取文件为 base64
      const fileData = await window.electronAPI.readFileAsBase64(filePath);
      
      // 创建资源对象
      const resource = {
        id: this.nextId++,
        name: fileName,
        fontName: type === 'fonts' ? fontName : undefined, // 字体专用名称
        path: filePath,
        type: type === 'images' ? 'image' : 'font',
        data: type === 'images' 
          ? `data:image/${fileExt};base64,${fileData}`
          : `data:font/${fileExt};base64,${fileData}`, // 字体也用完整 data URL
        // 9-patch 切片信息 (仅图片资源使用)
        sliceLeft: 0,
        sliceTop: 0,
        sliceRight: 0,
        sliceBottom: 0,
      };

      // 如果是字体，需要动态加载
      if (type === 'fonts') {
        await this.loadFontFace(fontName, fileExt, fileData);
      }

      this.resources[type].push(resource);
      this.renderResourceList();
      
      // 标记项目为已修改
      if (window.app) {
        window.app.markDirty();
      }

      console.log('Resource added:', resource);
    } catch (err) {
      console.error('Failed to add resource:', err);
      alert('添加资源失败: ' + err.message);
    }
  }

  async loadFontFace(fontName, fileExt, base64Data) {
    try {
      // 根据文件扩展名确定 MIME 类型
      const mimeTypes = {
        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'woff': 'font/woff',
        'woff2': 'font/woff2'
      };
      const mimeType = mimeTypes[fileExt] || 'font/ttf';
      
      const fontFace = new FontFace(fontName, `url(data:${mimeType};base64,${base64Data})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      console.log('Font loaded:', fontName, 'as', mimeType);
    } catch (err) {
      console.error('Failed to load font:', fontName, err);
      throw err;
    }
  }

  deleteSelectedResource() {
    console.log('deleteSelectedResource called');
    const selected = document.querySelector('.resource-item.selected');
    console.log('Selected resource item:', selected);
    
    if (!selected) {
      // 没有选中的资源，静默返回
      console.log('No resource selected');
      return;
    }

    const id = parseInt(selected.dataset.id);
    const type = selected.dataset.type;
    
    const resources = this.resources[type];
    const resource = resources.find(r => r.id === id);
    
    if (!resource) return;
    
    // 检查资源是否被控件引用
    const referencingWidgets = this.findReferencingWidgets(id, type);
    
    if (referencingWidgets.length > 0) {
      const widgetIds = referencingWidgets.map(w => w.id).join(', ');
      const message = `资源 "${resource.name}" 正被以下控件引用：\n${widgetIds}\n\n删除后这些控件将失去对该资源的引用。\n\n确定要删除吗？`;
      
      if (!confirm(message)) return;
      
      // 清除控件中的资源引用
      this.clearResourceReferences(id, type, referencingWidgets);
    } else {
      // 没有引用，正常确认删除
      if (!confirm(`确定要删除资源 "${resource.name}" 吗？`)) return;
    }

    const index = resources.findIndex(r => r.id === id);
    if (index !== -1) {
      resources.splice(index, 1);
      this.renderResourceList();
      
      if (window.app) {
        window.app.markDirty();
      }
      
      console.log('Resource deleted:', resource.name);
    }
  }
  
  // 查找引用指定资源的控件
  findReferencingWidgets(resourceId, resourceType) {
    if (!window.app || !window.app.widgets) return [];
    
    return window.app.widgets.filter(widget => {
      if (resourceType === 'images') {
        return widget.resourceId === resourceId || widget.backgroundResourceId === resourceId;
      } else if (resourceType === 'fonts') {
        return widget.fontResourceId === resourceId;
      }
      return false;
    });
  }
  
  // 清除控件中的资源引用
  clearResourceReferences(resourceId, resourceType, widgets) {
    widgets.forEach(widget => {
      if (resourceType === 'images') {
        if (widget.resourceId === resourceId) {
          widget.src = null;
          widget.resourceId = null;
        }
        if (widget.backgroundResourceId === resourceId) {
          widget.backgroundImage = null;
          widget.backgroundResourceId = null;
        }
      } else if (resourceType === 'fonts') {
        if (widget.fontResourceId === resourceId) {
          widget.fontFamily = 'Arial'; // 恢复默认字体
          widget.fontResourceId = null;
        }
      }
      
      // 更新控件
      if (window.app) {
        window.app.updateWidgetInList(widget);
      }
    });
  }

  applyResourceToSelectedWidget(resourceId, resourceType) {
    if (!window.app || !window.app.selectedWidget) {
      alert('请先选择一个控件');
      return;
    }

    const resources = this.resources[resourceType];
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) return;

    const widget = window.app.selectedWidget;
    
    // 根据控件类型和资源类型应用
    if (resourceType === 'images') {
      // 图像资源应用到 image 控件或按钮背景
      if (widget.type === 'image') {
        widget.src = resource.data;
        widget.resourceId = resourceId; // 保存资源引用
      } else if (widget.type === 'button') {
        widget.backgroundImage = resource.data;
        widget.backgroundResourceId = resourceId;
      }
    } else if (resourceType === 'fonts') {
      // 字体资源应用到文本控件
      if (widget.type === 'label' || widget.type === 'button' || widget.type === 'textinput') {
        widget.fontFamily = resource.fontName || resource.name.replace(/\.[^.]+$/, '');
        widget.fontResourceId = resourceId;
      }
    }

    // 更新控件
    window.app.updateWidgetInList(widget);
    window.properties.show(widget);
    
    console.log('Resource applied to widget:', resource, widget);
  }

  getResource(id, type) {
    const resources = this.resources[type];
    return resources.find(r => r.id === id);
  }

  // 获取所有资源（用于保存项目）
  getAllResources() {
    return this.resources;
  }

  // 加载资源（从项目文件）
  loadResources(resourcesData) {
    if (!resourcesData) return;
    
    this.resources = resourcesData;
    
    // 计算下一个ID
    const allIds = [
      ...this.resources.images.map(r => r.id),
      ...this.resources.fonts.map(r => r.id),
    ];
    this.nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
    
    // 重新加载所有字体
    this.resources.fonts.forEach(font => {
      const fontName = font.fontName || font.name.replace(/\.[^.]+$/, '');
      const fileExt = font.name.split('.').pop().toLowerCase();
      const base64Data = font.data.replace(/^data:font\/[^;]+;base64,/, '');
      this.loadFontFace(fontName, fileExt, base64Data).catch(err => {
        console.error('Failed to reload font:', fontName, err);
      });
    });
    
    this.renderResourceList();
  }

  // 清空所有资源（新建项目时）
  clearResources() {
    this.resources = {
      images: [],
      fonts: [],
    };
    this.nextId = 1;
    this.renderResourceList();
  }

  // 打开9-patch切片编辑器
  openSliceEditor(resourceId) {
    const resource = this.getResource(resourceId, 'images');
    if (!resource) return;

    // 兼容旧数据：确保有9-patch属性
    if (resource.sliceLeft === undefined) resource.sliceLeft = 0;
    if (resource.sliceTop === undefined) resource.sliceTop = 0;
    if (resource.sliceRight === undefined) resource.sliceRight = 0;
    if (resource.sliceBottom === undefined) resource.sliceBottom = 0;

    // 创建模态对话框
    const dialog = document.createElement('div');
    dialog.className = 'slice-editor-dialog';
    dialog.innerHTML = `
      <div class="slice-editor-content">
        <h3>9-Patch 切片编辑 - ${resource.name}</h3>
        <div class="slice-editor-body">
          <div class="slice-preview">
            <canvas id="slice-canvas"></canvas>
          </div>
          <div class="slice-controls">
            <div class="slice-input-group">
              <label>左边距 (Left):</label>
              <input type="number" id="slice-left" min="0" value="${resource.sliceLeft}" />
            </div>
            <div class="slice-input-group">
              <label>上边距 (Top):</label>
              <input type="number" id="slice-top" min="0" value="${resource.sliceTop}" />
            </div>
            <div class="slice-input-group">
              <label>右边距 (Right):</label>
              <input type="number" id="slice-right" min="0" value="${resource.sliceRight}" />
            </div>
            <div class="slice-input-group">
              <label>下边距 (Bottom):</label>
              <input type="number" id="slice-bottom" min="0" value="${resource.sliceBottom}" />
            </div>
            <div class="slice-hint">
              提示: 设置可拉伸区域的边距。左右边距定义垂直拉伸区域，上下边距定义水平拉伸区域。
            </div>
          </div>
        </div>
        <div class="slice-editor-footer">
          <button id="btn-slice-cancel" class="btn-secondary">取消</button>
          <button id="btn-slice-save" class="btn-primary">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 绘制预览
    const canvas = document.getElementById('slice-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = Math.min(img.width, 400);
      canvas.height = Math.min(img.height, 400);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      
      const drawPreview = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, w, h);
        
        // 绘制切片线
        const left = parseInt(document.getElementById('slice-left').value) * scale;
        const top = parseInt(document.getElementById('slice-top').value) * scale;
        const right = parseInt(document.getElementById('slice-right').value) * scale;
        const bottom = parseInt(document.getElementById('slice-bottom').value) * scale;
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // 左边线
        if (left > 0) {
          ctx.beginPath();
          ctx.moveTo(left, 0);
          ctx.lineTo(left, h);
          ctx.stroke();
        }
        
        // 右边线
        if (right > 0) {
          ctx.beginPath();
          ctx.moveTo(w - right, 0);
          ctx.lineTo(w - right, h);
          ctx.stroke();
        }
        
        // 上边线
        if (top > 0) {
          ctx.beginPath();
          ctx.moveTo(0, top);
          ctx.lineTo(w, top);
          ctx.stroke();
        }
        
        // 下边线
        if (bottom > 0) {
          ctx.beginPath();
          ctx.moveTo(0, h - bottom);
          ctx.lineTo(w, h - bottom);
          ctx.stroke();
        }
        
        ctx.setLineDash([]);
      };
      
      drawPreview();
      
      // 输入框变化时重绘
      ['slice-left', 'slice-top', 'slice-right', 'slice-bottom'].forEach(id => {
        document.getElementById(id).addEventListener('input', drawPreview);
      });
    };
    img.src = resource.data;

    // 保存按钮
    document.getElementById('btn-slice-save').addEventListener('click', () => {
      resource.sliceLeft = parseInt(document.getElementById('slice-left').value);
      resource.sliceTop = parseInt(document.getElementById('slice-top').value);
      resource.sliceRight = parseInt(document.getElementById('slice-right').value);
      resource.sliceBottom = parseInt(document.getElementById('slice-bottom').value);
      
      if (window.app) {
        window.app.markDirty();
      }
      
      document.body.removeChild(dialog);
      console.log('9-patch saved:', resource);
    });

    // 取消按钮
    document.getElementById('btn-slice-cancel').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }
}

// 创建全局实例
const resourceManager = new ResourceManager();
window.resourceManager = resourceManager; // 暴露到全局
