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
