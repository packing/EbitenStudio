class Preview {
  constructor() {
    this.viewerProcess = null;
    this.tempLayoutPath = null;
    this.packer = new ResourcePacker();
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loadingText = document.querySelector('.loading-text');
    this.setupEventListeners();
  }

  showLoading(message = '正在处理...') {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'flex';
    }
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }

  setupEventListeners() {
    // 预览按钮
    document.getElementById('btn-preview')?.addEventListener('click', () => {
      this.launchPreview();
    });

    // 导出按钮 - 导出为.ui + .pak
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.exportUIPackage();
    });
  }

  /**
   * 生成UI布局数据（用于导出）
   * 资源只记录ID，不记录路径
   * @param {string} resourcePackHash - 资源包哈希
   * @param {string} defaultFontId - 默认字体ID（可选）
   */
  generateUILayoutData(resourcePackHash, defaultFontId = null) {
    const widgets = window.app?.widgets || [];
    
    // 需要文本绘制的控件类型
    const textWidgetTypes = ['button', 'label', 'textinput', 'checkbox', 'radiobutton', 'combobox'];

    // 构建widgets数组
    const widgetDataList = widgets.map(widget => {
      const data = {
        id: widget.id,
        type: widget.type,
        parentId: widget.parentId || '',
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
        
        // 锚点定位系统
        positionMode: widget.positionMode || 'absolute',
        anchorX: widget.anchorX || 'left',
        anchorY: widget.anchorY || 'top',
        offsetX: widget.offsetX || 0,
        offsetY: widget.offsetY || 0,
        
        // 边界锚定系统
        anchorLeft: widget.anchorLeft || false,
        anchorRight: widget.anchorRight || false,
        anchorTop: widget.anchorTop || false,
        anchorBottom: widget.anchorBottom || false,
        designMarginRight: widget.designMarginRight || 0,
        designMarginBottom: widget.designMarginBottom || 0,
        
        zIndex: widget.zIndex || 0,
        visible: widget.visible !== false,
        interactive: widget.interactive !== false,
        
        // 背景和边框
        backgroundColor: widget.backgroundColor || '#ffffff',
        backgroundColorAlpha: widget.backgroundColorAlpha ?? 255,
        borderWidth: widget.borderWidth || 0,
        borderColor: widget.borderColor || '#000000',
        borderColorAlpha: widget.borderColorAlpha ?? 255,
        borderRadius: widget.borderRadius || 0,
        opacity: widget.opacity ?? 100,
        
        // Padding和Margin
        padding: widget.padding || { top: 0, right: 0, bottom: 0, left: 0 },
        margin: widget.margin || { top: 0, right: 0, bottom: 0, left: 0 },
        
        // 背景资源 - 只记录ID，转为字符串
        backgroundResourceId: widget.backgroundResourceId ? String(widget.backgroundResourceId) : ''
      };

      // 根据控件类型添加特定属性
      switch (widget.type) {
        case 'button':
          Object.assign(data, {
            text: widget.text || 'Button',
            textColor: widget.textColor || '#ffffff',
            textColorAlpha: widget.textColorAlpha ?? 255,
            fontSize: widget.fontSize || 16,
            textAlignment: widget.textAlignment || 'center',
            
            // 三态背景 - 只记录ID
            backgroundColorNormal: widget.backgroundColorNormal || '#4287f5',
            backgroundColorNormalAlpha: widget.backgroundColorNormalAlpha ?? 255,
            backgroundColorPressed: widget.backgroundColorPressed || '#3670d9',
            backgroundColorPressedAlpha: widget.backgroundColorPressedAlpha ?? 255,
            backgroundColorDisabled: widget.backgroundColorDisabled || '#999999',
            backgroundColorDisabledAlpha: widget.backgroundColorDisabledAlpha ?? 255,
            
            backgroundResourceNormal: widget.backgroundResourceNormal ? String(widget.backgroundResourceNormal) : '',
            backgroundResourcePressed: widget.backgroundResourcePressed ? String(widget.backgroundResourcePressed) : '',
            backgroundResourceDisabled: widget.backgroundResourceDisabled ? String(widget.backgroundResourceDisabled) : '',
            
            enabled: widget.enabled !== false
          });
          break;

        case 'label':
          Object.assign(data, {
            text: widget.text || 'Label',
            textColor: widget.textColor || '#000000',
            textColorAlpha: widget.textColorAlpha ?? 255,
            fontSize: widget.fontSize || 14,
            textAlignment: widget.textAlign || 'left',  // 注意：widget 中是 textAlign，UI 文件中是 textAlignment
            verticalAlign: widget.verticalAlign || 'middle',
            wordWrap: widget.wordWrap || false
          });
          break;

        case 'textinput':
          Object.assign(data, {
            text: widget.text || '',
            placeholderText: widget.placeholderText || 'Enter text...',
            textColor: widget.textColor || '#000000',
            textColorAlpha: widget.textColorAlpha ?? 255,
            fontSize: widget.fontSize || 14,
            maxLength: widget.maxLength || 100,
            
            // 三态背景 - 只记录ID
            backgroundColorNormal: widget.backgroundColorNormal || '#ffffff',
            backgroundColorNormalAlpha: widget.backgroundColorNormalAlpha ?? 255,
            backgroundColorEditing: widget.backgroundColorEditing || '#fffff0',
            backgroundColorEditingAlpha: widget.backgroundColorEditingAlpha ?? 255,
            backgroundColorDisabled: widget.backgroundColorDisabled || '#f0f0f0',
            backgroundColorDisabledAlpha: widget.backgroundColorDisabledAlpha ?? 255,
            
            backgroundResourceNormal: widget.backgroundResourceNormal ? String(widget.backgroundResourceNormal) : '',
            backgroundResourceEditing: widget.backgroundResourceEditing ? String(widget.backgroundResourceEditing) : '',
            backgroundResourceDisabled: widget.backgroundResourceDisabled ? String(widget.backgroundResourceDisabled) : '',
            
            enabled: widget.enabled !== false
          });
          break;

        case 'image':
          Object.assign(data, {
            imageResourceId: widget.resourceId ? String(widget.resourceId) : '',
            scaleMode: widget.scaleMode || 'fit',
            clipX: widget.clipX || 0,
            clipY: widget.clipY || 0,
            clipWidth: widget.clipWidth || 0,
            clipHeight: widget.clipHeight || 0
          });
          break;

        case 'slider':
          Object.assign(data, {
            minValue: widget.minValue || 0,
            maxValue: widget.maxValue || 100,
            currentValue: widget.currentValue || 50,
            orientation: widget.orientation || 'horizontal'
          });
          break;

        case 'listview':
        case 'gridview':
          Object.assign(data, {
            items: widget.items || []
          });
          break;

        case 'tableview':
          Object.assign(data, {
            columns: widget.columns || [],
            items: widget.items || []
          });
          break;

        case 'combobox':
          Object.assign(data, {
            items: widget.items || [],
            selectedIndex: widget.selectedIndex !== undefined ? widget.selectedIndex : -1,
            placeholderText: widget.placeholderText || '请选择...',
            maxVisibleItems: widget.maxVisibleItems || 5,
            itemHeight: widget.itemHeight || 30,
            isExpanded: widget.isExpanded || false
          });
          break;

        case 'slider':
          Object.assign(data, {
            minValue: widget.minValue !== undefined ? widget.minValue : 0,
            maxValue: widget.maxValue !== undefined ? widget.maxValue : 100,
            value: widget.value !== undefined ? widget.value : 50,
            step: widget.step !== undefined ? widget.step : 1,
            orientation: widget.orientation || 'horizontal',
            trackHeight: widget.trackHeight || 6,
            thumbSize: widget.thumbSize || 16,
            showValue: widget.showValue !== false
          });
          break;

        case 'checkbox':
          Object.assign(data, {
            text: widget.text || '复选框',
            checked: widget.checked || false,
            boxSize: widget.boxSize || 18
          });
          break;

        case 'radiobutton':
          Object.assign(data, {
            text: widget.text || '单选按钮',
            groupName: widget.groupName || 'default',
            selected: widget.selected || false,
            buttonSize: widget.buttonSize || 18
          });
          break;

        case 'panel':
          // Panel没有特殊属性
          break;
      }
      
      // 自动为需要文本绘制的控件设置默认字体（如果没有指定且提供了默认字体ID）
      if (defaultFontId && textWidgetTypes.includes(widget.type)) {
        if (!data.fontResourceId || data.fontResourceId === '') {
          data.fontResourceId = defaultFontId;
        }
      }

      return data;
    });

    return {
      name: 'UI Layout',
      version: 1,
      width: window.app?.canvasConfig?.width || 1280,
      height: window.app?.canvasConfig?.height || 720,
      resourcePackHash: resourcePackHash || '',
      widgets: widgetDataList,
      scripts: {} // 脚本数据将在导出时填充
    };
  }

  /**
   * 收集所有控件关联的脚本文件内容
   * @returns {Promise<Object>} 脚本映射 { widgetId: scriptCode }
   */
  async collectScripts() {
    const widgets = window.app?.widgets || [];
    const scripts = {};
    
    for (const widget of widgets) {
      if (widget.scriptFile) {
        try {
          const scriptsDir = await window.app.getProjectScriptsDir();
          if (scriptsDir) {
            const scriptPath = await window.electronAPI.path.join(scriptsDir, widget.scriptFile);
            
            // 检查是否是 TypeScript 文件
            if (widget.scriptFile.endsWith('.ts')) {
              console.log(`[Preview] Compiling TypeScript for ${widget.id}: ${widget.scriptFile}`);
              const result = await window.electronAPI.compileTypeScript(scriptPath);
              
              if (result.success) {
                scripts[widget.id] = result.code;
                console.log(`[Preview] TypeScript compiled for ${widget.id}, output length: ${result.code.length}`);
              } else {
                console.error(`[Preview] Failed to compile TypeScript for ${widget.id}:`, result.error);
              }
            } else {
              // 直接读取 JavaScript 文件
              const content = await window.electronAPI.readFile(scriptPath);
              scripts[widget.id] = content;
              console.log(`[Preview] Collected script for ${widget.id}: ${widget.scriptFile}`);
            }
          }
        } catch (error) {
          console.warn(`Failed to load script for ${widget.id}:`, error);
        }
      }
    }
    
    return scripts;
  }

  /**
   * 生成项目数据（用于保存项目）
   * 包含资源的硬盘路径
   */
  generateProjectData() {
    const resources = window.resourceManager?.getAllResources() || { images: [], fonts: [] };
    
    const layoutData = this.generateUILayoutData(''); // 项目保存不需要hash
    
    // 添加资源路径信息
    const resourceMap = {};
    resources.images.forEach(img => {
      resourceMap[img.id] = {
        type: 'image',
        path: img.path,
        name: img.name,
        data: img.data // base64数据（如果有）
      };
    });
    
    return {
      ...layoutData,
      projectVersion: 1,
      resources: resourceMap // 项目保存时包含路径
    };
  }

  /**
   * 启动预览（导出到临时文件再用viewer加载）
   */
  async launchPreview() {
    console.log('[Preview] Starting preview...');
    this.showLoading('正在打包资源，请稍候...');
    
    try {
      // 0. 自动添加默认字体
      const defaultFontId = 'default_msyh_font';
      const defaultFontPath = '../public/msyh.ttf';  // 相对于 src/index.html 的路径
      
      const resources = window.resourceManager?.getAllResources() || { images: [], fonts: [] };
      console.log('[Preview] Initial resources:', resources);
      console.log('[Preview] Fonts count:', resources.fonts.length);
      
      // 检查是否已经有这个字体资源
      const hasDefaultFont = resources.fonts.some(f => f.id === defaultFontId);
      console.log('[Preview] Has default font:', hasDefaultFont);
      
      if (!hasDefaultFont) {
        // 添加默认字体
        console.log('[Preview] Fetching font from:', defaultFontPath);
        try {
          const response = await fetch(defaultFontPath);
          if (!response.ok) {
            console.error('[Preview] Font fetch failed:', response.status, response.statusText);
          } else {
            console.log('[Preview] Font fetched successfully, size:', response.headers.get('content-length'));
            const blob = await response.blob();
            console.log('[Preview] Blob size:', blob.size);
            const reader = new FileReader();
            
            await new Promise((resolve, reject) => {
              reader.onload = () => {
                const fontResource = {
                  id: defaultFontId,
                  name: 'msyh.ttf',
                  fontName: 'msyh',
                  path: defaultFontPath,
                  type: 'font',
                  data: reader.result
                };
                // 直接添加到 resourceManager.resources.fonts 数组
                if (window.resourceManager) {
                  window.resourceManager.resources.fonts.push(fontResource);
                  console.log('[Preview] Default font added to resourceManager:', defaultFontId);
                  console.log('[Preview] Font data length:', reader.result.length);
                }
                resolve();
              };
              reader.onerror = (e) => {
                console.error('[Preview] FileReader error:', e);
                reject(e);
              };
              reader.readAsDataURL(blob);
            });
          }
        } catch (err) {
          console.error('[Preview] 无法加载默认字体 msyh.ttf:', err);
        }
      }
      
      // 1. 打包资源（重新获取，因为可能添加了字体）
      const updatedResources = window.resourceManager?.getAllResources() || { images: [], fonts: [] };
      console.log('[Preview] Updated resources after font loading:');
      console.log('[Preview]   - Images:', updatedResources.images.length);
      console.log('[Preview]   - Fonts:', updatedResources.fonts.length);
      if (updatedResources.fonts.length > 0) {
        console.log('[Preview]   - Font IDs:', updatedResources.fonts.map(f => f.id));
      }
      console.log('[Preview] Packing resources...');
      // 合并图片和字体资源
      const allResources = [...updatedResources.images, ...updatedResources.fonts];
      console.log('[Preview] Total resources to pack:', allResources.length);
      const packResult = await this.packer.packResources(allResources);
      const { pakData, manifest, hash } = packResult;
      console.log('[Preview] Pack result - hash:', hash, 'pakData size:', pakData.byteLength, 'manifest:', manifest);
      
      // 2. 生成UI定义文件（传递defaultFontId）
      const uiData = this.generateUILayoutData(hash, defaultFontId);
      uiData.resourceManifest = manifest;
      
      // 3. 收集脚本文件
      console.log('[Preview] Collecting scripts...');
      const scripts = await this.collectScripts();
      uiData.scripts = scripts;
      console.log('[Preview] Collected scripts:', Object.keys(scripts));
      
      const uiJsonStr = JSON.stringify(uiData, null, 2);
      console.log('[Preview] UI data generated, length:', uiJsonStr.length);

      // 使用 Electron IPC 调用 Go viewer
      if (window.electronAPI && window.electronAPI.launchViewerWithPak) {
        console.log('[Preview] Calling launchViewerWithPak...');
        // 将ArrayBuffer转换为Array以便IPC传递
        const pakArray = Array.from(new Uint8Array(pakData));
        console.log('[Preview] pakArray length:', pakArray.length);
        
        const result = await window.electronAPI.launchViewerWithPak({
          uiData: uiJsonStr,
          pakData: pakArray,
          hash: hash
        });
        console.log('[Preview] IPC result:', result);
        this.hideLoading();
        if (!result.success) {
          alert(`预览失败: ${result.error}`);
        } else {
          console.log('[Preview] Viewer launched successfully');
        }
      } else {
        // 非 Electron 环境或旧版本API，使用旧方法
        this.hideLoading();
        console.warn('launchViewerWithPak not available, using legacy method');
        const layoutData = this.generateProjectData();
        const jsonStr = JSON.stringify(layoutData, null, 2);
        this.downloadJSON(jsonStr, 'preview_layout.json');
        alert('预览功能需要在Electron环境中运行。\nJSON文件已下载，请手动运行: go run main.go -layout preview_layout.json');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Preview error:', error);
      alert(`预览失败: ${error.message}`);
    }
  }

  /**
   * 导出UI包（.ui + .pak文件）
   */
  async exportUIPackage() {
    this.showLoading('正在打包导出，请稍候...');
    
    try {
      // 0. 自动添加默认字体到资源管理器（如果还没有）
      const defaultFontId = 'default_msyh_font';
      const defaultFontPath = '../public/msyh.ttf';  // 相对于 src/index.html 的路径
      
      const resources = window.resourceManager?.getAllResources() || { images: [], fonts: [] };
      
      // 检查是否已经有这个字体资源
      const hasDefaultFont = resources.fonts.some(f => f.id === defaultFontId);
      
      if (!hasDefaultFont) {
        // 添加默认字体（模拟从文件加载）
        try {
          const response = await fetch(defaultFontPath);
          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise((resolve, reject) => {
            reader.onload = () => {
              const fontResource = {
                id: defaultFontId,
                name: 'msyh.ttf',
                fontName: 'msyh',
                path: defaultFontPath,
                type: 'font',
                data: reader.result // base64
              };
              // 直接添加到 resourceManager.resources.fonts 数组
              if (window.resourceManager) {
                window.resourceManager.resources.fonts.push(fontResource);
              }
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.warn('无法加载默认字体 msyh.ttf:', err);
        }
      }
      
      // 1. 打包资源
      // 合并图片和字体资源
      const allResources = [...resources.images, ...resources.fonts];
      const packResult = await this.packer.packResources(allResources);
      const { pakData, manifest, hash } = packResult;
      
      // 2. 生成UI定义文件（会自动为文本控件设置字体）
      const uiData = this.generateUILayoutData(hash, defaultFontId);
      uiData.resourceManifest = manifest; // 包含资源清单
      
      // 3. 收集脚本文件
      console.log('[Export] Collecting scripts...');
      const scripts = await this.collectScripts();
      uiData.scripts = scripts;
      console.log('[Export] Collected scripts:', Object.keys(scripts));
      
      const uiJsonStr = JSON.stringify(uiData, null, 2);

      if (window.electronAPI && window.electronAPI.exportUIPackage) {
        // 使用 Electron 导出
        const result = await window.electronAPI.exportUIPackage({
          uiData: uiJsonStr,
          pakData: pakData,
          hash: hash
        });
        
        if (result.success) {
          alert(`UI包导出成功！\n.ui文件: ${result.uiPath}\n.pak文件: ${result.pakPath}`);
        } else if (!result.cancelled) {
          alert(`导出失败: ${result.error}`);
        }
      } else {
        // 浏览器环境，下载文件
        const baseName = 'exported_ui';
        this.downloadJSON(uiJsonStr, `${baseName}.ui`);
        this.downloadBlob(new Blob([pakData]), `${baseName}_${hash.substring(0, 8)}.pak`);
        this.hideLoading();
        alert('UI包已导出！\n请确保.ui文件和.pak文件在同一目录。');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Export UI package error:', error);
      alert(`导出失败: ${error.message}`);
    }
  }

  /**
   * 浏览器下载JSON文件
   */
  downloadJSON(jsonStr, filename) {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  }

  /**
   * 浏览器下载Blob
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 初始化
const preview = new Preview();
window.preview = preview;
