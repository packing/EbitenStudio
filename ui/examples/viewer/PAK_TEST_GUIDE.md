# Viewer Pak格式支持测试指南

## 更新内容

已成功更新viewer以支持新的.ui+.pak资源包格式。

### 主要改进

1. **loader.go新增功能:**
   - `ResourceManifest` 和 `ResourceInfo` 结构体 - 资源清单定义
   - `loadResourcePack()` - 自动查找并加载pak文件
   - `parseManifest()` - 解析资源清单
   - `getResourceData()` - 从pak中提取资源
   - `loadImage()` 更新 - 优先从pak加载，回退到文件系统

2. **main.go简化:**
   - `loadLayout()` 直接使用`loader.LoadFromFile()`
   - 自动处理.ui和.json两种格式

3. **安全特性:**
   - SHA-256 hash验证pak文件完整性
   - 防止资源越界访问

## 测试步骤

### 1. 准备测试UI

在编辑器中创建一个包含图片资源的UI：

```
1. 打开编辑器
2. 创建一些控件（Button、Image、Panel等）
3. 添加图片资源（背景图、按钮图标等）
4. 保存为项目文件（.ebiten格式）
```

### 2. 导出UI包

点击编辑器工具栏的"💾导出"按钮：

```
导出会生成两个文件：
- my_ui.ui        - UI定义文件（JSON，只含资源ID）
- my_ui_a1b2c3d4.pak - 资源包（二进制，包含所有资源）
```

### 3. 使用viewer加载

```powershell
# 加载.ui文件（自动查找对应的pak）
.\viewer.exe -layout "path\to\my_ui.ui"

# 也可以加载旧的.json格式（向后兼容）
.\viewer.exe -layout "path\to\layout.json"
```

### 4. 验证功能

检查以下功能是否正常：

- [x] viewer能正确加载.ui文件
- [x] 自动找到并加载对应的pak文件
- [x] hash验证通过
- [x] 所有图片资源正确显示
- [x] 控件布局和样式正确
- [x] 错误处理（如pak文件缺失、hash不匹配）

## 错误处理

### Pak文件未找到

```
Error: load resource pack error: pak file not found: path\to\my_ui_a1b2c3d4.pak
```

**解决方案**: 确保.pak文件和.ui文件在同一目录

### Hash不匹配

```
Error: pak file hash mismatch: expected=abc..., actual=def...
```

**解决方案**: pak文件已损坏或被修改，需要重新导出

### 资源加载失败

```
Error: resource not found: img_001
```

**解决方案**: manifest中的资源ID与UI文件不匹配，重新导出

## 兼容性说明

### 向后兼容

- ✅ 支持旧的.json格式（直接加载文件路径）
- ✅ 预览模式仍然使用文件路径（不打包）
- ✅ 如果pak加载失败，会尝试从文件系统加载

### 文件格式识别

Viewer通过以下方式识别文件格式：

1. 检查`resourcePackHash`字段
   - 存在且非空 → 新格式（.ui+.pak）
   - 不存在或为空 → 旧格式（.json）

2. 资源加载优先级：
   - pak中的资源（如果pak已加载）
   - resourcePath中的资源
   - resourceID作为绝对路径

## 技术细节

### Pak文件命名规则

```
<UI文件名>_<hash前8位>.pak

示例:
my_ui.ui        → my_ui_a1b2c3d4.pak
game_layout.ui  → game_layout_f8e9d7c6.pak
```

### Manifest结构

```json
{
  "version": 1,
  "count": 5,
  "resources": [
    {
      "id": "img_001",
      "name": "background",
      "type": "image",
      "offset": 0,
      "size": 102400
    },
    ...
  ]
}
```

### 资源提取过程

```
1. 读取.ui文件 → 解析resourcePackHash
2. 查找对应的pak文件
3. 验证SHA-256 hash
4. 解析resourceManifest
5. 根据offset/size提取资源
6. 创建ebiten.Image对象
```

## 性能优化

### 图片缓存

所有加载的图片都会缓存在`Loader.imageCache`中：

```go
if img, exists := l.imageCache[resourceID]; exists {
    return img  // 直接返回缓存
}
```

### 延迟加载

资源只在首次使用时从pak中提取，未使用的资源不占用内存。

## 下一步测试

1. **压力测试**: 测试大量资源的pak文件
2. **错误注入**: 故意修改pak文件，测试hash验证
3. **跨平台**: 在Windows/Linux/macOS上测试
4. **性能对比**: pak加载 vs 文件系统加载

## 已知问题

目前无已知问题。如果发现问题，请记录在此：

- [ ] ...

## 成功标准

- [x] 编译无错误
- [ ] 能加载.ui+.pak格式
- [ ] hash验证工作正常
- [ ] 所有资源正确显示
- [ ] 向后兼容.json格式

---

**编译时间**: 2024-xx-xx  
**测试状态**: 待测试  
**版本**: v1.0 (Pak Support)
