import { contextBridge, ipcRenderer } from "electron";

import type { DesktopSettings, DesktopSnapshot } from "../main/types.js";

const api = {
  getSnapshot: () =>
    ipcRenderer.invoke("desktop:getSnapshot") as Promise<DesktopSnapshot>,
  updateSettings: (input: Partial<DesktopSettings>) =>
    ipcRenderer.invoke(
      "desktop:updateSettings",
      input,
    ) as Promise<DesktopSnapshot>,
  chooseFolder: () =>
    ipcRenderer.invoke("desktop:chooseFolder") as Promise<DesktopSnapshot>,
  openFolder: () => ipcRenderer.invoke("desktop:openFolder") as Promise<void>,
  openSignIn: () => ipcRenderer.invoke("desktop:openSignIn") as Promise<void>,
  signOut: () =>
    ipcRenderer.invoke("desktop:signOut") as Promise<DesktopSnapshot>,
  togglePaused: () =>
    ipcRenderer.invoke("desktop:togglePaused") as Promise<DesktopSnapshot>,
  rescan: () =>
    ipcRenderer.invoke("desktop:rescan") as Promise<DesktopSnapshot>,
  retryFailed: () =>
    ipcRenderer.invoke("desktop:retryFailed") as Promise<DesktopSnapshot>,
  quit: () => ipcRenderer.invoke("desktop:quit") as Promise<void>,
  onSnapshot: (callback: (snapshot: DesktopSnapshot) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      snapshot: DesktopSnapshot,
    ) => callback(snapshot);
    ipcRenderer.on("sync:snapshot", listener);
    return () => ipcRenderer.off("sync:snapshot", listener);
  },
};

contextBridge.exposeInMainWorld("gyenboxDesktop", api);
