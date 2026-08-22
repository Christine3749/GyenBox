const { app, BrowserWindow, dialog, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const libraryCache = require('./ipc-library-cache.cjs');
const { getPathCapabilities } = require('./path-capabilities.cjs');
const { readFileTextBounded, readFileBase64Bounded } = require('./bounded-file-read.cjs');
const { renamePathNoReplace } = require('./safe-rename.cjs');
const { parseOfficeSafely, publicOfficeError } = require('./office-parser-runner.cjs');

const MAX_BASE64_WRITE_CHARS = 48 * 1024 * 1024;
let currentWatcher = null;
let currentWatchTimer = null;

function registerFileHandlers(ipcMain, policy) {
  const capabilities = getPathCapabilities(app);
  const trusted = (event) => policy.assertTrustedSender(event);
  const approved = (value) => capabilities.requireAllowed(value);
  const listable = (value) => capabilities.requireListableDirectory(value);

  const handle = (channel, handler) => ipcMain.handle(channel, async (event, ...args) => {
    trusted(event);
    return handler(event, ...args);
  });
  const on = (channel, handler) => ipcMain.on(channel, (event, ...args) => {
    try {
      trusted(event);
      handler(event, ...args);
    } catch {
      // Untrusted fire-and-forget IPC is intentionally ignored.
    }
  });

  function readAllowedEntries(folder) {
    const allowedFiles = capabilities.listAllowedFiles(folder);
    const names = allowedFiles ? allowedFiles.map((file) => path.basename(file)) : fs.readdirSync(folder);
    return names.map((name) => {
      try {
        const stat = fs.statSync(path.join(folder, name));
        return { name, lastModified: stat.mtimeMs, isDir: stat.isDirectory() };
      } catch { return null; }
    }).filter(Boolean);
  }

  handle('fs:showOpenDialog', async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const properties = Array.isArray(options?.properties)
      ? options.properties.filter((value) => ['openFile', 'openDirectory', 'multiSelections'].includes(value))
      : ['openFile'];
    const safeOptions = {
      properties,
      ...(Array.isArray(options?.filters) ? { filters: options.filters } : {}),
    };
    const result = window
      ? await dialog.showOpenDialog(window, safeOptions)
      : await dialog.showOpenDialog(safeOptions);
    if (!result.canceled) capabilities.grantDialogSelection(result.filePaths);
    return result;
  });

  handle('fs:readDir', (_event, value) => {
    try { return readAllowedEntries(listable(value)); } catch { return []; }
  });
  handle('fs:readFile', async (_event, value) => {
    try { return await readFileTextBounded(approved(value)); } catch { return ''; }
  });
  handle('fs:readFileBuffer', async (_event, value) => {
    try { return await readFileBase64Bounded(approved(value)); } catch { return ''; }
  });
  handle('fs:writeFile', (_event, value, text) => {
    try {
      fs.writeFileSync(approved(value), String(text), 'utf8');
      return true;
    } catch { return false; }
  });
  handle('fs:writeFileBuffer', (_event, value, base64) => {
    try {
      const input = String(base64);
      if (input.length > MAX_BASE64_WRITE_CHARS || !/^[A-Za-z0-9+/]*={0,2}$/.test(input)) return false;
      fs.writeFileSync(approved(value), Buffer.from(input, 'base64'));
      return true;
    } catch { return false; }
  });

  handle('library:scanAll', (event, values) => {
    for (const value of Array.isArray(values) ? values : []) {
      let folder;
      try { folder = listable(value); } catch { continue; }
      if (!capabilities.isDirectoryAllowed(folder)) {
        event.sender.send('library:cache-update', { folderPath: folder, entries: readAllowedEntries(folder) });
        continue;
      }
      libraryCache.startScan(folder, (folderPath, entries) => {
        if (!event.sender.isDestroyed()) event.sender.send('library:cache-update', { folderPath, entries });
      });
    }
  });
  handle('library:readDir', (event, value) => {
    let folder;
    try { folder = listable(value); } catch { return null; }
    if (!capabilities.isDirectoryAllowed(folder)) return readAllowedEntries(folder);
    const cached = libraryCache.getCache(folder);
    if (cached) return cached;
    libraryCache.startScan(folder, (folderPath, entries) => {
      if (!event.sender.isDestroyed()) event.sender.send('library:cache-update', { folderPath, entries });
    });
    return null;
  });
  on('library:watchFolder', (event, value) => {
    if (currentWatcher) currentWatcher.close();
    currentWatcher = null;
    if (!value) return;
    try {
      const folder = listable(value);
      currentWatcher = fs.watch(folder, { recursive: false }, () => {
        clearTimeout(currentWatchTimer);
        currentWatchTimer = setTimeout(() => {
          if (!event.sender.isDestroyed()) event.sender.send('library:folderChanged', folder);
        }, 300);
      });
      currentWatcher.on('error', () => { currentWatcher = null; });
    } catch {}
  });
  on('library:unwatchFolder', () => {
    if (currentWatcher) currentWatcher.close();
    currentWatcher = null;
  });
  handle('library:delete', async (_event, value) => {
    try {
      await shell.trashItem(approved(value));
      return { ok: true };
    } catch (error) { return { ok: false, error: error?.message || String(error) }; }
  });
  handle('library:showInExplorer', (_event, value) => {
    try { shell.showItemInFolder(approved(value)); return true; } catch { return false; }
  });
  handle('library:rename', (_event, value, newName) => {
    try {
      if (typeof newName !== 'string' || path.basename(newName) !== newName ||
          !newName.trim() || newName === '.' || newName === '..') {
        return { ok: false, error: 'invalid name' };
      }
      const source = approved(value);
      const target = capabilities.resolveRenameTarget(source, path.join(path.dirname(source), newName));
      renamePathNoReplace(source, target);
      capabilities.commitRename(source, target);
      return { ok: true, newPath: target };
    } catch (error) { return { ok: false, error: error?.message || String(error) }; }
  });
  handle('docviewer:parseOffice', async (_event, value) => {
    try {
      const file = approved(value);
      const extension = path.extname(file).toLowerCase();
      if (!['.docx', '.xlsx', '.xls'].includes(extension)) {
        return { ok: false, error: `不支持的格式：${extension}` };
      }
      return await parseOfficeSafely(file, extension);
    } catch (error) { return { ok: false, error: publicOfficeError(error) }; }
  });

  return () => {
    if (currentWatcher) currentWatcher.close();
    currentWatcher = null;
    libraryCache.stopAll();
  };
}

module.exports = { MAX_BASE64_WRITE_CHARS, registerFileHandlers };
