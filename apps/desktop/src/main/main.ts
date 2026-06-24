import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell, Tray, screen } from "electron"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { mkdir } from "node:fs/promises"
import { DatabaseSync } from "node:sqlite"

import { SettingsStore } from "./settings-store.js"
import { startSyncCore, type SyncCoreHandle } from "./sync-core-process.js"
import { SyncEngine } from "./sync-engine.js"
import type { DesktopSettings, DesktopSnapshot } from "./types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rendererPath = join(__dirname, "..", "renderer", "index.html")
const preloadPath = join(__dirname, "..", "preload", "preload.js")

let panelWindow: BrowserWindow | null = null
let tray: Tray | null = null
let engine: SyncEngine | null = null
let settings: SettingsStore | null = null
let db: DatabaseSync | null = null
let syncCore: SyncCoreHandle | null = null
let isQuitting = false
const isSmokeTest =
  process.env.GYENBOX_DESKTOP_SMOKE_TEST === "1" ||
  process.argv.includes("--smoke-test") ||
  app.commandLine.hasSwitch("smoke-test")

app.setAppUserModelId("com.gyenbox.desktop")

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
  process.exit(0)
}

app.on("second-instance", () => {
  if (app.isReady()) showPanel()
})

void app.whenReady().then(bootstrap).catch((error) => {
  console.error("Failed to start GyenBox", error)
  app.quit()
})

async function bootstrap() {
  if (isSmokeTest) {
    app.quit()
    return
  }

  Menu.setApplicationMenu(null)

  const userData = app.getPath("userData")
  settings = new SettingsStore(join(userData, "settings.json"), defaultSettings())
  await settings.load()
  await mkdir(settings.get().syncFolder, { recursive: true })

  db = new DatabaseSync(join(userData, "gyenbox-sync.db"))
  syncCore = startSyncCore(settings.get().syncFolder, (event) => {
    console.info("[gyenbox-sync]", event)
  })

  engine = new SyncEngine(db, settings)
  engine.on("snapshot", (snapshot: DesktopSnapshot) => {
    panelWindow?.webContents.send("sync:snapshot", snapshot)
    updateTray(snapshot)
  })

  createPanelWindow()
  createTray()
  registerIpc()
  showPanel()
  void engine.start().then(() => {
    const snapshot = currentSnapshot()
    panelWindow?.webContents.send("sync:snapshot", snapshot)
    updateTray(snapshot)
  }).catch((error) => {
    console.error("Failed to start GyenBox sync engine", error)
  })
}


app.on("activate", () => {
  if (!panelWindow) createPanelWindow()
  showPanel()
})

app.on("window-all-closed", () => {
  // Keep the sync engine alive in the tray.
})

app.on("before-quit", async () => {
  isQuitting = true
  syncCore?.stop()
  await engine?.stop()
  db?.close()
})

function defaultSettings(): DesktopSettings {
  return {
    apiBaseUrl: process.env.GYENBOX_API_BASE_URL ?? "https://gyenbox.com",
    accessToken: process.env.GYENBOX_ACCESS_TOKEN ?? "",
    syncFolder: join(homedir(), "GyenBox"),
    paused: false,
  }
}

function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 380,
    minHeight: 520,
    show: true,
    center: true,
    title: "GyenBox Desktop",
    frame: true,
    resizable: true,
    movable: true,
    autoHideMenuBar: true,
    skipTaskbar: false,
    backgroundColor: "#151515",
    icon: createAppIcon(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  panelWindow.loadFile(rendererPath)
  panelWindow.webContents.once("did-finish-load", () => {
    panelWindow?.show()
    panelWindow?.focus()
    panelWindow?.moveTop()
  })
  panelWindow.on("close", (event) => {
    if (isQuitting) return
    event.preventDefault()
    panelWindow?.hide()
  })
  panelWindow.on("closed", () => {
    panelWindow = null
  })
}

function createTray() {
  tray = new Tray(createTrayIcon("idle"))
  tray.setToolTip("GyenBox")
  tray.on("click", () => togglePanel())
  tray.on("right-click", () => tray?.popUpContextMenu(contextMenu()))
}

function contextMenu() {
  const snapshot = engine?.snapshot()
  return Menu.buildFromTemplate([
    { label: snapshot?.summary.lastMessage ?? "GyenBox", enabled: false },
    { type: "separator" },
    { label: "Open panel", click: () => showPanel() },
    { label: "Open GyenBox folder", click: () => void shell.openPath(currentSettings().syncFolder) },
    { label: currentSettings().paused ? "Resume sync" : "Pause sync", click: () => void engine?.setPaused(!currentSettings().paused) },
    { type: "separator" },
    { label: "Quit GyenBox", click: () => app.quit() },
  ])
}

function togglePanel() {
  if (!panelWindow) createPanelWindow()
  if (panelWindow?.isVisible()) panelWindow.hide()
  else showPanel()
}

function showPanel() {
  if (!panelWindow) return
  if (tray) positionPanelNearTray()
  else panelWindow.center()
  panelWindow.show()
  panelWindow.focus()
  panelWindow.moveTop()
  panelWindow.webContents.send("sync:snapshot", currentSnapshot())
}

function positionPanelNearTray() {
  if (!panelWindow) return
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const workArea = display.workArea
  const bounds = panelWindow.getBounds()
  panelWindow.setPosition(
    Math.round(workArea.x + workArea.width - bounds.width - 18),
    Math.round(workArea.y + workArea.height - bounds.height - 18),
  )
}

function registerIpc() {
  ipcMain.handle("desktop:getSnapshot", () => currentSnapshot())
  ipcMain.handle("desktop:updateSettings", async (_event, input: Partial<DesktopSettings>) => engine ? engine.updateSettings(input) : currentSnapshot())
  ipcMain.handle("desktop:togglePaused", async () => engine ? engine.setPaused(!currentSettings().paused) : currentSnapshot())
  ipcMain.handle("desktop:rescan", async () => engine ? engine.rescan() : currentSnapshot())
  ipcMain.handle("desktop:retryFailed", async () => engine ? engine.retryFailed() : currentSnapshot())
  ipcMain.handle("desktop:openFolder", async () => shell.openPath(currentSettings().syncFolder))
  ipcMain.handle("desktop:chooseFolder", async () => {
    const dialogOptions = {
      title: "Choose GyenBox sync folder",
      defaultPath: currentSettings().syncFolder,
      properties: ["openDirectory", "createDirectory"] as Array<"openDirectory" | "createDirectory">,
    }
    const result = panelWindow
      ? await dialog.showOpenDialog(panelWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || !result.filePaths[0]) return currentSnapshot()
    return engine ? engine.updateSettings({ syncFolder: result.filePaths[0] }) : currentSnapshot()
  })
  ipcMain.handle("desktop:quit", () => app.quit())
}

function currentSettings(): DesktopSettings {
  return settings?.get() ?? defaultSettings()
}
function currentSnapshot(): DesktopSnapshot {
  try {
    const snapshot = engine?.snapshot()
    if (snapshot) return snapshot
  } catch {
    // The sync database may still be initializing while the first window paints.
  }

  const snapshotSettings = currentSettings()
  return {
    settings: snapshotSettings,
    summary: {
      state: "syncing",
      syncFolder: snapshotSettings.syncFolder,
      apiBaseUrl: snapshotSettings.apiBaseUrl,
      accessTokenConfigured: Boolean(snapshotSettings.accessToken.trim()),
      paused: snapshotSettings.paused,
      queued: 0,
      syncing: 0,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
      lastMessage: "Starting GyenBox desktop.",
      updatedAt: new Date().toISOString(),
    },
    activity: [],
  }
}
function updateTray(snapshot: DesktopSnapshot) {
  const state = snapshot.summary.state
  tray?.setImage(createTrayIcon(state))
  tray?.setToolTip(`GyenBox - ${snapshot.summary.lastMessage}`)
  tray?.setContextMenu(contextMenu())
}

function createTrayIcon(state: string) {
  const color = state === "error" ? "#BD6F7C" : state === "syncing" ? "#6F8FFF" : state === "paused" ? "#C49A4F" : "#5F74C4"
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(trayIconSvg(color))}`)
  return image.resize({ width: 16, height: 16 })
}

function trayIconSvg(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="7" fill="#17191B"/><path d="M16 6.8 25 12 16 17.1 7 12 16 6.8Z" fill="#F7F4EC"/><path d="M7 12.6 16 17.7v8.4L7 21V12.6Z" fill="#E8E3DA"/><path d="M25 12.6 16 17.7v8.4L25 21V12.6Z" fill="#DDE3F4"/><path d="M11.2 12 16 9.3 20.8 12 16 14.7 11.2 12Z" fill="#FFFFFF" stroke="${accent}" stroke-width="1.4"/><path d="M12.5 19.4c0 2 1.5 3.2 3.7 3.2h3.2" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/></svg>`
}
function createAppIcon() {
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(brandIconSvg("#5F74C4"))}`)
}

function brandIconSvg(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="6.5" y="6.5" width="51" height="51" rx="5.5" fill="#FFFDF9" stroke="#C8C1B8"/><path d="M32 11.5 51 22.3 32 33 13 22.3 32 11.5Z" fill="#E7EAF5" stroke="#1A1A1A" stroke-opacity=".52" stroke-width="1.4"/><path d="M13 22.5 32 33.2v19.3L13 41.8V22.5Z" fill="#F4F2EE" stroke="#1A1A1A" stroke-opacity=".42" stroke-width="1.4"/><path d="M51 22.5 32 33.2v19.3l19-10.7V22.5Z" fill="#DDE3F4" stroke="#1A1A1A" stroke-opacity=".42" stroke-width="1.4"/><path d="M22.2 22.6 32 17.1l9.8 5.5L32 28.1l-9.8-5.5Z" fill="#FFFDF9" stroke="${accent}" stroke-width="1.7"/><path d="M24.8 38.2c0 3.8 3 6.4 7.2 6.4h7.8" stroke="${accent}" stroke-width="3.4" stroke-linecap="round"/><path d="M24.8 38.2h-4.6v-6.9" stroke="#8896C6" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M39.5 38.3h-7.1" stroke="#1A1A1A" stroke-opacity=".72" stroke-width="2.8" stroke-linecap="round"/></svg>`
}





