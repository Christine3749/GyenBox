import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell, Tray, screen } from "electron"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { mkdir } from "node:fs/promises"
import { DatabaseSync } from "node:sqlite"

import { SettingsStore } from "./settings-store.js"
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

  const userData = app.getPath("userData")
  settings = new SettingsStore(join(userData, "settings.json"), defaultSettings())
  await settings.load()
  await mkdir(settings.get().syncFolder, { recursive: true })

  db = new DatabaseSync(join(userData, "gyenbox-sync.db"))
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
    title: "GyenBox",
    frame: true,
    resizable: true,
    movable: true,
    skipTaskbar: false,
    backgroundColor: "#151515",
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
  const color = state === "error" ? "#B56B77" : state === "syncing" ? "#8896C6" : state === "paused" ? "#B3914E" : "#EDEBE6"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="5" fill="#15171A"/><path d="M16 7.5 25 12.7 16 18 7 12.7 16 7.5Z" fill="#E7EAF5" stroke="${color}" stroke-width="1.4"/><path d="M7 13 16 18v8.2L7 21.1V13Z" fill="#F4F2EE" stroke="${color}" stroke-width="1"/><path d="M25 13 16 18v8.2l9-5.1V13Z" fill="#DDE3F4" stroke="${color}" stroke-width="1"/></svg>`
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
}
