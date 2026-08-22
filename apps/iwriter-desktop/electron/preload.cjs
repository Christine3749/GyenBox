const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  menu: {
    onCommand: (fn) => {
      const handler = (_event, command) => fn(command);
      ipcRenderer.on('iwriter:menu-command', handler);
      return () => ipcRenderer.removeListener('iwriter:menu-command', handler);
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    fullscreen: () => ipcRenderer.invoke('window:fullscreen'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
    onFullscreenState: (fn) => {
      const handler = (_event, value) => fn(value);
      ipcRenderer.on('window:fullscreen-state', handler);
      return () => ipcRenderer.removeListener('window:fullscreen-state', handler);
    },
    onMaximized: (fn) => {
      const handler = (_event, value) => fn(value);
      ipcRenderer.on('window:maximized', handler);
      return () => ipcRenderer.removeListener('window:maximized', handler);
    },
  },
  library: {
    scanAll: (paths) => ipcRenderer.invoke('library:scanAll', paths),
    readDir: (path) => ipcRenderer.invoke('library:readDir', path),
    watchFolder: (path) => ipcRenderer.send('library:watchFolder', path),
    unwatchFolder: () => ipcRenderer.send('library:unwatchFolder'),
    onCacheUpdate: (fn) => {
      const handler = (_event, value) => fn(value);
      ipcRenderer.on('library:cache-update', handler);
      return () => ipcRenderer.removeListener('library:cache-update', handler);
    },
    onFolderChanged: (fn) => {
      const handler = (_event, value) => fn(value);
      ipcRenderer.on('library:folderChanged', handler);
      return () => ipcRenderer.removeListener('library:folderChanged', handler);
    },
    delete: (path) => ipcRenderer.invoke('library:delete', path),
    showInExplorer: (path) => ipcRenderer.invoke('library:showInExplorer', path),
    rename: (path, name) => ipcRenderer.invoke('library:rename', path, name),
  },
  docviewer: {
    parseOffice: (path) => ipcRenderer.invoke('docviewer:parseOffice', path),
  },
  showOpenDialog: (options) => ipcRenderer.invoke('fs:showOpenDialog', options),
  readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path, text) => ipcRenderer.invoke('fs:writeFile', path, text),
  readFileBuffer: (path) => ipcRenderer.invoke('fs:readFileBuffer', path),
  writeFileBuffer: (path, base64) => ipcRenderer.invoke('fs:writeFileBuffer', path, base64),
});
