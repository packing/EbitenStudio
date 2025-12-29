class App {
  constructor() {
    this.widgets = [];
    this.selectedWidget = null;
    this.canvasConfig = { width: 800, height: 600 }; // 默认画布尺寸
    this.currentFilePath = null; // 当前打开的文件路径
    this.isDirty = false; // 是否有未保存的更改
    this.focusContext = 'canvas'; // 当前焦点上下文: 'canvas' | 'resource'
    window.app = this; // 暴露给 canvas-bridge
    this.init();
  }

  async init() {
    // 加载画布配置
    this.loadCanvasConfig();
    
    // 初始化 HTML5 Canvas 渲染器
    canvasRenderer.init(this.canvasConfig.width, this.canvasConfig.height);
    
    // 不再连接后端 API，所有数据在前端管理
    console.log('App initialized with HTML5 Canvas');

    // 加载现有 widgets
    this.loadWidgets();
    
    // 设置画布选择事件
    this.setupCanvasSelection();
    
    // 设置文件操作事件监听
    this.setupFileEvents();
    
    // 设置全局键盘事件
    this.setupGlobalKeyEvents();
    
    // 默认选中画布并显示属性
    this.selectCanvas();
  }
  
  setupGlobalKeyEvents() {
    document.addEventListener('keydown', (e) => {
      // Delete 键删除选中项
      if (e.key === 'Delete' || e.key === 'Del') {
        e.preventDefault();
        this.handleDelete();
      }
    });
  }
  
  handleDelete() {
    console.log('handleDelete called, focusContext:', this.focusContext);
    
    if (this.focusContext === 'canvas') {
      // 删除选中的控件
      if (this.selectedWidget) {
        if (confirm(`确定要删除控件 "${this.selectedWidget.id}" 吗？`)) {
          this.removeWidgetFromList(this.selectedWidget.id);
          this.selectedWidget = null;
          properties.clear();
        }
      }
    } else if (this.focusContext === 'resource') {
      // 删除选中的资源
      console.log('Trying to delete resource, resourceManager:', window.resourceManager);
      if (window.resourceManager) {
        window.resourceManager.deleteSelectedResource();
      } else {
        console.error('resourceManager not found on window');
      }
    }
  }
  
  setFocusContext(context) {
    this.focusContext = context;
    console.log('Focus context:', context);
  }

  /**
   * 获取当前项目的脚本目录路径
   * @returns {Promise<string|null>} 返回 scripts 目录路径，项目未保存时返回 null
   */
  async getProjectScriptsDir() {
    if (!this.currentFilePath) {
      return null; // 项目未保存
    }
    
    // 获取项目文件所在目录
    const projectDir = await window.electronAPI.path.dirname(this.currentFilePath);
    
    // 返回 scripts 子目录路径
    return await window.electronAPI.path.join(projectDir, 'scripts');
  }

  setupFileEvents() {
    if (!window.electronAPI) return;

    // 新建项目
    window.electronAPI.onFileNew(() => {
      this.newProject();
    });

    // 保存
    window.electronAPI.onFileSave(() => {
      this.saveProject();
    });

    // 另存为
    window.electronAPI.onFileSaveAs((filePath) => {
      this.saveProjectAs(filePath);
    });

    // 打开文件
    window.electronAPI.onFileOpened((data) => {
      this.openProject(data);
    });
    
    // 置顶
    window.electronAPI.onWidgetBringToFront(() => {
      this.bringWidgetToFront();
    });
    
    // 置底
    window.electronAPI.onWidgetSendToBack(() => {
      this.sendWidgetToBack();
    });
  }

  newProject() {
    if (this.isDirty) {
      if (!confirm('Current project has unsaved changes. Continue?')) {
        return;
      }
    }
    
    this.widgets = [];
    this.currentFilePath = null;
    this.isDirty = false;
    this.canvasConfig = { width: 800, height: 600 };
    
    // 清空资源
    resourceManager.clearResources();
    
    // 重置工具栏ID计数器
    if (window.toolbar) {
      window.toolbar.resetCounters([]);
    }
    
    canvasRenderer.setCanvasSize(this.canvasConfig.width, this.canvasConfig.height);
    this.updateCanvasWidgets();
    this.renderWidgetList();
    this.selectCanvas();
    
    // 更新窗口标题
    if (window.electronAPI) {
      window.electronAPI.updateWindowTitle(null);
    }
    
    console.log('New project created');
  }

  async saveProject() {
    if (!this.currentFilePath) {
      // 没有文件路径，调用另存为
      const filePath = await window.electronAPI.getSavePath();
      if (filePath) {
        await this.saveProjectAs(filePath);
      }
      return;
    }
    
    await this.saveProjectAs(this.currentFilePath);
  }

  async saveProjectAs(filePath) {
    // 序列化 widgets - 如果是 Widget 实例，调用 toJSON()；否则直接使用
    const serializedWidgets = this.widgets.map(widget => 
      widget.toJSON && typeof widget.toJSON === 'function' ? widget.toJSON() : widget
    );
    
    const projectData = {
      version: '1.0',
      canvas: this.canvasConfig,
      widgets: serializedWidgets,
      resources: resourceManager.getAllResources() // 保存资源
    };
    
    const result = await window.electronAPI.saveFile(filePath, projectData);
    
    if (result.success) {
      this.currentFilePath = filePath;
      this.isDirty = false;
      
      // 更新窗口标题
      if (window.electronAPI) {
        window.electronAPI.updateWindowTitle(filePath);
      }
      
      console.log('Project saved:', filePath);
    } else {
      alert('Failed to save project: ' + result.error);
    }
  }

  openProject(data) {
    if (this.isDirty) {
      if (!confirm('Current project has unsaved changes. Continue?')) {
        return;
      }
    }
    
    try {
      const projectData = data.data;
      
      // 加载画布配置
      if (projectData.canvas) {
        this.canvasConfig = projectData.canvas;
        canvasRenderer.setCanvasSize(this.canvasConfig.width, this.canvasConfig.height);
      }
      
      // 加载控件 - 反序列化为 Widget 类实例
      const rawWidgets = projectData.widgets || [];
      this.widgets = rawWidgets.map(widgetData => {
        // 使用 Widget.fromJSON 将普通对象转换为类实例
        if (widgetData.type && Widget.getWidgetClass) {
          return Widget.fromJSON(widgetData);
        }
        return widgetData; // 兼容旧格式
      });
      this.updateCanvasWidgets();
      
      // 重置工具栏ID计数器
      if (window.toolbar) {
        window.toolbar.resetCounters(this.widgets);
      }
      
      // 加载资源
      if (projectData.resources) {
        resourceManager.loadResources(projectData.resources);
      }
      
      this.currentFilePath = data.filePath;
      this.isDirty = false;
      
      this.renderWidgetList();
      this.selectCanvas();
      
      // 更新窗口标题
      if (window.electronAPI) {
        window.electronAPI.updateWindowTitle(data.filePath);
      }
      
      console.log('Project opened:', data.filePath);
    } catch (err) {
      alert('Failed to open project: ' + err.message);
    }
  }

  markDirty() {
    this.isDirty = true;
  }

  loadCanvasConfig() {
    // 默认配置，实际配置从项目文件加载
    this.canvasConfig = { width: 800, height: 600 };
  }

  saveCanvasConfig() {
    // 画布配置作为项目的一部分保存
  }

  updateCanvasSize(width, height) {
    this.canvasConfig.width = width;
    this.canvasConfig.height = height;
    this.saveCanvasConfig();
    this.renderWidgetList(); // 更新控件树显示新尺寸
    canvasRenderer.setCanvasSize(width, height);
    this.markDirty();
  }

  setupCanvasSelection() {
    // 监听画布容器点击，显示画布属性
    const container = document.getElementById('canvas-container');
    container.addEventListener('click', (e) => {
      // 设置焦点到画布
      this.setFocusContext('canvas');
      
      // 如果点击的是容器背景（不是 iframe）
      if (e.target === container) {
        this.selectCanvas();
      }
    });
  }

  selectCanvas() {
    this.selectedWidget = null;
    this.setFocusContext('canvas'); // 选中画布时设置焦点
    canvasRenderer.selectWidget(null); // 取消选择
    this.renderWidgetList();
    this.showCanvasProperties();
  }

  showCanvasProperties() {
    const panel = document.getElementById('properties-panel');
    panel.innerHTML = `
      <h3>画布属性</h3>
      <div class="property-group">
        <label class="property-label">宽度 (px)</label>
        <input type="number" class="property-input" id="prop-canvas-width" value="${this.canvasConfig.width}" min="320" max="4096">
      </div>
      <div class="property-group">
        <label class="property-label">高度 (px)</label>
        <input type="number" class="property-input" id="prop-canvas-height" value="${this.canvasConfig.height}" min="240" max="4096">
      </div>
      <div class="property-group">
        <button id="apply-canvas-size" class="btn-primary">更改并刷新</button>
        <p style="font-size: 11px; color: #888; margin-top: 8px;">修改尺寸后将重新加载画布</p>
      </div>
      <div class="property-group">
        <h4>常用分辨率</h4>
        <button class="preset-btn" data-width="375" data-height="667">iPhone SE (375×667)</button>
        <button class="preset-btn" data-width="414" data-height="896">iPhone 11 (414×896)</button>
        <button class="preset-btn" data-width="768" data-height="1024">iPad (768×1024)</button>
        <button class="preset-btn" data-width="1920" data-height="1080">Full HD (1920×1080)</button>
        <button class="preset-btn" data-width="1280" data-height="720">HD (1280×720)</button>
      </div>
    `;

    // 应用按钮事件
    document.getElementById('apply-canvas-size').addEventListener('click', () => {
      const width = parseInt(document.getElementById('prop-canvas-width').value);
      const height = parseInt(document.getElementById('prop-canvas-height').value);
      if (width > 0 && height > 0) {
        this.updateCanvasSize(width, height);
      }
    });

    // 预设按钮事件
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const width = parseInt(btn.dataset.width);
        const height = parseInt(btn.dataset.height);
        document.getElementById('prop-canvas-width').value = width;
        document.getElementById('prop-canvas-height').value = height;
      });
    });
  }

  loadWidgets() {
    // 新项目默认为空
    this.widgets = [];
    this.renderWidgetList();
    // 同步到 Canvas
    this.updateCanvasWidgets();
  }

  saveWidgets() {
    // 标记为有未保存的更改
    this.markDirty();
  }

  renderWidgetList() {
    const tree = document.getElementById('widget-tree');
    
    // 画布根节点
    const canvasNode = `
      <div class="widget-item widget-root ${!this.selectedWidget ? 'selected' : ''}" 
           data-id="__canvas__"
           data-droppable="true">
        🖼️ 画布 (${this.canvasConfig.width}×${this.canvasConfig.height})
      </div>
    `;
    
    // 获取顶层控件（没有父容器的）
    const topLevelWidgets = this.widgets.filter(w => !w.parentId);
    
    // 递归渲染控件树
    const renderWidget = (widget, depth = 0) => {
      const indent = depth * 20;
      const isSelected = this.selectedWidget?.id === widget.id;
      const isContainer = widget.type === 'panel';
      const visibleIndicator = widget.visible === false ? ' 👁️‍🗨️' : '';
      
      let html = `
        <div class="widget-item widget-child ${isSelected ? 'selected' : ''}" 
             data-id="${widget.id}"
             ${isContainer ? 'data-droppable="true"' : ''}
             draggable="true"
             style="padding-left: ${indent + 20}px">
          ${this.getWidgetIcon(widget.type)} ${widget.type} - ${widget.text || widget.id.slice(0, 8)}${visibleIndicator}
        </div>
      `;
      
      // 如果是容器且有子控件，递归渲染子控件
      if (isContainer) {
        const children = this.widgets.filter(w => w.parentId === widget.id);
        children.forEach(child => {
          html += renderWidget(child, depth + 1);
        });
      }
      
      return html;
    };
    
    // 子控件列表
    const childrenNodes = topLevelWidgets.length === 0 
      ? '<p class="empty-hint" style="margin-left: 20px;">暂无组件</p>'
      : topLevelWidgets.map(w => renderWidget(w)).join('');
    
    tree.innerHTML = canvasNode + childrenNodes;

    // 添加点击事件
    tree.querySelectorAll('.widget-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (id === '__canvas__') {
          this.selectCanvas();
        } else {
          const widget = this.widgets.find(w => w.id === id);
          if (widget) {
            this.selectWidget(widget);
          }
        }
      });
    });
    
    // 添加拖拽事件
    this.setupTreeDragAndDrop(tree);
  }
  
  setupTreeDragAndDrop(tree) {
    let draggedWidget = null;
    
    // 拖拽开始
    tree.querySelectorAll('[draggable="true"]').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        const widgetId = item.dataset.id;
        draggedWidget = this.widgets.find(w => w.id === widgetId);
        e.dataTransfer.effectAllowed = 'move';
        item.style.opacity = '0.5';
      });
      
      item.addEventListener('dragend', (e) => {
        item.style.opacity = '1';
        draggedWidget = null;
        // 移除所有拖拽样式
        tree.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
    });
    
    // 拖拽目标（画布和面板容器）
    tree.querySelectorAll('[data-droppable="true"]').forEach(target => {
      target.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // 检查是否可以放置
        const targetId = target.dataset.id;
        if (draggedWidget) {
          // 不能拖到自己身上
          if (targetId === draggedWidget.id) return;
          
          // 不能拖到自己的子孙节点上
          if (targetId !== '__canvas__' && this.isDescendant(targetId, draggedWidget.id)) {
            e.dataTransfer.dropEffect = 'none';
            return;
          }
          
          target.classList.add('drag-over');
        }
      });
      
      target.addEventListener('dragleave', (e) => {
        target.classList.remove('drag-over');
      });
      
      target.addEventListener('drop', (e) => {
        e.preventDefault();
        target.classList.remove('drag-over');
        
        if (!draggedWidget) return;
        
        const targetId = target.dataset.id;
        
        // 不能拖到自己身上
        if (targetId === draggedWidget.id) return;
        
        // 不能拖到自己的子孙节点上
        if (targetId !== '__canvas__' && this.isDescendant(targetId, draggedWidget.id)) return;
        
        // 更新父子关系
        if (targetId === '__canvas__') {
          // 拖到画布上，移除父容器
          if (draggedWidget.parentId) {
            // 转换为绝对坐标
            const absPos = this.getAbsolutePosition(draggedWidget);
            draggedWidget.x = absPos.x;
            draggedWidget.y = absPos.y;
            draggedWidget.parentId = null;
            console.log('Widget moved to canvas');
          }
        } else {
          // 拖到面板上
          const targetWidget = this.widgets.find(w => w.id === targetId);
          if (targetWidget && targetWidget.type === 'panel') {
            const oldParentId = draggedWidget.parentId;
            
            // 如果之前有父容器，先转换为绝对坐标
            let absX, absY;
            if (oldParentId) {
              const absPos = this.getAbsolutePosition(draggedWidget);
              absX = absPos.x;
              absY = absPos.y;
            } else {
              absX = draggedWidget.x;
              absY = draggedWidget.y;
            }
            
            // 转换为新父容器的相对坐标
            const targetAbsPos = this.getAbsolutePosition(targetWidget);
            draggedWidget.x = absX - targetAbsPos.x;
            draggedWidget.y = absY - targetAbsPos.y;
            
            // 限制在父容器范围内
            draggedWidget.x = Math.max(0, Math.min(targetWidget.width - draggedWidget.width, draggedWidget.x));
            draggedWidget.y = Math.max(0, Math.min(targetWidget.height - draggedWidget.height, draggedWidget.y));
            
            draggedWidget.parentId = targetId;
            console.log('Widget moved to panel:', targetId);
          }
        }
        
        this.updateWidgetInList(draggedWidget);
      });
    });
  }
  
  // 检查 ancestorId 是否是 widgetId 的祖先节点
  isDescendant(ancestorId, widgetId) {
    const ancestor = this.widgets.find(w => w.id === ancestorId);
    if (!ancestor) return false;
    
    // 检查所有子节点
    const checkChildren = (parentId) => {
      const children = this.widgets.filter(w => w.parentId === parentId);
      for (const child of children) {
        if (child.id === widgetId) return true;
        if (checkChildren(child.id)) return true;
      }
      return false;
    };
    
    return checkChildren(ancestorId);
  }

  getWidgetIcon(type) {
    const icons = {
      button: '🔘',
      label: '📝',
      textinput: '📄',
      slider: '🎚️',
      image: '🖼️',
      listview: '📋',
      gridview: '▦',      tableview: '📋',      combobox: '🔽',      slider: '🎚️',      checkbox: '☑️',      radiobutton: '🔘',      panel: '📦',
    };
    return icons[type] || '📦';
  }

  selectWidget(widget) {
    this.selectedWidget = widget;
    this.setFocusContext('canvas'); // 选中控件时设置焦点到画布
    this.renderWidgetList();
    if (widget) {
      properties.show(widget);
      canvasRenderer.selectWidget(widget.id);
    } else {
      this.selectCanvas();
    }
  }

  addWidgetToList(widget) {
    this.widgets.push(widget);
    this.renderWidgetList();
    this.updateCanvasWidgets();
    this.saveWidgets();
    
    // 选中新创建的控件
    this.selectWidget(widget);
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
      this.updateCanvasWidgets();
      this.saveWidgets();
    }
  }

  // 更新 canvas 的 widgets
  updateCanvasWidgets() {
    // 直接传递原始 widgets，不再添加 renderX/renderY
    // 避免与拖拽/缩放时的临时坐标冲突
    canvasRenderer.setWidgets(this.widgets);
  }

  removeWidgetFromList(id) {
    // 同时删除子控件
    const toDelete = [id];
    const findChildren = (parentId) => {
      const children = this.widgets.filter(w => w.parentId === parentId);
      children.forEach(child => {
        toDelete.push(child.id);
        if (child.type === 'panel') {
          findChildren(child.id);
        }
      });
    };
    
    const widget = this.widgets.find(w => w.id === id);
    if (widget && widget.type === 'panel') {
      findChildren(id);
    }
    
    this.widgets = this.widgets.filter(w => !toDelete.includes(w.id));
    this.renderWidgetList();
    this.updateCanvasWidgets();
    this.saveWidgets();
  }
  
  bringWidgetToFront() {
    if (!this.selectedWidget) {
      alert('请先选择一个控件');
      return;
    }
    
    // 找到当前最大的 zIndex
    const maxZIndex = Math.max(0, ...this.widgets.map(w => w.zIndex || 0));
    this.selectedWidget.zIndex = maxZIndex + 1;
    
    this.updateWidgetInList(this.selectedWidget);
    console.log('Widget brought to front, zIndex:', this.selectedWidget.zIndex);
  }
  
  sendWidgetToBack() {
    if (!this.selectedWidget) {
      alert('请先选择一个控件');
      return;
    }
    
    // 找到当前最小的 zIndex
    const minZIndex = Math.min(0, ...this.widgets.map(w => w.zIndex || 0));
    this.selectedWidget.zIndex = minZIndex - 1;
    
    this.updateWidgetInList(this.selectedWidget);
    console.log('Widget sent to back, zIndex:', this.selectedWidget.zIndex);
  }

  // 获取控件的绝对坐标（考虑父容器）
  getAbsolutePosition(widget) {
    let x = widget.x;
    let y = widget.y;
    
    if (widget.parentId) {
      const parent = this.widgets.find(w => w.id === widget.parentId);
      if (parent) {
        const parentPos = this.getAbsolutePosition(parent);
        x += parentPos.x;
        y += parentPos.y;
      }
    }
    
    return { x, y };
  }

  // 获取所有控件（包括子控件）用于渲染
  getAllWidgetsForRender() {
    return this.widgets.map(widget => {
      const absPos = this.getAbsolutePosition(widget);
      return {
        ...widget,
        renderX: absPos.x,
        renderY: absPos.y
      };
    });
  }
}

const app = new App();
