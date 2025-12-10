const { app, BrowserWindow, protocol, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let recentFiles = []; // 最近打开的文件列表
const MAX_RECENT_FILES = 10;

function createWindow() {
  // 注册 file protocol 以支持 WASM
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''));
    callback(pathname);
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 允许加载本地 WASM
    },
  });

  // 加载最近文件列表
  loadRecentFiles();

  // 创建自定义菜单
  const template = getMenuTemplate();
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 打开开发者工具方便调试
  mainWindow.webContents.openDevTools();

  // 直接加载主界面
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 文件操作函数
function loadRecentFiles() {
  const configPath = path.join(app.getPath('userData'), 'recent-files.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      recentFiles = JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load recent files:', err);
    recentFiles = [];
  }
}

function saveRecentFiles() {
  const configPath = path.join(app.getPath('userData'), 'recent-files.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(recentFiles, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save recent files:', err);
  }
}

function addToRecentFiles(filePath) {
  // 移除已存在的相同路径
  recentFiles = recentFiles.filter(f => f !== filePath);
  // 添加到开头
  recentFiles.unshift(filePath);
  // 限制数量
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  }
  saveRecentFiles();
  updateMenu();
}

function getRecentFilesMenu() {
  if (recentFiles.length === 0) {
    return [{ label: 'No Recent Files', enabled: false }];
  }
  
  return recentFiles.map(filePath => ({
    label: path.basename(filePath),
    click: () => {
      openSpecificFile(filePath);
    }
  }));
}

function updateMenu() {
  // 重新创建菜单以更新最近文件列表
  if (mainWindow) {
    const template = getMenuTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

function getMenuTemplate() {
  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('file-new');
          }
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openFile();
          }
        },
        {
          label: 'Open Recent',
          submenu: getRecentFilesMenu()
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('file-save');
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            saveFileAs();
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Bring to Front',
          accelerator: 'CmdOrCtrl+]',
          click: () => {
            mainWindow.webContents.send('widget-bring-to-front');
          }
        },
        {
          label: 'Send to Back',
          accelerator: 'CmdOrCtrl+[',
          click: () => {
            mainWindow.webContents.send('widget-send-to-back');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            mainWindow.webContents.send('canvas-zoom-in');
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('canvas-zoom-out');
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('canvas-zoom-reset');
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    }
  ];
}

async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'EbitenStudio Project', extensions: ['ebiten', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    openSpecificFile(result.filePaths[0]);
  }
}

function openSpecificFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    mainWindow.webContents.send('file-opened', {
      filePath: filePath,
      data: data
    });
    
    addToRecentFiles(filePath);
  } catch (err) {
    dialog.showErrorBox('Open Error', `Failed to open file: ${err.message}`);
  }
}

async function saveFileAs() {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'EbitenStudio Project', extensions: ['ebiten'] },
      { name: 'JSON File', extensions: ['json'] }
    ],
    defaultPath: 'untitled.ebiten'
  });

  if (!result.canceled && result.filePath) {
    mainWindow.webContents.send('file-save-as', result.filePath);
  }
}

// IPC 处理
ipcMain.handle('save-file', async (event, filePath, data) => {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    addToRecentFiles(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-save-path', async (event) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'EbitenStudio Project', extensions: ['ebiten'] },
      { name: 'JSON File', extensions: ['json'] }
    ],
    defaultPath: 'untitled.ebiten'
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.on('update-window-title', (event, filePath) => {
  if (mainWindow) {
    if (filePath) {
      mainWindow.setTitle(`EbitenStudio - ${filePath}`);
    } else {
      mainWindow.setTitle('EbitenStudio - Untitled');
    }
  }
});

// 资源管理相关 IPC
ipcMain.handle('select-file', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || []
  });
  return result;
});

ipcMain.handle('read-file-base64', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return data.toString('base64');
  } catch (err) {
    throw new Error('Failed to read file: ' + err.message);
  }
});
