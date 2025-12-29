# Phase 6 方案调整：外部编辑器集成

## 背景

用户提出了更合理的设计方案：不嵌入Monaco Editor，而是使用外部编辑器（VS Code）。这样可以避免工作流割裂，开发者可以在同一个编辑器中处理Go代码和TypeScript脚本。

## 新方案设计

### 1. 核心理念

**UI编辑器的职责**：
- 管理脚本文件与控件的关联
- 生成脚本模板（包含所有事件处理函数）
- 提供"打开外部编辑器"的快捷方式

**外部编辑器的职责**（VS Code等）：
- 实际的代码编辑
- 智能提示（通过加载ui_types.d.ts）
- 调试、版本控制、插件等

### 2. UI编辑器界面设计

#### 控件属性面板 - 脚本部分

```
┌─ Button Properties ──────────────────┐
│ ID: loginButton                      │
│ Text: Login                          │
│ Position: (100, 50)                  │
│ ...                                  │
├─ Script ────────────────────────────┤
│ 脚本文件:                            │
│ ┌────────────────────────┬─┬─┬─┐    │
│ │ loginButton.ts         │▼│✎│+│    │
│ └────────────────────────┴─┴─┴─┘    │
│   ▼ = 选择现有脚本                   │
│   ✎ = 编辑脚本（打开外部编辑器）     │
│   + = 新建脚本                       │
│                                      │
│ 可用事件:                            │
│ ☑ onClick    - 点击事件              │
│ ☑ onHover    - 悬停事件              │
│ ☐ onFocus    - 获得焦点              │
│ ☐ onBlur     - 失去焦点              │
└──────────────────────────────────────┘
```

### 3. 功能实现

#### 3.1 脚本文件选择器

**下拉列表内容**：
- `无脚本` - 不关联任何脚本
- `loginButton.ts` - 现有脚本文件
- `commonButtons.ts` - 共享脚本（多个按钮共用）
- `---分隔线---`
- `新建脚本...` - 创建新文件

**多控件共享**：
```typescript
// commonButtons.ts - 多个按钮共享的脚本

// 处理所有确认按钮
export function handleConfirmClick(self: UIButton, event: ButtonClickEvent) {
    console.log('Confirm clicked:', self.getID());
    // 通用确认逻辑
}

// 处理所有取消按钮
export function handleCancelClick(self: UIButton, event: ButtonClickEvent) {
    console.log('Cancel clicked:', self.getID());
    // 通用取消逻辑
}

// 将不同按钮映射到不同处理函数
const buttonHandlers = {
    'confirmButton': { onClick: handleConfirmClick },
    'cancelButton': { onClick: handleCancelClick },
    'okButton': { onClick: handleConfirmClick }
};

export default buttonHandlers;
```

#### 3.2 新建脚本模板生成

根据控件类型和选中的事件生成代码：

**Button脚本模板**：
```typescript
/**
 * Script for: loginButton (Button)
 * Generated: 2025-12-27
 */

interface LoginButtonHandlers {
    /**
     * 点击事件处理
     * @param self - 按钮自身
     * @param event - 点击事件
     */
    onClick?(self: UIButton, event: ButtonClickEvent): void;

    /**
     * 悬停事件处理
     * @param self - 按钮自身
     * @param event - 悬停事件
     */
    onHover?(self: UIButton, event: HoverEvent): void;
}

const loginButton: LoginButtonHandlers = {
    onClick(self, event) {
        // TODO: 实现点击逻辑
        console.log('Login button clicked');
    },

    onHover(self, event) {
        // TODO: 实现悬停逻辑
    }
};

export default loginButton;
```

**TextInput脚本模板**：
```typescript
/**
 * Script for: usernameInput (TextInput)
 * Generated: 2025-12-27
 */

interface UsernameInputHandlers {
    /**
     * 文本改变事件
     */
    onChange?(self: UITextInput, event: TextChangeEvent): void;

    /**
     * 按键事件
     */
    onKeyPress?(self: UITextInput, event: KeyEvent): void;

    /**
     * 获得焦点事件
     */
    onFocus?(self: UITextInput): void;

    /**
     * 失去焦点事件
     */
    onBlur?(self: UITextInput): void;
}

const usernameInput: UsernameInputHandlers = {
    onChange(self, event) {
        // TODO: 验证用户名格式
    },

    onKeyPress(self, event) {
        // TODO: 处理特殊按键（如Enter）
    },

    onFocus(self) {
        // TODO: 高亮输入框
    },

    onBlur(self) {
        // TODO: 取消高亮
    }
};

export default usernameInput;
```

#### 3.3 外部编辑器打开

**配置文件**（`.ebitenstudio/config.json`）：
```json
{
    "externalEditor": {
        "enabled": true,
        "editor": "code",  // VS Code命令
        "args": ["--goto", "{file}:{line}:{column}"],
        "fallbacks": [
            {
                "name": "VS Code",
                "command": "code",
                "paths": [
                    "C:\\Program Files\\Microsoft VS Code\\Code.exe",
                    "C:\\Users\\{username}\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe"
                ]
            },
            {
                "name": "Sublime Text",
                "command": "subl",
                "paths": [
                    "C:\\Program Files\\Sublime Text\\sublime_text.exe"
                ]
            },
            {
                "name": "Notepad++",
                "command": "notepad++",
                "paths": [
                    "C:\\Program Files\\Notepad++\\notepad++.exe"
                ]
            }
        ]
    },
    "scriptsDirectory": "scripts"
}
```

**打开逻辑**：
```javascript
// frontend/src/js/script-integration.js

class ScriptIntegration {
    constructor() {
        this.config = this.loadConfig();
    }

    /**
     * 打开脚本文件到外部编辑器
     * @param {string} scriptFile - 脚本文件名
     * @param {number} line - 跳转到的行号（可选）
     */
    async openInExternalEditor(scriptFile, line = 1) {
        const scriptPath = path.join(this.config.scriptsDirectory, scriptFile);
        
        // 尝试使用配置的编辑器
        const editor = this.config.externalEditor;
        
        if (editor.enabled) {
            try {
                // 替换参数中的占位符
                const args = editor.args.map(arg => 
                    arg.replace('{file}', scriptPath)
                       .replace('{line}', line.toString())
                       .replace('{column}', '1')
                );

                // 执行命令
                await window.electronAPI.openExternalEditor(editor.command, args);
                console.log(`Opened ${scriptFile} in ${editor.command}`);
            } catch (error) {
                console.error('Failed to open external editor:', error);
                // 尝试fallback
                this.tryFallbackEditors(scriptPath);
            }
        } else {
            // 使用系统默认编辑器
            await window.electronAPI.openWithDefault(scriptPath);
        }
    }

    /**
     * 尝试备选编辑器
     */
    async tryFallbackEditors(scriptPath) {
        for (const fallback of this.config.externalEditor.fallbacks) {
            // 检查编辑器是否存在
            for (const editorPath of fallback.paths) {
                if (await window.electronAPI.fileExists(editorPath)) {
                    await window.electronAPI.openExternalEditor(editorPath, [scriptPath]);
                    console.log(`Opened with fallback: ${fallback.name}`);
                    return;
                }
            }
        }

        // 所有方法都失败，显示错误
        alert('未找到可用的代码编辑器。请安装VS Code或配置外部编辑器。');
    }

    /**
     * 生成脚本模板
     * @param {string} widgetId - 控件ID
     * @param {string} widgetType - 控件类型
     * @param {Array<string>} events - 选中的事件列表
     */
    generateScriptTemplate(widgetId, widgetType, events) {
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
                        comment: '获得焦点'
                    },
                    onBlur: {
                        params: 'self: UITextInput',
                        comment: '失去焦点'
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
            }
            // ... 其他控件类型
        };

        const template = templates[widgetType];
        if (!template) return null;

        const date = new Date().toISOString().split('T')[0];
        
        let code = `/**
 * Script for: ${widgetId} (${this.capitalize(widgetType)})
 * Generated: ${date}
 */

interface ${this.capitalize(widgetId)}Handlers {
`;

        // 生成接口定义
        events.forEach(eventName => {
            const eventInfo = template.events[eventName];
            if (eventInfo) {
                code += `    /**
     * ${eventInfo.comment}
     */
    ${eventName}?(${eventInfo.params}): void;

`;
            }
        });

        code += `}

const ${widgetId}: ${this.capitalize(widgetId)}Handlers = {
`;

        // 生成函数实现
        events.forEach((eventName, index) => {
            const eventInfo = template.events[eventName];
            if (eventInfo) {
                code += `    ${eventName}(${eventInfo.params}) {
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

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
```

### 4. 实现步骤

#### Step 1: 修改属性面板

在 `properties.js` 中添加脚本部分：

```javascript
// 在render()函数中，所有属性渲染后添加
html += `
<div class="property-section">
    <h3 class="section-title">脚本</h3>
    
    <div class="property-group">
        <label class="property-label">脚本文件</label>
        <div class="script-file-selector">
            <select class="property-input" id="prop-scriptFile">
                <option value="">无脚本</option>
                ${this.renderScriptFileOptions(w.scriptFile)}
            </select>
            <button class="icon-btn" id="btn-edit-script" title="编辑脚本" ${!w.scriptFile ? 'disabled' : ''}>
                ✎
            </button>
            <button class="icon-btn" id="btn-new-script" title="新建脚本">
                +
            </button>
        </div>
    </div>
    
    <div class="property-group">
        <label class="property-label">启用事件</label>
        <div class="event-checkboxes">
            ${this.renderEventCheckboxes(w.type, w.enabledEvents || [])}
        </div>
    </div>
</div>
`;
```

#### Step 2: 添加IPC处理

在 `main.js` 中添加外部编辑器支持：

```javascript
const { spawn } = require('child_process');

// 打开外部编辑器
ipcMain.handle('open-external-editor', async (event, command, args) => {
    try {
        spawn(command, args, { detached: true, stdio: 'ignore' });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 检查文件是否存在
ipcMain.handle('file-exists', async (event, filePath) => {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
});

// 使用系统默认程序打开文件
ipcMain.handle('open-with-default', async (event, filePath) => {
    const { shell } = require('electron');
    try {
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

#### Step 3: 更新preload.js

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
    // ... 现有API
    
    // 脚本编辑器集成
    openExternalEditor: (command, args) => 
        ipcRenderer.invoke('open-external-editor', command, args),
    fileExists: (filePath) => 
        ipcRenderer.invoke('file-exists', filePath),
    openWithDefault: (filePath) => 
        ipcRenderer.invoke('open-with-default', filePath),
});
```

### 5. 用户工作流

#### 典型流程：

1. **在UI编辑器中设计界面**
   - 拖放控件
   - 设置属性

2. **关联脚本**
   - 选择控件
   - 在属性面板点击"新建脚本"
   - 选择需要的事件
   - 生成模板文件

3. **编辑脚本**
   - 点击"编辑脚本"按钮
   - VS Code自动打开到该文件
   - 在VS Code中编辑（享受完整IDE功能）
   - 保存

4. **测试运行**
   - 在UI编辑器中预览
   - 脚本自动加载并执行

5. **同时编辑Go和TS代码**
   - 在VS Code的同一个窗口中
   - 左侧：Go代码（后端逻辑）
   - 右侧：TypeScript脚本（UI逻辑）
   - 无需切换工具！

### 6. 优势总结

✅ **工作流优势**
- 单一编辑器（VS Code）处理所有代码
- 无需在多个工具间切换
- 完整的IDE功能（Git、调试、插件）

✅ **实现优势**
- 代码量大幅减少
- 不需要维护嵌入式编辑器
- 利用现有成熟工具

✅ **用户体验优势**
- 符合开发者习惯
- 更快的响应速度
- 更灵活的编辑能力

### 7. Phase 6的处理

**已实现的Monaco Editor集成**：
- 可以保留为可选功能（配置项控制）
- 或者完全移除，简化代码

**建议**：移除Monaco集成，使用本方案替代

### 8. 下一步

1. 实现属性面板的脚本部分UI
2. 实现脚本模板生成器
3. 实现外部编辑器打开逻辑
4. 添加配置文件支持
5. 测试完整工作流
