# UI编辑器与预览器集成指南

## 功能概述

已成功将Golang UI Viewer集成到Web编辑器中，实现了"所见即所得"的UI设计工作流。

## 新增功能

### 1. 预览按钮 (▶️ 预览)
- **位置**: 工具栏右侧（绿色按钮）
- **功能**: 一键启动Go Viewer预览当前编辑的UI
- **工作流程**:
  1. 点击"预览"按钮
  2. 编辑器自动生成JSON布局文件
  3. 保存到临时文件
  4. 启动viewer.exe加载该文件
  5. 预览窗口打开，显示实时UI

### 2. 导出按钮 (💾 导出)
- **位置**: 工具栏右侧（预览按钮旁边）
- **功能**: 导出UI布局为JSON文件
- **使用场景**:
  - 保存UI设计供其他项目使用
  - 版本控制和备份
  - 与团队成员共享UI设计

## 技术实现

### 前端模块

**preview.js** - 核心预览和导出模块
```javascript
class Preview {
  generateLayoutData()  // 生成JSON布局数据
  launchPreview()       // 启动viewer预览
  exportLayout()        // 导出JSON文件
}
```

**支持的导出数据**:
- 所有控件属性（位置、尺寸、样式）
- RGBA颜色（包括Alpha通道）
- 三态背景（Button和TextInput）
- 圆角矩形和边框
- 资源引用（图片）
- 控件层级关系

### Electron IPC通信

**preload.js** - 暴露API到渲染进程:
```javascript
electronAPI.launchViewer(jsonData)  // 启动viewer
electronAPI.saveFile(jsonData, name) // 保存文件对话框
```

**main.js** - 主进程处理器:
```javascript
ipcMain.handle('launch-viewer')    // 创建临时文件，启动viewer进程
ipcMain.handle('save-json-file')   // 保存文件对话框
```

### Viewer启动逻辑

1. **查找viewer可执行文件**:
   - 优先使用编译好的 `viewer.exe`（Windows）
   - 如果不存在，使用 `go run main.go`（开发模式）

2. **临时文件管理**:
   - 生成临时JSON文件: `ui_preview_<timestamp>.json`
   - 保存到系统临时目录 (`os.tmpdir()`)
   - viewer启动后5秒自动清理

3. **进程管理**:
   - 使用 `spawn()` 启动detached进程
   - viewer独立运行，不阻塞编辑器
   - 可以同时运行多个预览窗口

## 使用示例

### 基本工作流

1. **创建UI**:
   ```
   点击工具栏按钮 → 在画布上放置控件 → 设置属性
   ```

2. **实时预览**:
   ```
   点击 "▶️ 预览" → Viewer窗口打开 → 查看实际效果
   ```

3. **迭代调整**:
   ```
   修改控件属性 → 再次点击预览 → 查看更新效果
   ```

4. **导出保存**:
   ```
   点击 "💾 导出" → 选择保存位置 → 保存JSON文件
   ```

### 预览快捷操作

- **多窗口预览**: 可以多次点击预览打开多个窗口对比效果
- **独立运行**: Viewer窗口独立运行，不会影响编辑器
- **快速迭代**: 修改后立即预览，无需编译

## JSON格式说明

导出的JSON文件格式与viewer完全兼容：

```json
{
  "name": "UI Layout",
  "width": 1280,
  "height": 720,
  "widgets": [
    {
      "id": "button_1",
      "type": "button",
      "x": 100,
      "y": 50,
      "width": 150,
      "height": 45,
      "text": "Click Me",
      "backgroundColorNormal": "#4287f5",
      "backgroundColorNormalAlpha": 255,
      ...
    }
  ],
  "resources": {
    "image_001": {
      "type": "image",
      "path": "assets/bg.png",
      "name": "背景图"
    }
  }
}
```

## 支持的控件类型

所有控件类型均支持完整的属性导出和预览：

- ✅ **Button** - 三态背景、文本、交互
- ✅ **Label** - 文本显示、对齐、换行
- ✅ **TextInput** - 三态背景、输入、光标
- ✅ **Image** - 图片显示、缩放模式
- ✅ **Panel** - 容器、嵌套控件
- ⏳ **Slider** - 滑块（待实现）
- ⏳ **ListBox** - 列表框（待实现）
- ⏳ **GridView** - 网格视图（待实现）

## 性能优化

### Viewer编译
为了快速启动预览，建议编译viewer：

```bash
cd ui/examples/viewer
go build -o viewer.exe
```

编译后的可执行文件启动速度约 < 1秒，而 `go run` 需要 2-3秒编译时间。

### 临时文件清理
临时JSON文件会在viewer启动5秒后自动删除，避免磁盘空间浪费。

## 故障排除

### 预览按钮无响应
1. 检查viewer.exe是否存在于 `ui/examples/viewer/` 目录
2. 如果不存在，系统会尝试使用 `go run`，确保Go环境已安装
3. 查看Electron开发者控制台的错误信息

### Viewer启动失败
1. 手动运行viewer测试：
   ```bash
   cd ui/examples/viewer
   go run main.go -layout sample_layout.json
   ```
2. 检查Go环境配置：`go version`
3. 检查依赖：`go mod tidy`

### 预览窗口显示异常
1. 检查控件属性设置是否正确
2. 验证JSON格式：使用导出功能保存文件，手动检查
3. 查看viewer控制台输出的错误信息

## 未来改进

### 计划中的功能
- 🔄 **热重载**: 编辑器修改后自动刷新预览窗口
- 📱 **多分辨率预览**: 模拟不同屏幕尺寸
- 🎨 **主题预览**: 快速切换UI主题
- 🔍 **交互调试**: 在预览窗口中测试按钮点击等交互
- 📊 **性能监控**: 显示渲染FPS和内存使用

### 可能的增强
- 导出为不同格式（XML、YAML）
- 批量导出（多个UI布局）
- 预览历史记录
- 对比预览（显示前后版本差异）

## 总结

通过集成Golang UI Viewer，现在可以在编辑器中实时预览UI效果，大大提升了开发效率。整个工作流从"设计 → 导出 → 手动加载 → 预览"简化为"设计 → 点击预览"，实现了真正的所见即所得。
