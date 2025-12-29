# Phase 6: Monaco Editor集成

## 概述

Phase 6 将Monaco Editor集成到EbitenStudio的Electron前端中，为脚本编写提供专业的IDE级别编辑体验。

## 项目架构

```
EbitenStudio (Electron App)
├── Frontend (HTML/CSS/JS)
│   ├── Monaco Editor        ← Phase 6实现
│   ├── Canvas UI Renderer
│   └── Properties Panel
├── UI Runtime (Go)
│   ├── UI Control Library
│   ├── Script Engine (goja)
│   └── TypeScript Generator ← Phase 5已完成
└── Scripts (TypeScript)
    ├── *.ts (脚本文件)
    └── ui_types.d.ts (类型定义) ← 自动生成
```

## 设计目标

### 1. Monaco Editor集成
- 在Electron前端集成Monaco Editor
- 配置TypeScript语言支持
- 加载自动生成的类型定义

### 2. 智能编辑功能
- 代码自动补全（IntelliSense）
- 类型检查和错误提示
- 语法高亮
- 代码格式化
- 查找和替换

### 3. 文件管理
- 创建新脚本
- 打开现有脚本
- 保存脚本
- 脚本列表管理

### 4. 与UI编辑器集成
- 为选中的UI控件编辑脚本
- 实时更新类型定义
- 脚本与控件的关联

## 技术方案

### 1. Monaco Editor安装

```bash
cd frontend
npm install monaco-editor
npm install monaco-editor-webpack-plugin --save-dev
```

对于Electron应用，推荐使用AMD加载方式（无需webpack）：

```html
<!-- 直接从node_modules加载 -->
<script src="../node_modules/monaco-editor/min/vs/loader.js"></script>
<script>
    require.config({ 
        paths: { 
            'vs': '../node_modules/monaco-editor/min/vs' 
        } 
    });
    require(['vs/editor/editor.main'], function() {
        // Monaco已加载
    });
</script>
```

### 2. 文件结构

```
frontend/
├── src/
│   ├── script-editor.html      ← 新增：脚本编辑器页面
│   ├── js/
│   │   ├── script-editor.js    ← 新增：编辑器逻辑
│   │   ├── monaco-config.js    ← 新增：Monaco配置
│   │   └── script-manager.js   ← 新增：脚本管理
│   └── styles/
│       └── script-editor.css   ← 新增：编辑器样式
└── scripts/                     ← 新增：脚本存储目录
    ├── ui_types.d.ts           ← 类型定义（自动生成）
    └── *.ts                    ← 用户脚本
```

### 3. 脚本编辑器界面

```
┌─────────────────────────────────────────────┐
│ Script Editor                      [X]       │
├─────────────┬───────────────────────────────┤
│             │                               │
│ Scripts     │  // TypeScript Code          │
│ ├─ button1  │  const button1 = {           │
│ ├─ label1   │      onClick(self, event) {  │
│ └─ panel1   │          console.log(...);   │
│             │      }                        │
│ [+ New]     │  };                          │
│ [Delete]    │                               │
│             │  [Errors: 0] [Warnings: 0]   │
├─────────────┴───────────────────────────────┤
│ [Save] [Format] [Validate]  Widget: button1 │
└─────────────────────────────────────────────┘
```

## 实现步骤

### Step 1: 创建脚本编辑器页面

**script-editor.html**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Script Editor</title>
    <link rel="stylesheet" href="styles/script-editor.css">
</head>
<body>
    <div class="editor-container">
        <!-- 侧边栏 - 脚本列表 -->
        <div class="sidebar">
            <h3>Scripts</h3>
            <div id="script-list"></div>
            <div class="sidebar-buttons">
                <button id="btn-new-script">+ New Script</button>
                <button id="btn-delete-script">Delete</button>
            </div>
        </div>

        <!-- 编辑器区域 -->
        <div class="editor-area">
            <div id="editor-container"></div>
            <div class="status-bar">
                <span id="error-count">Errors: 0</span>
                <span id="warning-count">Warnings: 0</span>
                <span id="current-widget">Widget: None</span>
            </div>
        </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="toolbar">
        <button id="btn-save">Save</button>
        <button id="btn-format">Format</button>
        <button id="btn-validate">Validate</button>
        <button id="btn-reload-types">Reload Types</button>
    </div>

    <!-- Monaco Loader -->
    <script src="../node_modules/monaco-editor/min/vs/loader.js"></script>
    <script src="js/monaco-config.js"></script>
    <script src="js/script-manager.js"></script>
    <script src="js/script-editor.js"></script>
</body>
</html>
```

### Step 2: Monaco配置

**js/monaco-config.js**

```javascript
// Monaco Editor配置
const MonacoConfig = {
    // 初始化Monaco
    async init() {
        return new Promise((resolve, reject) => {
            require.config({ 
                paths: { 
                    'vs': '../node_modules/monaco-editor/min/vs' 
                } 
            });
            
            require(['vs/editor/editor.main'], function() {
                console.log('Monaco Editor loaded');
                resolve();
            }, reject);
        });
    },

    // 创建编辑器实例
    createEditor(container, options = {}) {
        const defaultOptions = {
            value: '',
            language: 'typescript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            tabSize: 4,
            insertSpaces: true,
            
            // TypeScript特定选项
            'typescript.suggest.completeFunctionCalls': true,
            'typescript.validate.enable': true,
        };

        return monaco.editor.create(
            container, 
            { ...defaultOptions, ...options }
        );
    },

    // 加载类型定义
    async loadTypeDefinitions(typesContent) {
        // 添加额外的TypeScript库
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            typesContent,
            'file:///ui_types.d.ts'
        );

        console.log('Type definitions loaded');
    },

    // 配置TypeScript编译选项
    configureTypeScript() {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types']
        });

        // 配置诊断选项
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            onlyVisible: false
        });
    },

    // 获取错误和警告
    async getMarkers(model) {
        const markers = monaco.editor.getModelMarkers({ 
            resource: model.uri 
        });

        const errors = markers.filter(m => m.severity === monaco.MarkerSeverity.Error);
        const warnings = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning);

        return { errors, warnings, markers };
    }
};
```

### Step 3: 脚本管理器

**js/script-manager.js**

```javascript
// 脚本文件管理
const ScriptManager = {
    currentScript: null,
    scriptsDir: 'scripts',

    // 初始化
    async init() {
        // 确保脚本目录存在
        await window.api.ensureDir(this.scriptsDir);
    },

    // 获取所有脚本列表
    async listScripts() {
        const files = await window.api.readDir(this.scriptsDir);
        return files.filter(f => f.endsWith('.ts') && f !== 'ui_types.d.ts');
    },

    // 读取脚本内容
    async readScript(filename) {
        const path = `${this.scriptsDir}/${filename}`;
        return await window.api.readFile(path);
    },

    // 保存脚本
    async saveScript(filename, content) {
        const path = `${this.scriptsDir}/${filename}`;
        await window.api.writeFile(path, content);
        console.log(`Saved: ${filename}`);
    },

    // 创建新脚本
    async createScript(widgetId) {
        const filename = `${widgetId}.ts`;
        const template = this.getScriptTemplate(widgetId);
        await this.saveScript(filename, template);
        return filename;
    },

    // 删除脚本
    async deleteScript(filename) {
        const path = `${this.scriptsDir}/${filename}`;
        await window.api.deleteFile(path);
        console.log(`Deleted: ${filename}`);
    },

    // 加载类型定义
    async loadTypeDefinitions() {
        const path = `${this.scriptsDir}/ui_types.d.ts`;
        try {
            return await window.api.readFile(path);
        } catch (error) {
            console.warn('Type definitions not found, using empty string');
            return '';
        }
    },

    // 获取脚本模板
    getScriptTemplate(widgetId) {
        return `/**
 * Script for widget: ${widgetId}
 * Auto-generated template
 */

const ${widgetId} = {
    /**
     * Click event handler
     * @param self - The widget itself
     * @param event - The click event
     */
    onClick(self: UIButton, event: ButtonClickEvent) {
        console.log('${widgetId} clicked');
        
        // Add your code here
    },

    /**
     * Hover event handler
     */
    onHover(self: UIButton, event: HoverEvent) {
        // Add your code here
    }
};
`;
    }
};
```

### Step 4: 主编辑器逻辑

**js/script-editor.js**

```javascript
// 脚本编辑器主逻辑
class ScriptEditor {
    constructor() {
        this.editor = null;
        this.currentFile = null;
    }

    // 初始化
    async init() {
        console.log('Initializing Script Editor...');

        // 初始化Monaco
        await MonacoConfig.init();
        MonacoConfig.configureTypeScript();

        // 创建编辑器实例
        const container = document.getElementById('editor-container');
        this.editor = MonacoConfig.createEditor(container);

        // 初始化脚本管理器
        await ScriptManager.init();

        // 加载类型定义
        await this.loadTypes();

        // 加载脚本列表
        await this.refreshScriptList();

        // 绑定事件
        this.bindEvents();

        // 监听编辑器变化
        this.editor.onDidChangeModelContent(() => {
            this.onContentChanged();
        });

        console.log('Script Editor initialized');
    }

    // 加载类型定义
    async loadTypes() {
        const types = await ScriptManager.loadTypeDefinitions();
        if (types) {
            await MonacoConfig.loadTypeDefinitions(types);
            console.log('Types loaded successfully');
        }
    }

    // 刷新脚本列表
    async refreshScriptList() {
        const scripts = await ScriptManager.listScripts();
        const listContainer = document.getElementById('script-list');
        
        listContainer.innerHTML = '';
        
        scripts.forEach(script => {
            const item = document.createElement('div');
            item.className = 'script-item';
            item.textContent = script;
            item.onclick = () => this.openScript(script);
            listContainer.appendChild(item);
        });
    }

    // 打开脚本
    async openScript(filename) {
        const content = await ScriptManager.readScript(filename);
        this.editor.setValue(content);
        this.currentFile = filename;
        
        document.getElementById('current-widget').textContent = 
            `Widget: ${filename.replace('.ts', '')}`;
        
        // 更新选中状态
        document.querySelectorAll('.script-item').forEach(item => {
            item.classList.toggle('active', item.textContent === filename);
        });

        await this.updateMarkers();
    }

    // 保存当前脚本
    async saveScript() {
        if (!this.currentFile) {
            alert('No script opened');
            return;
        }

        const content = this.editor.getValue();
        await ScriptManager.saveScript(this.currentFile, content);
        alert('Script saved');
    }

    // 创建新脚本
    async createNewScript() {
        const widgetId = prompt('Enter widget ID:');
        if (!widgetId) return;

        const filename = await ScriptManager.createScript(widgetId);
        await this.refreshScriptList();
        await this.openScript(filename);
    }

    // 删除脚本
    async deleteScript() {
        if (!this.currentFile) {
            alert('No script selected');
            return;
        }

        if (!confirm(`Delete ${this.currentFile}?`)) return;

        await ScriptManager.deleteScript(this.currentFile);
        this.editor.setValue('');
        this.currentFile = null;
        await this.refreshScriptList();
    }

    // 格式化代码
    async formatCode() {
        await this.editor.getAction('editor.action.formatDocument').run();
    }

    // 验证代码
    async validateCode() {
        const model = this.editor.getModel();
        const { errors, warnings } = await MonacoConfig.getMarkers(model);

        if (errors.length === 0) {
            alert('No errors found!');
        } else {
            const msg = errors.map(e => 
                `Line ${e.startLineNumber}: ${e.message}`
            ).join('\n');
            alert(`Errors:\n${msg}`);
        }
    }

    // 内容变化时更新标记
    async onContentChanged() {
        await this.updateMarkers();
    }

    // 更新错误和警告计数
    async updateMarkers() {
        const model = this.editor.getModel();
        if (!model) return;

        const { errors, warnings } = await MonacoConfig.getMarkers(model);

        document.getElementById('error-count').textContent = 
            `Errors: ${errors.length}`;
        document.getElementById('warning-count').textContent = 
            `Warnings: ${warnings.length}`;
    }

    // 绑定事件
    bindEvents() {
        document.getElementById('btn-save').onclick = () => this.saveScript();
        document.getElementById('btn-format').onclick = () => this.formatCode();
        document.getElementById('btn-validate').onclick = () => this.validateCode();
        document.getElementById('btn-new-script').onclick = () => this.createNewScript();
        document.getElementById('btn-delete-script').onclick = () => this.deleteScript();
        document.getElementById('btn-reload-types').onclick = () => this.loadTypes();
    }
}

// 启动编辑器
window.addEventListener('DOMContentLoaded', async () => {
    const editor = new ScriptEditor();
    await editor.init();
});
```

### Step 5: 样式文件

**styles/script-editor.css**

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #1e1e1e;
    color: #d4d4d4;
    overflow: hidden;
}

.editor-container {
    display: flex;
    height: calc(100vh - 40px);
}

/* 侧边栏 */
.sidebar {
    width: 200px;
    background: #252526;
    border-right: 1px solid #3e3e42;
    display: flex;
    flex-direction: column;
}

.sidebar h3 {
    padding: 10px;
    background: #2d2d30;
    font-size: 14px;
    border-bottom: 1px solid #3e3e42;
}

#script-list {
    flex: 1;
    overflow-y: auto;
}

.script-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    border-bottom: 1px solid #2d2d30;
}

.script-item:hover {
    background: #2a2d2e;
}

.script-item.active {
    background: #094771;
    color: #fff;
}

.sidebar-buttons {
    padding: 10px;
    border-top: 1px solid #3e3e42;
}

.sidebar-buttons button {
    width: 100%;
    padding: 6px;
    margin-bottom: 5px;
    background: #0e639c;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 12px;
}

.sidebar-buttons button:hover {
    background: #1177bb;
}

/* 编辑器区域 */
.editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
}

#editor-container {
    flex: 1;
}

.status-bar {
    height: 24px;
    background: #007acc;
    color: white;
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-size: 12px;
}

.status-bar span {
    margin-right: 20px;
}

/* 工具栏 */
.toolbar {
    height: 40px;
    background: #2d2d30;
    border-top: 1px solid #3e3e42;
    display: flex;
    align-items: center;
    padding: 0 10px;
    gap: 10px;
}

.toolbar button {
    padding: 6px 12px;
    background: #0e639c;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 13px;
}

.toolbar button:hover {
    background: #1177bb;
}

/* 滚动条样式 */
::-webkit-scrollbar {
    width: 10px;
}

::-webkit-scrollbar-track {
    background: #1e1e1e;
}

::-webkit-scrollbar-thumb {
    background: #424242;
}

::-webkit-scrollbar-thumb:hover {
    background: #4e4e4e;
}
```

### Step 6: Preload API扩展

需要在`preload.js`中添加文件操作API：

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // 读取目录
    readDir: (path) => ipcRenderer.invoke('read-dir', path),
    
    // 读取文件
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    
    // 写入文件
    writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
    
    // 删除文件
    deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
    
    // 确保目录存在
    ensureDir: (path) => ipcRenderer.invoke('ensure-dir', path),
});
```

### Step 7: Main进程处理

在`main.js`中添加IPC处理器：

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// 文件操作处理器
ipcMain.handle('read-dir', async (event, dirPath) => {
    const fullPath = path.join(__dirname, dirPath);
    return await fs.readdir(fullPath);
});

ipcMain.handle('read-file', async (event, filePath) => {
    const fullPath = path.join(__dirname, filePath);
    return await fs.readFile(fullPath, 'utf-8');
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    const fullPath = path.join(__dirname, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
});

ipcMain.handle('delete-file', async (event, filePath) => {
    const fullPath = path.join(__dirname, filePath);
    await fs.unlink(fullPath);
});

ipcMain.handle('ensure-dir', async (event, dirPath) => {
    const fullPath = path.join(__dirname, dirPath);
    await fs.mkdir(fullPath, { recursive: true });
});
```

## 集成到主界面

在主界面添加"脚本编辑器"菜单项：

```javascript
// 在菜单或工具栏中添加
function openScriptEditor() {
    const editorWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    editorWindow.loadFile('src/script-editor.html');
}
```

## 使用流程

1. **启动编辑器**：从主界面打开脚本编辑器
2. **创建脚本**：点击"+ New Script"，输入控件ID
3. **编辑代码**：使用Monaco编辑器编写TypeScript代码
   - 自动补全会显示所有可用的控件方法
   - 类型错误会实时显示
4. **保存脚本**：点击"Save"保存到文件
5. **格式化**：点击"Format"自动格式化代码
6. **验证**：点击"Validate"检查错误

## 优势

1. **专业体验**：Monaco是VS Code的核心，提供完整IDE功能
2. **类型安全**：加载Phase 5生成的类型定义，完整智能提示
3. **实时反馈**：即时错误检查和警告
4. **易于集成**：纯前端实现，无需后端编译
5. **可扩展**：可以添加更多Monaco功能（代码片段、命令面板等）

## 后续扩展

- 多标签页支持（同时编辑多个脚本）
- 代码片段（Snippets）
- 快捷键配置
- 调试支持（与预览窗口联动）
- Git集成
- 主题切换

## 总结

Phase 6 完成后，开发者可以在EbitenStudio中直接编写脚本，享受完整的TypeScript开发体验，无需切换到外部编辑器。
