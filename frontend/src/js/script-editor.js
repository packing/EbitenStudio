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
