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

  // 打开开发者工具方便调试（如需调试可取消注释或使用菜单：视图 -> 切换开发者工具）
  // mainWindow.webContents.openDevTools();

  // 直接加载主界面
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 打开脚本编辑器
function openScriptEditor() {
  const editorWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  editorWindow.loadFile(path.join(__dirname, 'src', 'script-editor.html'));
  
  // 开发时打开开发者工具
  // editorWindow.webContents.openDevTools();
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
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Script Editor',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            openScriptEditor();
          }
        }
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

// 预览和导出相关 IPC
ipcMain.handle('launch-viewer', async (event, jsonData) => {
  const { spawn } = require('child_process');
  const os = require('os');
  
  try {
    // 创建临时JSON文件
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `ui_preview_${Date.now()}.json`);
    fs.writeFileSync(tempFile, jsonData, 'utf8');
    
    // 查找viewer可执行文件路径
    const projectRoot = path.join(__dirname, '..');
    const viewerDir = path.join(projectRoot, 'ui', 'examples', 'viewer');
    
    // 根据平台选择执行方式
    let viewerCmd, viewerArgs;
    if (process.platform === 'win32') {
      // Windows: 检查是否有编译好的exe，否则使用go run
      const exePath = path.join(viewerDir, 'viewer.exe');
      if (fs.existsSync(exePath)) {
        viewerCmd = exePath;
        viewerArgs = ['-layout', tempFile];
      } else {
        viewerCmd = 'go';
        viewerArgs = ['run', 'main.go', '-layout', tempFile];
      }
    } else {
      // Linux/Mac
      viewerCmd = 'go';
      viewerArgs = ['run', 'main.go', '-layout', tempFile];
    }
    
    // 启动viewer进程
    const viewerProcess = spawn(viewerCmd, viewerArgs, {
      cwd: viewerDir,
      detached: true,
      stdio: 'ignore'
    });
    
    viewerProcess.unref();
    
    // 清理临时文件（延迟删除，等viewer启动后）
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }
    }, 5000);
    
    return { success: true };
  } catch (error) {
    console.error('Launch viewer error:', error);
    return { success: false, error: error.message };
  }
});

// IPC: 启动viewer（新版本，支持pak格式）
ipcMain.handle('launch-viewer-with-pak', async (event, { uiData, pakData, hash }) => {
  const { spawn } = require('child_process');
  const os = require('os');

  console.log('[Main IPC] launch-viewer-with-pak called');
  console.log('[Main IPC] uiData length:', uiData?.length);
  console.log('[Main IPC] pakData length:', pakData?.length);
  console.log('[Main IPC] hash:', hash);

  try {
    const tempDir = path.join(os.tmpdir(), 'ebitenstudio_preview');
    console.log('[Main IPC] Temp dir:', tempDir);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('[Main IPC] Created temp dir');
    }

    const timestamp = Date.now();
    const basename = `preview_${timestamp}`;
    const uiFile = path.join(tempDir, `${basename}.ui`);
    // Pak文件需要使用前8位hash作为后缀（与loader.go的约定）
    const hashPrefix = hash.substring(0, 8);
    const pakFile = path.join(tempDir, `${basename}_${hashPrefix}.pak`);
    console.log('[Main IPC] UI file:', uiFile);
    console.log('[Main IPC] PAK file:', pakFile);

    // 写入 .ui 文件
    fs.writeFileSync(uiFile, uiData, 'utf8');
    console.log('[Main IPC] UI file written');

    // 写入 .pak 文件
    const pakBuffer = Buffer.from(pakData);
    fs.writeFileSync(pakFile, pakBuffer);
    console.log('[Main IPC] PAK file written, size:', pakBuffer.length);

    // 查找viewer可执行文件路径
    const projectRoot = path.join(__dirname, '..');
    const viewerDir = path.join(projectRoot, 'ui', 'examples', 'viewer');
    
    // 根据平台选择执行方式
    let viewerCmd, viewerArgs;
    if (process.platform === 'win32') {
      // Windows: 检查是否有编译好的exe，否则使用go run
      const exePath = path.join(viewerDir, 'viewer.exe');
      console.log('[Main IPC] Checking for exe:', exePath);
      if (fs.existsSync(exePath)) {
        viewerCmd = exePath;
        viewerArgs = ['-silent', '-layout', uiFile];
        console.log('[Main IPC] Using exe');
      } else {
        viewerCmd = 'go';
        viewerArgs = ['run', 'main.go', '-silent', '-layout', uiFile];
        console.log('[Main IPC] Using go run');
      }
    } else {
      // Linux/Mac
      viewerCmd = 'go';
      viewerArgs = ['run', 'main.go', '-silent', '-layout', uiFile];
    }
    
    console.log('[Main IPC] Launching viewer:', viewerCmd, viewerArgs);
    // 启动viewer进程
    const viewerProcess = spawn(viewerCmd, viewerArgs, {
      cwd: viewerDir,
      detached: false,  // 改为false以便捕获输出
      stdio: ['ignore', 'pipe', 'pipe']  // 捕获stdout和stderr
    });
    
    console.log('[Main IPC] Viewer process spawned, PID:', viewerProcess.pid);
    
    // 捕获viewer的stdout输出
    viewerProcess.stdout.on('data', (data) => {
      console.log('[Viewer stdout]:', data.toString());
    });
    
    // 捕获viewer的stderr输出
    viewerProcess.stderr.on('data', (data) => {
      console.error('[Viewer stderr]:', data.toString());
    });
    
    // 监听进程退出
    viewerProcess.on('exit', (code, signal) => {
      console.log(`[Main IPC] Viewer process exited with code ${code}, signal ${signal}`);
    });
    
    // 监听错误
    viewerProcess.on('error', (err) => {
      console.error('[Main IPC] Viewer process error:', err);
    });
    
    // 不再使用 unref，让进程保持关联
    // viewerProcess.unref();
    
    // 清理临时文件（延迟删除，等viewer启动后）
    setTimeout(() => {
      try {
        if (fs.existsSync(uiFile)) fs.unlinkSync(uiFile);
        if (fs.existsSync(pakFile)) fs.unlinkSync(pakFile);
      } catch (err) {
        console.error('Failed to delete temp files:', err);
      }
    }, 10000);

    return { success: true };
  } catch (error) {
    console.error('启动 viewer 失败:', error);
    return { success: false, error: error.message };
  }
});

// 初始化 scripts 目录的 TypeScript 项目结构
async function ensureScriptsTypeScriptProject(scriptsDir) {
  try {
    // 检查 tsconfig.json
    const tsconfigPath = path.join(scriptsDir, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      console.log('[Main IPC] Creating tsconfig.json in scripts directory');
      const tsconfig = {
        compilerOptions: {
          target: "ES2015",
          module: "none",
          outDir: "./dist",
          removeComments: true,
          skipLibCheck: true,
          strict: false,
          noEmit: false,
          allowJs: true,
          moduleResolution: "node",
          esModuleInterop: false,
          allowSyntheticDefaultImports: false
        },
        include: ["**/*.ts"],
        exclude: ["node_modules", "dist"]
      };
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }
    
    // 检查并复制 ui_types.d.ts
    const dtsPath = path.join(scriptsDir, 'ui_types.d.ts');
    if (!fs.existsSync(dtsPath)) {
      console.log('[Main IPC] Creating ui_types.d.ts in scripts directory');
      const projectRoot = path.join(__dirname, '..');
      const sourceDtsPath = path.join(projectRoot, 'scripts_example', 'ui_types.d.ts');
      
      if (fs.existsSync(sourceDtsPath)) {
        fs.copyFileSync(sourceDtsPath, dtsPath);
        console.log('[Main IPC] Copied ui_types.d.ts from scripts_example');
      } else {
        // 如果找不到源文件，创建一个基础的类型声明
        const basicDts = `// UI Widget Types
interface UIButton {
  setText(text: string): void;
  setVisible(visible: boolean): void;
  setColor(r: number, g: number, b: number, a: number): void;
}

interface ButtonClickEvent {
  x: number;
  y: number;
  button: number;
}

interface HoverEvent {
  x: number;
  y: number;
}

declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
`;
        fs.writeFileSync(dtsPath, basicDts);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[Main IPC] Failed to ensure TypeScript project:', error);
    return false;
  }
}

// 编译 TypeScript 文件到 JavaScript
ipcMain.handle('compile-typescript', async (event, tsFilePath) => {
  const { spawn } = require('child_process');
  
  try {
    console.log('[Main IPC] Compiling TypeScript:', tsFilePath);
    
    // 确保 scripts 目录有 TypeScript 项目结构
    const scriptsDir = path.dirname(tsFilePath);
    await ensureScriptsTypeScriptProject(scriptsDir);
    
    // 创建输出目录
    const distDir = path.join(scriptsDir, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    const baseName = path.basename(tsFilePath, '.ts');
    const outputPath = path.join(distDir, `${baseName}.js`);
    
    // 找到 tsc 的路径
    const tscPath = path.join(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
    console.log('[Main IPC] Using tsc at:', tscPath);
    
    // 使用项目的 tsconfig.json 编译
    return new Promise((resolve, reject) => {
      const tsc = spawn(tscPath, [
        '--project', scriptsDir,
        '--outDir', distDir
      ], {
        shell: true,
        cwd: scriptsDir  // 在 scripts 目录下执行，这样会使用那里的 tsconfig.json
      });
      
      let stderr = '';
      let stdout = '';
      
      tsc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      tsc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      tsc.on('close', (code) => {
        console.log('[Main IPC] tsc exited with code:', code);
        if (stdout) console.log('[Main IPC] tsc stdout:', stdout);
        if (stderr) console.log('[Main IPC] tsc stderr:', stderr);
        
        // 编译成功时 code 为 0，但即使有 warnings 也可能生成文件
        // 检查输出文件是否存在
        if (fs.existsSync(outputPath)) {
          const jsCode = fs.readFileSync(outputPath, 'utf8');
          console.log('[Main IPC] TypeScript compiled successfully, output length:', jsCode.length);
          
          resolve({ success: true, code: jsCode });
        } else {
          // 如果没有找到输出文件，列出 dist 目录的内容来调试
          console.log('[Main IPC] Output file not found at:', outputPath);
          if (fs.existsSync(distDir)) {
            const files = fs.readdirSync(distDir);
            console.log('[Main IPC] Files in dist directory:', files);
            
            // 尝试读取第一个 .js 文件
            const jsFiles = files.filter(f => f.endsWith('.js'));
            if (jsFiles.length > 0) {
              const firstJsPath = path.join(distDir, jsFiles[0]);
              const jsCode = fs.readFileSync(firstJsPath, 'utf8');
              console.log('[Main IPC] Found alternative JS file:', jsFiles[0], 'length:', jsCode.length);
              resolve({ success: true, code: jsCode });
              return;
            }
          }
          
          const errorMsg = stderr || stdout || 'Compilation failed - no output file generated';
          console.error('[Main IPC] TypeScript compilation failed:', errorMsg);
          reject(new Error(errorMsg));
        }
      });
      
      tsc.on('error', (err) => {
        console.error('[Main IPC] Failed to spawn tsc:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('[Main IPC] TypeScript compilation error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-json-file', async (event, jsonData, defaultName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出UI布局',
      defaultPath: defaultName || 'layout.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { cancelled: true };
    }
    
    fs.writeFileSync(result.filePath, jsonData, 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Save JSON file error:', error);
    return { success: false, error: error.message };
  }
});

// 导出UI包（.ui + .pak）
ipcMain.handle('export-ui-package', async (event, packageData) => {
  try {
    const { uiData, pakData, hash } = packageData;
    
    // 选择保存位置
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出UI包',
      defaultPath: 'ui_layout.ui',
      filters: [
        { name: 'UI Files', extensions: ['ui'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { cancelled: true };
    }
    
    const uiPath = result.filePath;
    const baseName = path.basename(uiPath, '.ui');
    const dirName = path.dirname(uiPath);
    const pakPath = path.join(dirName, `${baseName}_${hash.substring(0, 8)}.pak`);
    
    // 保存.ui文件
    fs.writeFileSync(uiPath, uiData, 'utf8');
    
    // 保存.pak文件
    const pakBuffer = Buffer.from(pakData);
    fs.writeFileSync(pakPath, pakBuffer);
    
    return {
      success: true,
      uiPath: uiPath,
      pakPath: pakPath
    };
  } catch (error) {
    console.error('Export UI package error:', error);
    return { success: false, error: error.message };
  }
});

// ============ Script Editor IPC Handlers ============

// 读取目录
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    // 如果是绝对路径，直接使用；否则相对于 __dirname
    const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(__dirname, dirPath);
    const files = await fs.promises.readdir(fullPath);
    return files;
  } catch (error) {
    console.error('Read directory error:', error);
    throw error;
  }
});

// 读取文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    // 如果是绝对路径，直接使用；否则相对于 __dirname
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Read file error:', error);
    throw error;
  }
});

// 写入文件
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    // 如果是绝对路径，直接使用；否则相对于 __dirname
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    await fs.promises.writeFile(fullPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Write file error:', error);
    throw error;
  }
});

// 删除文件
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    // 如果是绝对路径，直接使用；否则相对于 __dirname
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    await fs.promises.unlink(fullPath);
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
});

// 确保目录存在
ipcMain.handle('ensure-dir', async (event, dirPath) => {
  try {
    // 如果是绝对路径，直接使用；否则相对于 __dirname
    const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(__dirname, dirPath);
    await fs.promises.mkdir(fullPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error('Ensure directory error:', error);
    throw error;
  }
});

// ============ External Editor Integration ============

const { spawn } = require('child_process');
const { shell } = require('electron');

// 打开外部编辑器
ipcMain.handle('open-external-editor', async (event, command, args) => {
  try {
    // 使用spawn启动外部进程
    const child = spawn(command, args, { 
      detached: true, 
      stdio: 'ignore',
      shell: true // Windows需要shell
    });
    
    // 允许子进程独立运行
    child.unref();
    
    return { success: true };
  } catch (error) {
    console.error('Failed to open external editor:', error);
    return { success: false, error: error.message };
  }
});

// 使用系统默认程序打开文件
ipcMain.handle('open-with-default', async (event, filePath) => {
  try {
    const fullPath = path.join(__dirname, filePath);
    const result = await shell.openPath(fullPath);
    
    if (result) {
      // 如果返回非空字符串，表示有错误
      return { success: false, error: result };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to open with default:', error);
    return { success: false, error: error.message };
  }
});

// Path utilities (for renderer process to use Node's path module)
ipcMain.handle('path-dirname', (event, filePath) => {
  return path.dirname(filePath);
});

ipcMain.handle('path-join', (event, ...paths) => {
  return path.join(...paths);
});

ipcMain.handle('path-basename', (event, filePath, ext) => {
  return path.basename(filePath, ext);
});
