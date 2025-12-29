/**
 * 脚本集成模块 - 管理脚本文件与外部编辑器
 */
class ScriptIntegration {
    constructor() {
        this.config = this.getDefaultConfig();
        this.loadConfig();
    }

    /**
     * 默认配置
     */
    getDefaultConfig() {
        return {
            externalEditor: {
                enabled: true,
                command: 'code',  // VS Code
                args: ['--goto', '{file}:{line}:{column}'],
                fallbacks: [
                    {
                        name: 'VS Code',
                        command: 'code',
                        windows: 'C:\\Program Files\\Microsoft VS Code\\Code.exe'
                    },
                    {
                        name: 'Sublime Text',
                        command: 'subl',
                        windows: 'C:\\Program Files\\Sublime Text\\sublime_text.exe'
                    }
                ]
            },
            scriptsDirectory: 'scripts'
        };
    }

    /**
     * 加载配置
     */
    async loadConfig() {
        try {
            const config = await window.electronAPI.readFile('.ebitenstudio/config.json');
            this.config = JSON.parse(config);
        } catch (error) {
            console.log('Using default config');
        }
    }

    /**
     * 获取当前项目的脚本目录
     * @returns {Promise<string|null>} 返回脚本目录路径，项目未保存时返回 null
     */
    async getScriptsDir() {
        if (!window.app || !window.app.getProjectScriptsDir) {
            console.error('App instance not available');
            return null;
        }
        return await window.app.getProjectScriptsDir();
    }

    /**
     * 获取所有可用的脚本文件
     */
    async getAvailableScripts() {
        const scriptsDir = await this.getScriptsDir();
        if (!scriptsDir) {
            return []; // 项目未保存
        }
        
        try {
            const files = await window.electronAPI.readDir(scriptsDir);
            return files.filter(f => f.endsWith('.ts') && f !== 'ui_types.d.ts');
        } catch (error) {
            console.error('Failed to read scripts directory:', error);
            return [];
        }
    }

    /**
     * 打开脚本文件到外部编辑器
     * @param {string} scriptFile - 脚本文件名
     * @param {number} line - 跳转到的行号
     */
    async openInExternalEditor(scriptFile, line = 1) {
        const scriptsDir = await this.getScriptsDir();
        if (!scriptsDir) {
            alert('请先保存项目后再编辑脚本');
            return;
        }
        
        const scriptPath = `${scriptsDir}/${scriptFile}`;
        
        const editor = this.config.externalEditor;
        
        if (editor.enabled) {
            try {
                // 替换参数中的占位符
                const args = editor.args.map(arg => 
                    arg.replace('{file}', scriptPath)
                       .replace('{line}', line.toString())
                       .replace('{column}', '1')
                );

                // 尝试打开编辑器
                const result = await window.electronAPI.openExternalEditor(editor.command, args);
                
                if (result.success) {
                    console.log(`Opened ${scriptFile} in ${editor.command}`);
                    return true;
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Failed to open external editor:', error);
                return await this.tryFallbackEditors(scriptPath);
            }
        } else {
            // 使用系统默认编辑器
            const result = await window.electronAPI.openWithDefault(scriptPath);
            return result.success;
        }
    }

    /**
     * 尝试备选编辑器
     */
    async tryFallbackEditors(scriptPath) {
        for (const fallback of this.config.externalEditor.fallbacks) {
            try {
                // 在Windows上尝试完整路径
                const result = await window.electronAPI.openExternalEditor(
                    fallback.windows || fallback.command, 
                    [scriptPath]
                );
                
                if (result.success) {
                    console.log(`Opened with fallback: ${fallback.name}`);
                    return true;
                }
            } catch (error) {
                // 继续尝试下一个
                continue;
            }
        }

        // 所有方法都失败
        alert('未找到可用的代码编辑器。\n\n请安装VS Code或配置外部编辑器。\n\n你也可以手动打开文件：\n' + scriptPath);
        return false;
    }

    /**
     * 创建或更新脚本文件
     * @param {string} widgetId - 控件ID
     * @param {string} widgetType - 控件类型
     * @param {Array<string>} events - 选中的事件列表
     */
    async createNewScript(widgetId, widgetType, events) {
        const scriptsDir = await this.getScriptsDir();
        if (!scriptsDir) {
            alert('请先保存项目后再创建脚本');
            return null;
        }
        
        const fileName = `${widgetId}.ts`;
        const scriptPath = `${scriptsDir}/${fileName}`;
        
        try {
            // 确保 scripts 目录存在
            await window.electronAPI.ensureDir(scriptsDir);
            
            // 检查文件是否已存在
            let existingContent = null;
            try {
                existingContent = await window.electronAPI.readFile(scriptPath);
            } catch (e) {
                // 文件不存在，将创建新文件
            }

            let finalContent;
            if (existingContent) {
                // 文件已存在，合并新事件
                finalContent = this.mergeEventsIntoScript(existingContent, widgetId, widgetType, events);
                console.log(`Updated script: ${fileName}`);
            } else {
                // 创建新文件
                finalContent = this.generateScriptTemplate(widgetId, widgetType, events);
                console.log(`Created script: ${fileName}`);
            }
            
            await window.electronAPI.writeFile(scriptPath, finalContent);
            return fileName;
        } catch (error) {
            console.error('Failed to create/update script:', error);
            alert('创建/更新脚本文件失败：' + error.message);
            return null;
        }
    }

    /**
     * 合并新事件到现有脚本
     */
    mergeEventsIntoScript(existingContent, widgetId, widgetType, newEvents) {
        const template = this.getWidgetTemplate(widgetType);
        if (!template) return existingContent;

        // 解析现有内容，找出已存在的事件
        const existingEvents = this.parseExistingEvents(existingContent);
        
        // 找出缺失的事件
        const missingEvents = newEvents.filter(event => !existingEvents.includes(event));
        
        if (missingEvents.length === 0) {
            return existingContent; // 所有事件都已存在
        }

        // 生成缺失事件的代码
        const newEventCode = missingEvents.map(eventName => {
            const eventInfo = template.events[eventName];
            if (!eventInfo) return '';
            
            return `    ${eventName}(${eventInfo.params}) {
        // TODO: 实现${eventInfo.comment}
        console.log('${widgetId}.${eventName} called');
    }`;
        }).filter(code => code).join(',\n\n');

        // 在对象的最后一个方法后插入
        // 查找对象结束的位置 (最后的 }; 或 } 前)
        const objectEndMatch = existingContent.match(/(\n\s*)\};?\s*$/);
        if (objectEndMatch) {
            const indent = objectEndMatch[1];
            const insertPos = objectEndMatch.index;
            
            // 在最后一个方法后添加逗号（如果还没有）
            let beforeInsert = existingContent.substring(0, insertPos);
            if (!beforeInsert.trimEnd().endsWith(',')) {
                beforeInsert = beforeInsert.trimEnd() + ',';
            }
            
            const afterInsert = existingContent.substring(insertPos);
            
            return beforeInsert + '\n\n' + newEventCode + afterInsert;
        }
        
        // 如果无法解析，返回原内容
        return existingContent;
    }

    /**
     * 解析现有脚本中的事件列表
     */
    parseExistingEvents(content) {
        const events = [];
        // 匹配事件方法名: onClick(...) { 或 onClick: function(...) {
        const eventRegex = /^\s*(on[A-Z][a-zA-Z]*)\s*[\(:]|^\s*['"]?(on[A-Z][a-zA-Z]*)['"]?\s*:/gm;
        let match;
        
        while ((match = eventRegex.exec(content)) !== null) {
            const eventName = match[1] || match[2];
            if (eventName && !events.includes(eventName)) {
                events.push(eventName);
            }
        }
        
        return events;
    }

    /**
     * 生成脚本模板（简化版，无接口声明）
     */
    generateScriptTemplate(widgetId, widgetType, events) {
        const template = this.getWidgetTemplate(widgetType);
        if (!template) {
            return this.generateGenericTemplate(widgetId, widgetType);
        }

        const date = new Date().toISOString().split('T')[0];
        
        let code = `/**
 * Script for: ${widgetId} (${this.capitalize(widgetType)})
 * Generated: ${date}
 * 
 * 类型提示来自 ui_types.d.ts
 */

const ${widgetId} = {
`;

        // 生成函数实现（带类型注解）
        events.forEach((eventName, index) => {
            const eventInfo = template.events[eventName];
            if (eventInfo) {
                code += `    /**
     * ${eventInfo.comment}
     * @param {${this.extractSelfType(eventInfo.params)}} self
     * @param {${this.extractEventType(eventInfo.params)}} event
     */
    ${eventName}(${eventInfo.params}) {
        // TODO: 实现${eventInfo.comment}
        console.log('${widgetId}.${eventName} called');
    }`;
                if (index < events.length - 1) code += ',\n\n';
            }
        });

        code += `
};

export default ${widgetId};
`;

        return code;
    }

    /**
     * 从参数字符串提取self类型
     */
    extractSelfType(params) {
        const match = params.match(/self:\s*(\w+)/);
        return match ? match[1] : 'any';
    }

    /**
     * 从参数字符串提取event类型
     */
    extractEventType(params) {
        const match = params.match(/event:\s*(\w+)/);
        return match ? match[1] : 'any';
    }

    /**
     * 获取控件模板
     */
    getWidgetTemplate(widgetType) {
        const templates = {
            button: {
                interface: 'UIButton',
                events: {
                    onClick: {
                        params: 'self: UIButton, event: ButtonClickEvent',
                        comment: '点击事件处理'
                    },
                    onHover: {
                        params: 'self: UIButton, event: HoverEvent',
                        comment: '悬停事件处理'
                    }
                }
            },
            textinput: {
                interface: 'UITextInput',
                events: {
                    onChange: {
                        params: 'self: UITextInput, event: TextChangeEvent',
                        comment: '文本改变事件'
                    },
                    onKeyPress: {
                        params: 'self: UITextInput, event: KeyEvent',
                        comment: '按键事件'
                    },
                    onFocus: {
                        params: 'self: UITextInput',
                        comment: '获得焦点事件'
                    },
                    onBlur: {
                        params: 'self: UITextInput',
                        comment: '失去焦点事件'
                    }
                }
            },
            label: {
                interface: 'UILabel',
                events: {
                    onClick: {
                        params: 'self: UILabel, event: MouseEvent',
                        comment: '点击事件'
                    }
                }
            },
            slider: {
                interface: 'UISlider',
                events: {
                    onChange: {
                        params: 'self: UISlider, value: number',
                        comment: '数值改变事件'
                    }
                }
            },
            checkbox: {
                interface: 'UICheckBox',
                events: {
                    onChange: {
                        params: 'self: UICheckBox, checked: boolean',
                        comment: '选中状态改变事件'
                    }
                }
            },
            radiobutton: {
                interface: 'UIRadioButton',
                events: {
                    onChange: {
                        params: 'self: UIRadioButton, checked: boolean',
                        comment: '选中状态改变事件'
                    }
                }
            },
            combobox: {
                interface: 'UIComboBox',
                events: {
                    onChange: {
                        params: 'self: UIComboBox, index: number, item: string',
                        comment: '选项改变事件'
                    }
                }
            },
            listview: {
                interface: 'UIListView',
                events: {
                    onItemClick: {
                        params: 'self: UIListView, index: number, item: string',
                        comment: '列表项点击事件'
                    }
                }
            },
            gridview: {
                interface: 'UIGridView',
                events: {
                    onItemClick: {
                        params: 'self: UIGridView, index: number',
                        comment: '网格项点击事件'
                    }
                }
            },
            tableview: {
                interface: 'UITableView',
                events: {
                    onCellClick: {
                        params: 'self: UITableView, row: number, col: number',
                        comment: '单元格点击事件'
                    }
                }
            },
            panel: {
                interface: 'UIPanel',
                events: {
                    onClick: {
                        params: 'self: UIPanel, event: MouseEvent',
                        comment: '点击事件'
                    }
                }
            }
        };

        return templates[widgetType] || null;
    }

    /**
     * 生成通用模板（当没有特定模板时）
     */
    generateGenericTemplate(widgetId, widgetType) {
        const date = new Date().toISOString().split('T')[0];
        return `/**
 * Script for: ${widgetId} (${this.capitalize(widgetType)})
 * Generated: ${date}
 */

const ${widgetId} = {
    // Add your event handlers here
};

export default ${widgetId};
`;
    }

    /**
     * 获取控件支持的事件列表
     */
    getAvailableEvents(widgetType) {
        const template = this.getWidgetTemplate(widgetType);
        if (!template) return [];
        
        return Object.keys(template.events).map(eventName => ({
            name: eventName,
            label: template.events[eventName].comment
        }));
    }

    /**
     * 首字母大写
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// 全局实例
window.scriptIntegration = new ScriptIntegration();
