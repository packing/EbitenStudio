# Phase 6 修订版 - 外部编辑器集成测试

## 测试准备

### 1. 确保VS Code已安装

检查VS Code是否安装：
```powershell
code --version
```

如果未安装，从 https://code.visualstudio.com/ 下载安装。

### 2. 启动EbitenStudio

```powershell
cd h:\e_code_backup\github\repo\EbitenStudio\frontend
npm start
```

## 测试步骤

### 测试1: 控件属性面板显示脚本部分

1. 在UI编辑器中创建一个按钮
2. 选中该按钮
3. 在右侧属性面板中滚动到底部
4. 检查是否显示：
   - ✅ "脚本" 部分标题
   - ✅ "脚本文件" 下拉框
   - ✅ 编辑按钮 (✎) - 应该是灰色禁用状态
   - ✅ 新建按钮 (+) - 应该是可点击状态
   - ✅ "启用事件" 部分
   - ✅ 事件复选框列表（onClick, onHover等）

### 测试2: 创建新脚本

1. 选中一个按钮（ID: button1）
2. 在"启用事件"中勾选：
   - ✅ onClick
   - ✅ onHover
3. 点击 "+" (新建脚本) 按钮
4. 检查：
   - ✅ 弹出确认对话框："脚本文件已创建。是否在外部编辑器中打开？"
   - ✅ 点击"确定"
   - ✅ VS Code自动打开
   - ✅ 显示 `button1.ts` 文件
   - ✅ 文件内容包含生成的模板代码：
     ```typescript
     /**
      * Script for: button1 (Button)
      * Generated: 2025-12-27
      */

     interface Button1Handlers {
         onClick?(self: UIButton, event: ButtonClickEvent): void;
         onHover?(self: UIButton, event: HoverEvent): void;
     }

     const button1: Button1Handlers = {
         onClick(self, event) {
             // TODO: 实现点击事件处理
             console.log('button1.onClick called');
         },

         onHover(self, event) {
             // TODO: 实现悬停事件处理
             console.log('button1.onHover called');
         }
     };

     export default button1;
     ```

### 测试3: 脚本文件关联

1. 回到EbitenStudio
2. 检查按钮的属性面板
3. "脚本文件" 下拉框应该显示：
   - ✅ button1.ts (已选中)
4. 编辑按钮 (✎) 应该：
   - ✅ 变为可点击状态（不再是灰色）

### 测试4: 编辑现有脚本

1. 点击编辑按钮 (✎)
2. 检查：
   - ✅ VS Code打开（或切换到已打开的窗口）
   - ✅ 显示 `button1.ts` 文件
3. 在VS Code中修改代码：
   ```typescript
   onClick(self, event) {
       console.log('Button clicked!');
       self.setText('Clicked');
   }
   ```
4. 保存文件 (Ctrl+S)
5. 脚本修改已保存到磁盘

### 测试5: 创建第二个控件并共享脚本

1. 在UI编辑器中创建第二个按钮 (button2)
2. 选中button2
3. 在"脚本文件"下拉框中选择：
   - ✅ `button1.ts` (现有脚本)
4. 勾选需要的事件
5. 现在两个按钮共享同一个脚本文件

### 测试6: 不同控件类型的事件

1. 创建一个TextInput (textinput1)
2. 选中该控件
3. 查看"启用事件"列表：
   - ✅ onChange - 文本改变事件
   - ✅ onKeyPress - 按键事件
   - ✅ onFocus - 获得焦点事件
   - ✅ onBlur - 失去焦点事件
4. 勾选所有事件
5. 点击"+"创建脚本
6. VS Code打开显示正确的TextInput模板

### 测试7: VS Code智能提示

1. 确保 `ui_types.d.ts` 存在于 `scripts/` 目录
2. 在VS Code中编辑 `button1.ts`
3. 输入 `self.`
4. 检查：
   - ✅ 智能提示弹出
   - ✅ 显示 UIButton 的方法（setText, getText等）
5. 输入 `RootElement.`
6. 检查：
   - ✅ 显示 getElementById, getByType 方法

### 测试8: 工作流完整性

**场景**: 同时编辑Go代码和脚本代码

1. 在VS Code中打开项目：
   ```powershell
   code h:\e_code_backup\github\repo\EbitenStudio
   ```
2. 在VS Code中可以看到：
   - ✅ 左侧：Go代码（ui/目录）
   - ✅ 左侧：TypeScript脚本（frontend/scripts/目录）
3. 可以在同一个窗口中编辑：
   - ✅ `ui/button.go` - Go控件实现
   - ✅ `scripts/button1.ts` - TypeScript脚本逻辑
4. 无需切换工具！

### 测试9: Fallback编辑器

**如果VS Code未找到**：

1. 重命名或临时移除VS Code
2. 创建新脚本
3. 检查：
   - ✅ 尝试使用系统默认编辑器
   - ✅ 或显示错误提示

### 测试10: 控件保存和加载

1. 创建带脚本的控件
2. 保存项目 (Ctrl+S)
3. 关闭EbitenStudio
4. 重新打开项目
5. 检查：
   - ✅ 控件的 `scriptFile` 属性已保存
   - ✅ 控件的 `enabledEvents` 属性已保存
   - ✅ 在属性面板中正确显示

## 预期文件结构

```
EbitenStudio/
├── frontend/
│   └── scripts/
│       ├── ui_types.d.ts        ← Phase 5生成
│       ├── button1.ts           ← 新建
│       ├── textinput1.ts        ← 新建
│       └── commonHandlers.ts    ← 共享脚本
```

## 成功标准

所有测试步骤通过，并且：

- ✅ 可以创建新脚本
- ✅ 可以编辑脚本（打开外部编辑器）
- ✅ 可以选择现有脚本
- ✅ 多个控件可以共享脚本
- ✅ 不同控件类型显示正确的事件列表
- ✅ VS Code智能提示正常工作
- ✅ 工作流流畅，无需切换工具

## 已知限制

1. **首次打开VS Code**: 如果VS Code之前没有打开项目，可能需要手动打开一次
2. **路径解析**: Windows路径需要正确处理
3. **进程独立性**: 子进程需要正确分离以避免阻塞

## 问题排查

### 问题1: VS Code没有打开

**检查**:
```powershell
# 检查VS Code命令是否可用
code --version

# 检查VS Code安装路径
where.exe code
```

**解决**: 
- 重新安装VS Code并确保添加到PATH
- 或手动配置编辑器路径

### 问题2: 脚本文件未创建

**检查**:
- 查看浏览器控制台 (F12) 是否有错误
- 检查 `scripts/` 目录是否存在
- 检查文件权限

### 问题3: 智能提示不工作

**检查**:
- `ui_types.d.ts` 是否存在
- VS Code是否识别为TypeScript项目
- 尝试重启VS Code

### 问题4: 控件属性面板没有显示脚本部分

**检查**:
- 浏览器控制台是否有JavaScript错误
- `script-integration.js` 是否正确加载
- 刷新页面 (F5)

## 下一步

测试通过后：
1. 完善错误处理
2. 添加配置界面（选择编辑器）
3. 优化模板生成
4. 编写用户文档
