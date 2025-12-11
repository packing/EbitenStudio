# 资源ID类型修复

## 问题
导出的.ui文件中，图片控件的`imageResourceId`为空字符串，导致viewer无法加载图片。

## 根本原因

### 1. 字段名错误
- **ImageWidget使用**: `widget.resourceId`（存储资源ID）
- **Preview.js期望**: `widget.imageResourceId`（不存在）
- **结果**: 导出的UI中`imageResourceId: ""`为空

### 2. 类型不一致
- **资源管理器**: 资源ID是数字类型（`id: this.nextId++`）
- **Loader.go期望**: 资源ID是字符串类型
- **JSON行为**: 数字会保持为数字（`"id": 1`）
- **结果**: Go的字符串比较失败

## 修复内容

### 1. Preview.js - 修复字段名
```javascript
case 'image':
  Object.assign(data, {
    imageResourceId: widget.resourceId ? String(widget.resourceId) : '', // ✅ 使用正确字段
    scaleMode: widget.scaleMode || 'fit'
  });
```

### 2. Preview.js - 转换所有资源ID为字符串
```javascript
// 基础backgroundResourceId
backgroundResourceId: widget.backgroundResourceId ? String(widget.backgroundResourceId) : ''

// Button三态资源
backgroundResourceNormal: widget.backgroundResourceNormal ? String(widget.backgroundResourceNormal) : '',
backgroundResourcePressed: widget.backgroundResourcePressed ? String(widget.backgroundResourcePressed) : '',
backgroundResourceDisabled: widget.backgroundResourceDisabled ? String(widget.backgroundResourceDisabled) : '',

// TextInput三态资源
backgroundResourceNormal: widget.backgroundResourceNormal ? String(widget.backgroundResourceNormal) : '',
backgroundResourceEditing: widget.backgroundResourceEditing ? String(widget.backgroundResourceEditing) : '',
backgroundResourceDisabled: widget.backgroundResourceDisabled ? String(widget.backgroundResourceDisabled) : '',
```

### 3. Resource-packer.js - 转换manifest中的ID
```javascript
manifest.resources.push({
  id: String(resource.id), // ✅ 转换为字符串以匹配loader期望
  name: resource.name,
  type: resource.type,
  offset: currentOffset,
  size: size
});
```

## 修复后的数据格式

### 修复前
```json
{
  "id": "image1",
  "type": "image",
  "imageResourceId": "",  // ❌ 空字符串
  ...
  "resourceManifest": {
    "resources": [
      {
        "id": 1,  // ❌ 数字类型
        "name": "A_0.png"
      }
    ]
  }
}
```

### 修复后
```json
{
  "id": "image1",
  "type": "image",
  "imageResourceId": "1",  // ✅ 正确的资源ID（字符串）
  ...
  "resourceManifest": {
    "resources": [
      {
        "id": "1",  // ✅ 字符串类型
        "name": "A_0.png"
      }
    ]
  }
}
```

## 测试步骤

1. **重启编辑器**:
```powershell
cd h:\e_code_backup\github\repo\EbitenStudio\frontend
npm start
```

2. **创建测试UI**:
   - 添加图片资源（会得到ID: 1, 2, 3...）
   - 创建Image控件
   - 在属性面板选择图片资源
   - 保存项目

3. **导出UI包**:
   - 点击"💾导出"按钮
   - 选择保存位置
   - 检查生成的文件：
     - `ui_layout.ui` - UI定义
     - `ui_layout_xxxxxxxx.pak` - 资源包

4. **验证UI文件**:
```powershell
Get-Content ui_layout.ui | ConvertFrom-Json | Select-Object -ExpandProperty widgets
```
检查`imageResourceId`是否为`"1"`而不是`""`

5. **测试viewer加载**:
```powershell
cd h:\e_code_backup\github\repo\EbitenStudio\ui\examples\viewer
.\viewer.exe -layout "path\to\ui_layout.ui"
```

6. **验证结果**:
   - ✅ 图片正确显示
   - ✅ 图片不再是空白方块
   - ✅ 图片宽高比正确

## 相关文件修改

- ✅ `frontend/src/js/preview.js` - 3处修改
- ✅ `frontend/src/js/resource-packer.js` - 1处修改

## 已知限制

### 资源ID格式
- 前端使用数字ID（1, 2, 3...）
- 导出时转换为字符串（"1", "2", "3"...）
- Go loader期望字符串类型

### Widget属性命名
- `ImageWidget.resourceId` - 图片资源ID
- `Widget.backgroundResourceId` - 背景资源ID
- `ButtonWidget.backgroundResourceNormal` - 按钮三态资源
- 命名不一致，但功能正确

## 预期效果

修复后，完整的工作流程：
```
1. 编辑器添加资源 → resource.id = 1（数字）
2. Image控件引用 → widget.resourceId = 1（数字）
3. 导出UI → imageResourceId: "1"（字符串）
4. 资源清单 → id: "1"（字符串）
5. Viewer加载 → loader.loadImage("1")（字符串）
6. 从pak提取 → 查找manifest中id="1"的资源
7. 显示图片 → ✅ 成功
```

---

**修复日期**: 2025-12-11  
**测试状态**: 待测试  
**预期结果**: 图片正确显示
