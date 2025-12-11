/**
 * 资源打包器
 * 负责将UI项目中的所有资源打包成.pak文件
 */
class ResourcePacker {
  constructor() {
    this.crypto = window.crypto || window.msCrypto;
  }

  /**
   * 打包资源
   * @param {Array} resources - 资源列表 {id, name, path, type, data}
   * @returns {Object} - {pakData: ArrayBuffer, manifest: Object, hash: string}
   */
  async packResources(resources) {
    if (!resources || resources.length === 0) {
      return {
        pakData: new ArrayBuffer(0),
        manifest: { version: 1, resources: [], count: 0 },
        hash: await this.calculateHash(new Uint8Array(0))
      };
    }

    // 构建资源清单
    const manifest = {
      version: 1,
      count: resources.length,
      resources: []
    };

    // 收集所有资源数据
    const resourceBlocks = [];
    let currentOffset = 0;

    for (const resource of resources) {
      let resourceData;
      
      if (resource.data) {
        // 已有base64数据
        resourceData = this.base64ToArrayBuffer(resource.data);
      } else if (resource.path && window.electronAPI) {
        // 从文件系统读取
        const base64Data = await window.electronAPI.readFileAsBase64(resource.path);
        resourceData = this.base64ToArrayBuffer(base64Data);
      } else {
        console.warn('Resource has no data:', resource.id);
        continue;
      }

      const size = resourceData.byteLength;

      // 添加到清单
      manifest.resources.push({
        id: String(resource.id), // 转换为字符串以匹配loader期望
        name: resource.name,
        type: resource.type,
        offset: currentOffset,
        size: size
      });

      resourceBlocks.push(resourceData);
      currentOffset += size;
    }

    // 合并所有资源数据
    const pakData = this.mergeArrayBuffers(resourceBlocks);
    
    // 计算hash
    const hash = await this.calculateHash(new Uint8Array(pakData));

    return {
      pakData,
      manifest,
      hash
    };
  }

  /**
   * 解包资源
   * @param {ArrayBuffer} pakData - pak文件数据
   * @param {Object} manifest - 资源清单
   * @returns {Map} - resourceId -> ArrayBuffer
   */
  unpackResources(pakData, manifest) {
    const resources = new Map();
    const dataView = new Uint8Array(pakData);

    for (const resourceInfo of manifest.resources) {
      const resourceData = dataView.slice(
        resourceInfo.offset,
        resourceInfo.offset + resourceInfo.size
      );
      
      resources.set(resourceInfo.id, {
        id: resourceInfo.id,
        name: resourceInfo.name,
        type: resourceInfo.type,
        data: resourceData.buffer
      });
    }

    return resources;
  }

  /**
   * 计算SHA-256 hash
   */
  async calculateHash(data) {
    if (!this.crypto || !this.crypto.subtle) {
      // Fallback: 简单hash
      return this.simpleHash(data);
    }

    try {
      const hashBuffer = await this.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      console.warn('Crypto API failed, using simple hash:', err);
      return this.simpleHash(data);
    }
  }

  /**
   * 简单hash算法（fallback）
   */
  simpleHash(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Base64转ArrayBuffer
   */
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
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * ArrayBuffer转Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 合并多个ArrayBuffer
   */
  mergeArrayBuffers(buffers) {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    return result.buffer;
  }

  /**
   * 保存pak文件和manifest
   */
  async savePakFile(pakData, manifest, hash, baseName) {
    // pak文件名格式: <name>_<hash>.pak
    const pakFileName = `${baseName}_${hash.substring(0, 8)}.pak`;
    
    // 保存manifest到JSON
    const manifestData = {
      ...manifest,
      pakFile: pakFileName,
      hash: hash
    };

    if (window.electronAPI && window.electronAPI.savePakFile) {
      // 使用Electron保存
      const result = await window.electronAPI.savePakFile(
        pakData,
        JSON.stringify(manifestData, null, 2),
        pakFileName,
        `${baseName}.manifest.json`
      );
      return result;
    } else {
      // 浏览器环境，下载文件
      this.downloadBlob(new Blob([pakData]), pakFileName);
      this.downloadBlob(
        new Blob([JSON.stringify(manifestData, null, 2)]),
        `${baseName}.manifest.json`
      );
      return { success: true };
    }
  }

  /**
   * 浏览器下载文件
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 导出
window.ResourcePacker = ResourcePacker;
