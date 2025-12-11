# 导出功能修复

## 问题
导出UI时出现base64解码错误：
```
DOMException: Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded.
```

## 原因
资源管理器存储的`resource.data`字段包含完整的data URL格式：
```javascript
data:image/png;base64,iVBORw0KGg...
```

而`atob()`函数只能解码纯base64字符串，不能处理data URL前缀。

## 修复
更新`resource-packer.js`的`base64ToArrayBuffer()`方法：

```javascript
base64ToArrayBuffer(base64) {
  // 去除data URL前缀（如果有）
  let base64Data = base64;
  if (base64.startsWith('data:')) {
    const commaIndex = base64.indexOf(',');
    if (commaIndex !== -1) {
      base64Data = base64.substring(commaIndex + 1);
    }
  }
  
  const binaryString = atob(base64Data);
  // ...
}
```

## 测试步骤

1. 启动编辑器：
```powershell
cd h:\e_code_backup\github\repo\EbitenStudio\frontend
npm start
```

2. 在编辑器中：
   - 添加一些图片资源
   - 创建使用这些资源的控件
   - 点击"💾导出"按钮

3. 验证：
   - 不再出现atob错误
   - 成功生成.ui和.pak文件
   - pak文件大小正常（不为0）

## 相关代码

### resource-manager.js
存储资源时使用完整data URL：
```javascript
data: `data:image/${fileExt};base64,${fileData}`
```

### resource-packer.js
打包时从data字段读取：
```javascript
if (resource.data) {
  resourceData = this.base64ToArrayBuffer(resource.data);
}
```

## 状态
✅ 已修复 - 等待测试
