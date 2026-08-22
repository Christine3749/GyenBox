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
  installApplicationMenu();
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  registerWindowHandlers();
  cleanupFileHandlers = registerFileHandlers(ipcMain, policy);
  createMainWindow();
}

function sendMenuCommand(command) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('iwriter:menu-command', command);
}

function commandItem(label, command, accelerator) {
  return {
    label,
    ...(accelerator ? { accelerator } : {}),
    click: () => sendMenuCommand(command),
  };
}

function installApplicationMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }

  const template = [
    {
      label: 'iWriter',
      submenu: [
        { role: 'about', label: 'About iWriter' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide iWriter' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit iWriter' },
      ],
    },
    {
      label: 'File',
      submenu: [
        commandItem('Import…', 'file.import', 'CmdOrCtrl+I'),
        { type: 'separator' },
        commandItem('Export as Markdown', 'file.export-markdown', 'CmdOrCtrl+E'),
        commandItem('Print…', 'file.print', 'CmdOrCtrl+P'),
        { type: 'separator' },
        commandItem('Close', 'file.close', 'Esc'),
      ],
    },
    { role: 'editMenu' },
    {
      label: 'Format',
      submenu: [
        commandItem('Heading 1', 'format.heading-1', 'CmdOrCtrl+1'),
        commandItem('Heading 2', 'format.heading-2', 'CmdOrCtrl+2'),
        commandItem('Heading 3', 'format.heading-3', 'CmdOrCtrl+3'),
        { type: 'separator' },
        commandItem('Bold', 'format.bold', 'CmdOrCtrl+B'),
        commandItem('Italic', 'format.italic', 'CmdOrCtrl+I'),
        commandItem('Code', 'format.code'),
        { type: 'separator' },
        commandItem('Blockquote', 'format.blockquote'),
        commandItem('Bullet List', 'format.bullet-list'),
      ],
    },
    {
      label: 'Authors',
      submenu: [
        { label: 'Writing Statistics', enabled: false },
        { type: 'separator' },
        { label: 'Set Word Goal…', enabled: false },
      ],
    },
    {
      label: 'Focus',
      submenu: [
        commandItem('Paragraph Focus', 'focus.paragraph', 'CmdOrCtrl+Shift+F'),
        commandItem('Sentence Focus', 'focus.sentence'),
        commandItem('No Focus', 'focus.none'),
        { type: 'separator' },
        commandItem('Typewriter Mode', 'focus.typewriter', 'CmdOrCtrl+Shift+T'),
        { type: 'separator' },
        commandItem('Day / Night Mode', 'focus.theme'),
      ],
    },
    {
      label: 'View',
      submenu: [
        commandItem('Writing', 'view.writing'),
        commandItem('Preview', 'view.preview', 'CmdOrCtrl+Shift+P'),
        commandItem('Split View', 'view.split', 'CmdOrCtrl+Alt+P'),
        { type: 'separator' },
        commandItem('64 Characters', 'view.line-64'),
        commandItem('72 Characters', 'view.line-72'),
        commandItem('80 Characters', 'view.line-80'),
        { type: 'separator' },
        commandItem('iA Writer Mono', 'view.font-mono'),
        commandItem('iA Writer Quattro', 'view.font-quattro'),
        { type: 'separator' },
        commandItem('Larger Text', 'view.text-larger', 'CmdOrCtrl+='),
        commandItem('Smaller Text', 'view.text-smaller', 'CmdOrCtrl+-'),
        { type: 'separator' },
        commandItem('Show / Hide Library', 'view.toggle-library', 'CmdOrCtrl+Shift+L'),
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Keyboard Shortcuts', enabled: false },
        { type: 'separator' },
        { label: 'iWriter by GyenBox', enabled: false },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
