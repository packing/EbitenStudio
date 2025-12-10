const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // Canvas zoom events
  onCanvasZoomIn: (callback) => ipcRenderer.on('canvas-zoom-in', callback),
  onCanvasZoomOut: (callback) => ipcRenderer.on('canvas-zoom-out', callback),
  onCanvasZoomReset: (callback) => ipcRenderer.on('canvas-zoom-reset', callback),
  
  // File operations
  onFileNew: (callback) => ipcRenderer.on('file-new', callback),
  onFileSave: (callback) => ipcRenderer.on('file-save', callback),
  onFileSaveAs: (callback) => ipcRenderer.on('file-save-as', (event, filePath) => callback(filePath)),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
  
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', filePath, data),
  getSavePath: () => ipcRenderer.invoke('get-save-path'),
  updateWindowTitle: (filePath) => ipcRenderer.send('update-window-title', filePath),
  
  // Widget z-index operations
  onWidgetBringToFront: (callback) => ipcRenderer.on('widget-bring-to-front', callback),
  onWidgetSendToBack: (callback) => ipcRenderer.on('widget-send-to-back', callback),
  
  // Resource management
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  readFileAsBase64: (filePath) => ipcRenderer.invoke('read-file-base64', filePath),
});
