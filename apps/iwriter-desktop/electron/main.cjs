const { app, BrowserWindow, ipcMain, Menu, session, shell } = require('electron');
const path = require('node:path');
const { PRODUCTION_URL, createSecurityPolicy } = require('./security-policy.cjs');
const { registerFileHandlers } = require('./ipc-files.cjs');

app.setName('iWriter');
app.setPath('userData', path.join(app.getPath('appData'), 'GyenBox iWriter'));
if (process.platform === 'win32') app.setAppUserModelId('com.gyenbox.iwriter');

const appUrl = app.isPackaged ? PRODUCTION_URL : (process.env.IWRITER_DESKTOP_URL || PRODUCTION_URL);
const policy = createSecurityPolicy(appUrl);
let mainWindow = null;
let cleanupFileHandlers = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => focusMainWindow());
  app.whenReady().then(bootstrap).catch((error) => {
    console.error('[iWriter] startup failed', error);
    app.quit();
  });
}

async function bootstrap() {
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  registerWindowHandlers();
  cleanupFileHandlers = registerFileHandlers(ipcMain, policy);
  createMainWindow();
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return focusMainWindow();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b1020',
    frame: process.platform !== 'win32',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false));
  mainWindow.on('enter-full-screen', () => mainWindow?.webContents.send('window:fullscreen-state', true));
  mainWindow.on('leave-full-screen', () => mainWindow?.webContents.send('window:fullscreen-state', false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (policy.isExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (policy.isTrustedUrl(url)) return;
    event.preventDefault();
    if (policy.isExternalUrl(url)) void shell.openExternal(url);
  });
  void mainWindow.loadURL(policy.appUrl);
}

function focusMainWindow() {
  if (!app.isReady()) return;
  if (!mainWindow || mainWindow.isDestroyed()) return createMainWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function registerWindowHandlers() {
  const handle = (channel, action) => ipcMain.handle(channel, (event) => {
    policy.assertTrustedSender(event);
    const window = BrowserWindow.fromWebContents(event.sender);
    return action(window);
  });
  handle('window:minimize', (window) => window?.minimize());
  handle('window:maximize', (window) => {
    if (!window) return false;
    window.isMaximized() ? window.unmaximize() : window.maximize();
    return window.isMaximized();
  });
  handle('window:fullscreen', (window) => {
    if (!window) return false;
    window.setFullScreen(!window.isFullScreen());
    return window.isFullScreen();
  });
  handle('window:close', (window) => window?.close());
  handle('window:isMaximized', (window) => window?.isMaximized() || false);
  handle('window:isFullscreen', (window) => window?.isFullScreen() || false);
}

app.on('activate', () => focusMainWindow());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => cleanupFileHandlers?.());
