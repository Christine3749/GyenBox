const { app, BrowserWindow, ipcMain, Menu, nativeImage, session, shell } = require('electron');
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
  registerMenuStateHandler();
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

const formatIconCache = new Map();

function formatIcon(glyph, options = {}) {
  const key = `${glyph}:${options.size || 11}:${options.weight || 600}`;
  if (formatIconCache.has(key)) return formatIconCache.get(key);
  const escaped = String(glyph)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const size = options.size || 11;
  const weight = options.weight || 600;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <text x="8" y="11.7" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif"
      font-size="${size}" font-weight="${weight}" fill="#000">${escaped}</text>
  </svg>`;
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
    .resize({ width: 16, height: 16 });
  if (process.platform === 'darwin') image.setTemplateImage(true);
  formatIconCache.set(key, image);
  return image;
}

function formatCommand(label, command, accelerator, glyph, iconOptions) {
  return {
    ...commandItem(label, command, accelerator),
    icon: formatIcon(glyph, iconOptions),
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
        commandItem('Import…', 'file.import'),
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
        {
          label: 'Headings',
          icon: formatIcon('H1', { size: 8.5, weight: 700 }),
          submenu: [
            commandItem('Heading 1', 'format.heading-1', 'Command+1'),
            commandItem('Heading 2', 'format.heading-2', 'Command+2'),
            commandItem('Heading 3', 'format.heading-3', 'Command+3'),
            commandItem('Heading 4', 'format.heading-4', 'Command+4'),
            commandItem('Heading 5', 'format.heading-5', 'Command+5'),
            commandItem('Heading 6', 'format.heading-6', 'Command+6'),
          ],
        },
        {
          label: 'Lists',
          icon: formatIcon('☷', { size: 14, weight: 500 }),
          submenu: [
            commandItem('Bulleted List', 'format.bullet-list'),
            commandItem('Numbered List', 'format.numbered-list'),
            commandItem('Task List', 'format.task-list'),
          ],
        },
        formatCommand('Blockquote', 'format.blockquote', 'Command+Shift+.', '❝', { size: 13 }),
        formatCommand('Body', 'format.body', undefined, '☰', { size: 13, weight: 400 }),
        { type: 'separator' },
        {
          label: 'Structure',
          icon: formatIcon('☷', { size: 14, weight: 400 }),
          submenu: [
            commandItem('Indent', 'format.indent', 'Command+]'),
            commandItem('Outdent', 'format.outdent', 'Command+['),
          ],
        },
        { type: 'separator' },
        formatCommand('Bold', 'format.bold', 'Command+B', 'B', { size: 12, weight: 700 }),
        formatCommand('Italic', 'format.italic', 'Command+I', 'I', { size: 12, weight: 600 }),
        formatCommand('Strikethrough', 'format.strikethrough', 'Alt+Command+U', 'S̶', { size: 12 }),
        formatCommand('Highlight', 'format.highlight', 'Shift+Command+U', 'A̲', { size: 12, weight: 650 }),
        { type: 'separator' },
        formatCommand('Code', 'format.code', 'Command+J', '{}', { size: 10, weight: 600 }),
        formatCommand('Code Block', 'format.code-block', 'Shift+Command+J', '▣', { size: 12 }),
        { type: 'separator' },
        formatCommand('Add Link', 'format.add-link', 'Command+K', '↗', { size: 13 }),
        formatCommand('Add Wikilink', 'format.add-wikilink', 'Shift+Command+K', '⛓', { size: 11 }),
        formatCommand('Add Footnote', 'format.add-footnote', 'Control+Command+K', 'A¹', { size: 10, weight: 650 }),
        formatCommand('Add Content Block', 'format.add-content-block', undefined, '▤', { size: 12 }),
        formatCommand('Add Hashtag', 'format.add-hashtag', undefined, '#', { size: 13, weight: 600 }),
        { type: 'separator' },
        formatCommand('Add Date', 'format.add-date', undefined, '▦', { size: 12 }),
        formatCommand('Add Table', 'format.add-table', undefined, '▦', { size: 12 }),
        formatCommand('Add Table of Contents', 'format.add-toc', undefined, '▤', { size: 12 }),
        { type: 'separator' },
        formatCommand('Add Horizontal Rule', 'format.add-horizontal-rule', undefined, '—', { size: 13 }),
        formatCommand('Add Page Break', 'format.add-page-break', undefined, '↵', { size: 13 }),
        { type: 'separator' },
        formatCommand('Clear Styles', 'format.clear-styles', 'Alt+Command+Backspace', '⊠', { size: 12 }),
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
        { id: 'focus.toggle', ...commandItem('Enable Focus Mode', 'focus.toggle', 'Command+D') },
        { id: 'focus.sentence', type: 'checkbox', checked: false, ...commandItem('Sentence', 'focus.sentence') },
        { id: 'focus.paragraph', type: 'checkbox', checked: false, ...commandItem('Paragraph', 'focus.paragraph') },
        { id: 'focus.typewriter', type: 'checkbox', checked: false, ...commandItem('Typewriter', 'focus.typewriter') },
        { type: 'separator' },
        { id: 'focus.syntax-toggle', ...formatCommand('Show Syntax', 'focus.syntax-toggle', 'Shift+Command+D', '☷', { size: 13 }) },
        { id: 'focus.syntax-adjectives', type: 'checkbox', checked: true, ...commandItem('Adjectives', 'focus.syntax-adjectives') },
        { id: 'focus.syntax-nouns', type: 'checkbox', checked: true, ...commandItem('Nouns', 'focus.syntax-nouns') },
        { id: 'focus.syntax-adverbs', type: 'checkbox', checked: true, ...commandItem('Adverbs', 'focus.syntax-adverbs') },
        { id: 'focus.syntax-verbs', type: 'checkbox', checked: true, ...commandItem('Verbs', 'focus.syntax-verbs') },
        { id: 'focus.syntax-conjunctions', type: 'checkbox', checked: true, ...commandItem('Conjunctions', 'focus.syntax-conjunctions') },
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

function registerMenuStateHandler() {
  ipcMain.on('iwriter:menu-state', (event, state) => {
    policy.assertTrustedSender(event);
    if (!state || typeof state !== 'object') return;
    const menu = Menu.getApplicationMenu();
    if (!menu) return;
    const focusMode = ['off', 'sentence', 'paragraph'].includes(state.focusMode)
      ? state.focusMode
      : 'off';
    const toggle = menu.getMenuItemById('focus.toggle');
    if (toggle) toggle.label = focusMode === 'off' ? 'Enable Focus Mode' : 'Disable Focus Mode';
    const sentence = menu.getMenuItemById('focus.sentence');
    const paragraph = menu.getMenuItemById('focus.paragraph');
    const typewriter = menu.getMenuItemById('focus.typewriter');
    if (sentence) sentence.checked = focusMode === 'sentence';
    if (paragraph) paragraph.checked = focusMode === 'paragraph';
    if (typewriter) typewriter.checked = state.typewriter === true;
    const syntaxToggle = menu.getMenuItemById('focus.syntax-toggle');
    if (syntaxToggle) syntaxToggle.label = state.syntaxHighlight === true ? 'Hide Syntax' : 'Show Syntax';
    for (const part of ['adjectives', 'nouns', 'adverbs', 'verbs', 'conjunctions']) {
      const item = menu.getMenuItemById(`focus.syntax-${part}`);
      if (item) item.checked = state.syntaxParts?.[part] !== false;
    }
  });
}

app.on('activate', () => focusMainWindow());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => cleanupFileHandlers?.());
