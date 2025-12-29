const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // Path utilities (via IPC to main process)
  path: {
    dirname: (filePath) => ipcRenderer.invoke('path-dirname', filePath),
    join: (...paths) => ipcRenderer.invoke('path-join', ...paths),
    basename: (filePath, ext) => ipcRenderer.invoke('path-basename', filePath, ext),
  },
  
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
  
  // Preview and export
  launchViewer: (jsonData) => ipcRenderer.invoke('launch-viewer', jsonData),
  launchViewerWithPak: (packageData) => ipcRenderer.invoke('launch-viewer-with-pak', packageData),
  saveJsonFile: (jsonData, defaultName) => ipcRenderer.invoke('save-json-file', jsonData, defaultName),
  exportUIPackage: (packageData) => ipcRenderer.invoke('export-ui-package', packageData),
  
  // External editor integration
  openExternalEditor: (command, args) => ipcRenderer.invoke('open-external-editor', command, args),
  openWithDefault: (filePath) => ipcRenderer.invoke('open-with-default', filePath),
  
  // Script file operations (for script integration)
  readDir: (path) => ipcRenderer.invoke('read-dir', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
  
  // TypeScript compilation
  compileTypeScript: (tsFilePath) => ipcRenderer.invoke('compile-typescript', tsFilePath),
  ensureDir: (path) => ipcRenderer.invoke('ensure-dir', path),
});

// Script Editor API (for script-editor.html, same as electronAPI)
contextBridge.exposeInMainWorld('api', {
  readDir: (path) => ipcRenderer.invoke('read-dir', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
  ensureDir: (path) => ipcRenderer.invoke('ensure-dir', path),
});

