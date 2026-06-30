import { contextBridge, ipcRenderer } from "electron";

import type { SetupResult, SetupStepProgress } from "../main/setup-orchestrator.js";
import type { DesktopSettings, DesktopSnapshot } from "../main/types.js";

const api = {
  getAppVersion: () =>
    ipcRenderer.invoke("desktop:getAppVersion") as Promise<string>,
  getSnapshot: () =>
    ipcRenderer.invoke("desktop:getSnapshot") as Promise<DesktopSnapshot>,
  startSetup: () =>
    ipcRenderer.invoke("desktop:startSetup") as Promise<SetupResult>,
  repairSetup: () =>
    ipcRenderer.invoke("desktop:repairSetup") as Promise<SetupResult>,
  updateSettings: (input: Partial<DesktopSettings>) =>
    ipcRenderer.invoke(
      "desktop:updateSettings",
      input,
    ) as Promise<DesktopSnapshot>,
  chooseFolder: () =>
    ipcRenderer.invoke("desktop:chooseFolder") as Promise<DesktopSnapshot>,
  getSyncFolder: () =>
    ipcRenderer.invoke("desktop:getSyncFolder") as Promise<string>,
  chooseSetupFolder: () =>
    ipcRenderer.invoke("desktop:chooseSetupFolder") as Promise<string>,
  finishSetup: () => ipcRenderer.invoke("desktop:finishSetup") as Promise<void>,
  openFolder: () => ipcRenderer.invoke("desktop:openFolder") as Promise<void>,
  showStartShortcut: () =>
    ipcRenderer.invoke("desktop:showStartShortcut") as Promise<void>,
  openWeb: () => ipcRenderer.invoke("desktop:openWeb") as Promise<void>,
  openSignIn: () => ipcRenderer.invoke("desktop:openSignIn") as Promise<void>,
  signOut: () =>
    ipcRenderer.invoke("desktop:signOut") as Promise<DesktopSnapshot>,
  togglePaused: () =>
    ipcRenderer.invoke("desktop:togglePaused") as Promise<DesktopSnapshot>,
  rescan: () =>
    ipcRenderer.invoke("desktop:rescan") as Promise<DesktopSnapshot>,
  retryFailed: () =>
    ipcRenderer.invoke("desktop:retryFailed") as Promise<DesktopSnapshot>,
  repairExplorerStatus: () =>
    ipcRenderer.invoke(
      "desktop:repairExplorerStatus",
    ) as Promise<DesktopSnapshot>,
  quit: () => ipcRenderer.invoke("desktop:quit") as Promise<void>,
  onSetupProgress: (callback: (progress: SetupStepProgress) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: SetupStepProgress,
    ) => callback(progress);
    ipcRenderer.on("setup:progress", listener);
    return () => ipcRenderer.off("setup:progress", listener);
  },
  onSetupLanguage: (callback: (language: "en" | "zh") => void) => {
    const listener = (_event: Electron.IpcRendererEvent, language: "en" | "zh") => callback(language);
    ipcRenderer.on("setup:language", listener);
    return () => ipcRenderer.off("setup:language", listener);
  },
  onSetupVisible: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("setup:visible", listener);
    return () => ipcRenderer.off("setup:visible", listener);
  },
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
