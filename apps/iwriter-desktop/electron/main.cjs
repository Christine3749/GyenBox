const { app, BrowserWindow, ipcMain, Menu, nativeImage, session, shell } = require('electron');
const fs = require('node:fs');
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

function svgMenuIcon(key, body, template = true) {
  if (formatIconCache.has(key)) return formatIconCache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${body}</svg>`;
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
    .resize({ width: 16, height: 16 });
  if (process.platform === 'darwin' && template) image.setTemplateImage(true);
  formatIconCache.set(key, image);
  return image;
}

function focusMenuIcon() {
  return svgMenuIcon('focus-lines', `<g fill="none" stroke="#000" stroke-linecap="round">
    <path d="M2 3h10M2 6h7M2 9h11M2 12h6" stroke-width="1.35"/>
    <path d="M13.5 5.6H15M13.5 8.6h1" stroke-width="1.1" opacity=".6"/>
  </g>`);
}

function syntaxMenuIcon() {
  const colors = ['#D7A34D', '#EA9473', '#CB8FBC', '#76A7D0', '#8DBB70'];
  const rows = colors.map((color, index) => `<g fill="${color}">
    <circle cx="2" cy="${2.2 + index * 2.9}" r=".9"/>
    <rect x="4.5" y="${1.45 + index * 2.9}" width="${index % 2 ? 6.8 : 9}" height="1.5" rx=".75"/>
  </g>`).join('');
  return svgMenuIcon('syntax-grid', rows, false);
}

function textDecorationIcon(key, decoration) {
  const y = decoration === 'line-through' ? 8 : 12;
  return svgMenuIcon(key, `<text x="8" y="10.5" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
    font-size="8.5" font-weight="500" fill="#000">abc</text><path d="M2.5 ${y}h11" stroke="#000" stroke-width=".9"/>`);
}

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

function menuIconFilename(label) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.png`;
}

function nativeFormatIcon(label) {
  const key = `format-png:${label}`;
  if (formatIconCache.has(key)) return formatIconCache.get(key);
  const image = nativeImage
    .createFromPath(path.join(__dirname, 'assets/menu-icons', menuIconFilename(label)))
    .resize({ width: 16, height: 16 });
  if (process.platform === 'darwin' && label !== 'Highlight') image.setTemplateImage(true);
  formatIconCache.set(key, image);
  return image;
}

function formatCommand(label, command, accelerator, glyph, iconOptions) {
  return {
    ...commandItem(label, command, accelerator),
    icon: FORMAT_MENU_ICONS[label]
      ? nativeFormatIcon(label)
      : formatIcon(glyph, iconOptions),
  };
}

const menuSvg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${body}</svg>`;
const lineIcon = (body) => menuSvg(`<g fill="none" stroke="#000" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${body}</g>`);

// Deliberately drawn rather than substituted with emoji/font glyphs. These match the
// visual grammar of iA's 16 pt Format-menu symbols and stay aligned across OS fonts.
const FORMAT_MENU_ICONS = {
  Headings: lineIcon('<rect x="1.5" y="3" width="13" height="10" rx="5"/><path d="M4.5 10V6m0 2h3m0-2v4m2.2-2.8 1.5-1v3.8m-1.5 0h3"/>'),
  Lists: lineIcon('<circle cx="2.5" cy="4" r=".65" fill="#000" stroke="none"/><circle cx="2.5" cy="8" r=".65" fill="#000" stroke="none"/><circle cx="2.5" cy="12" r=".65" fill="#000" stroke="none"/><path d="M5 4h8.5M5 8h8.5M5 12h8.5"/>'),
  Blockquote: lineIcon('<path d="M2.2 5.7h3.3v2.6H3.2v2h2.3M8 5.7h5.3v2.6H8.9v2h4.4M2.2 13h11.1"/>'),
  Body: lineIcon('<path d="M2 3.2h12M2 6.4h12M2 9.6h12M2 12.8h12"/>'),
  Structure: lineIcon('<circle cx="2.3" cy="3.5" r=".7" fill="#000" stroke="none"/><circle cx="4.4" cy="7.7" r=".7" fill="#000" stroke="none"/><circle cx="6.5" cy="11.9" r=".7" fill="#000" stroke="none"/><path d="M4.8 3.5h8.7M6.9 7.7h6.6M9 11.9h4.5M2.3 6v2.1l2.1 1.3"/>'),
  Bold: menuSvg('<text x="8" y="12" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="12" font-weight="700" fill="#000">B</text>'),
  Italic: menuSvg('<text x="8" y="12" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-style="italic" font-weight="700" fill="#000">I</text>'),
  Strikethrough: menuSvg('<text x="8" y="12" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="11" fill="#000">S</text><path d="M3 8h10" stroke="#000" stroke-width="1.3"/>'),
  Highlight: menuSvg('<text x="8" y="11.5" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="11" font-weight="600" fill="#000">A</text><rect x="3" y="12.4" width="10" height="2.3" rx=".5" fill="#D7A52E"/>'),
  Code: lineIcon('<path d="M5.2 2.5c-1.7 0-2 .8-2 2.1v1.2c0 1-.5 1.7-1.5 1.7 1 0 1.5.7 1.5 1.7v1.2c0 1.3.3 2.1 2 2.1M10.8 2.5c1.7 0 2 .8 2 2.1v1.2c0 1 .5 1.7 1.5 1.7-1 0-1.5.7-1.5 1.7v1.2c0 1.3-.3 2.1-2 2.1"/>'),
  'Code Block': lineIcon('<rect x="2" y="2.3" width="12" height="11.4" rx="1.5"/><path d="M6 5.2c-1 0-1.2.5-1.2 1.2v.4c0 .6-.3 1-.9 1 .6 0 .9.4.9 1v.4c0 .7.2 1.2 1.2 1.2M10 5.2c1 0 1.2.5 1.2 1.2v.4c0 .6.3 1 .9 1-.6 0-.9.4-.9 1v.4c0 .7-.2 1.2-1.2 1.2"/>'),
  'Add Link': lineIcon('<path d="M6.5 10.4 5.1 11.8a2.7 2.7 0 0 1-3.8-3.8l2.2-2.2A2.7 2.7 0 0 1 7.3 5m2.2.6 1.4-1.4A2.7 2.7 0 1 1 14.7 8l-2.2 2.2a2.7 2.7 0 0 1-3.8.8M5.8 8h4.4"/>'),
  'Add Wikilink': lineIcon('<path d="M6.3 10.6 5 11.9A2.6 2.6 0 0 1 1.3 8.2l2.1-2.1A2.6 2.6 0 0 1 7 5.8m2.7-.4L11 4.1a2.6 2.6 0 1 1 3.7 3.7l-2.1 2.1a2.6 2.6 0 0 1-3.6.3M5.7 8h4.6M8 5.7v4.6"/>'),
  'Add Footnote': menuSvg('<text x="6.2" y="12" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="11" font-weight="600" fill="#000">A</text><text x="12" y="6.2" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="6.5" font-weight="700" fill="#000">1</text>'),
  'Add Content Block': lineIcon('<rect x="3" y="1.8" width="10" height="12.4" rx="1.4"/><path d="M5.5 5h5M5.5 7.6h5M5.5 10.2h3.2"/>'),
  'Add Hashtag': menuSvg('<text x="8" y="12.5" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="14" font-weight="600" fill="#000">#</text>'),
  'Add Date': lineIcon('<rect x="2" y="3.2" width="12" height="10.5" rx="1.5"/><path d="M2 6.2h12M5 1.8v3M11 1.8v3M4.5 8.6h1m2 0h1m2 0h1m-7 2.6h1m2 0h1m2 0h1"/>'),
  'Add Table': lineIcon('<rect x="1.8" y="2.5" width="12.4" height="11" rx="1.3"/><path d="M1.8 6.2h12.4M1.8 9.8h12.4M6 2.5v11"/>'),
  'Add Table of Contents': lineIcon('<rect x="2" y="2.2" width="12" height="11.6" rx="1.4"/><circle cx="4.4" cy="5" r=".55" fill="#000" stroke="none"/><circle cx="4.4" cy="8" r=".55" fill="#000" stroke="none"/><circle cx="4.4" cy="11" r=".55" fill="#000" stroke="none"/><path d="M6.4 5h5.2M6.4 8h5.2M6.4 11h4"/>'),
  'Add Horizontal Rule': lineIcon('<rect x="3" y="1.5" width="10" height="13" rx="1.5"/><path d="M5.2 8h5.6"/>'),
  'Add Page Break': lineIcon('<path d="M1.5 5h3V2.5M1.5 5 5 1.5M3.5 8H1.8v4.5h3.7M6.5 3h7v10h-7zM6.5 8h7"/>'),
  'Clear Styles': lineIcon('<rect x="2.3" y="2.3" width="11.4" height="11.4" rx="1.5"/><path d="m5.4 5.4 5.2 5.2m0-5.2-5.2 5.2"/>'),
};

function applyNativeMenuArtwork() {
  if (process.platform !== 'darwin') return;
  try {
    const menuStyle = require('./native/menu-style.node');
    const iconDir = path.join(__dirname, 'assets/menu-icons');
    const applied = Object.keys(FORMAT_MENU_ICONS).filter((label) => {
      const filename = menuIconFilename(label);
      const png = fs.readFileSync(path.join(iconDir, filename));
      return menuStyle.setMenuItemPngIcon(label, png, label !== 'Highlight');
    }).length;
    if (!app.isPackaged) {
      const retained = Object.keys(FORMAT_MENU_ICONS).filter(label => menuStyle.hasMenuItemIcon(label)).length;
      console.info(`[iWriter] installed ${applied}/${Object.keys(FORMAT_MENU_ICONS).length} native Format icons; retained ${retained}`);
    }
  } catch (error) {
    console.warn('[iWriter] native Format menu icons unavailable', error?.message || error);
  }
}

function applyNativeFocusColors() {
  if (process.platform !== 'darwin') return;
  try {
    const menuStyle = require('./native/menu-style.node');
    const colors = {
      Adjectives: '#D7A34D',
      Nouns: '#EA9473',
      Adverbs: '#CB8FBC',
      Verbs: '#76A7D0',
      Conjunctions: '#8DBB70',
    };
    const applied = Object.entries(colors)
      .filter(([label, color]) => menuStyle.setMenuItemColor(label, color)).length;
    if (!app.isPackaged) console.info(`[iWriter] styled ${applied}/5 native syntax labels`);
  } catch (error) {
    console.warn('[iWriter] native Focus menu colors unavailable', error?.message || error);
  }
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
        { role: 'close', label: 'Close Window', accelerator: 'Command+W' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'Format',
      submenu: [
        {
          label: 'Headings',
          icon: nativeFormatIcon('Headings'),
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
          icon: nativeFormatIcon('Lists'),
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
          icon: nativeFormatIcon('Structure'),
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
        { id: 'focus.toggle', ...commandItem('Enable Focus Mode', 'focus.toggle', 'Command+D'), icon: focusMenuIcon() },
        { id: 'focus.sentence', type: 'checkbox', checked: false, ...commandItem('Sentence', 'focus.sentence') },
        { id: 'focus.paragraph', type: 'checkbox', checked: false, ...commandItem('Paragraph', 'focus.paragraph') },
        { id: 'focus.typewriter', type: 'checkbox', checked: false, ...commandItem('Typewriter', 'focus.typewriter') },
        { type: 'separator' },
        { id: 'focus.syntax-toggle', ...commandItem('Show Syntax', 'focus.syntax-toggle', 'Shift+Command+D'), icon: syntaxMenuIcon() },
        { id: 'focus.syntax-adjectives', type: 'checkbox', checked: true, ...commandItem('Adjectives', 'focus.syntax-adjectives') },
        { id: 'focus.syntax-nouns', type: 'checkbox', checked: true, ...commandItem('Nouns', 'focus.syntax-nouns') },
        { id: 'focus.syntax-adverbs', type: 'checkbox', checked: true, ...commandItem('Adverbs', 'focus.syntax-adverbs') },
        { id: 'focus.syntax-verbs', type: 'checkbox', checked: true, ...commandItem('Verbs', 'focus.syntax-verbs') },
        { id: 'focus.syntax-conjunctions', type: 'checkbox', checked: true, ...commandItem('Conjunctions', 'focus.syntax-conjunctions') },
        { type: 'separator' },
        { id: 'focus.style-toggle', ...commandItem('Enable Style Check', 'focus.style-toggle', 'Alt+Shift+Command+D'), icon: textDecorationIcon('style-check', 'line-through') },
        { id: 'focus.style-fillers', ...formatCommand('Fillers', 'focus.style-fillers', undefined, '−', { size: 13, weight: 400 }) },
        { id: 'focus.style-cliches', ...formatCommand('Clichés', 'focus.style-cliches', undefined, '−', { size: 13, weight: 400 }) },
        { id: 'focus.style-redundancies', ...formatCommand('Redundancies', 'focus.style-redundancies', undefined, '−', { size: 13, weight: 400 }) },
        { id: 'focus.style-custom', ...formatCommand('Custom', 'focus.style-custom', undefined, '−', { size: 13, weight: 400 }) },
        { type: 'separator' },
        { id: 'focus.authors-toggle', ...commandItem('Hide Authors', 'focus.authors-toggle', 'Shift+Command+A'), icon: textDecorationIcon('authors', 'underline') },
        { id: 'focus.authors-human', type: 'checkbox', checked: true, ...commandItem('Human', 'focus.authors-human') },
        { id: 'focus.authors-ai', type: 'checkbox', checked: true, ...commandItem('AI', 'focus.authors-ai') },
        { id: 'focus.authors-reference', type: 'checkbox', checked: true, ...commandItem('Reference', 'focus.authors-reference') },
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

  const applicationMenu = Menu.buildFromTemplate(template);
  const formatMenu = applicationMenu.items.find(item => item.label === 'Format')?.submenu;
  // Electron reconstructs macOS application-menu rows when a submenu opens.
  // Reapply AppKit artwork after that reconstruction and before pixels are drawn.
  formatMenu?.on('menu-will-show', applyNativeMenuArtwork);
  Menu.setApplicationMenu(applicationMenu);
  setImmediate(() => {
    applyNativeFocusColors();
    applyNativeMenuArtwork();
  });
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
    const styleToggle = menu.getMenuItemById('focus.style-toggle');
    if (styleToggle) styleToggle.label = state.styleCheck === true ? 'Disable Style Check' : 'Enable Style Check';
    const authorsToggle = menu.getMenuItemById('focus.authors-toggle');
    if (authorsToggle) authorsToggle.label = state.authorsHighlight === true ? 'Hide Authors' : 'Show Authors';
    for (const kind of ['human', 'ai', 'reference']) {
      const item = menu.getMenuItemById(`focus.authors-${kind}`);
      if (item) item.checked = state.authorKinds?.[kind] !== false;
    }
  });
}

app.on('activate', () => focusMainWindow());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => cleanupFileHandlers?.());
