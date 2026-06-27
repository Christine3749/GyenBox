import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
  screen,
} from "electron";
import { randomUUID } from "node:crypto";
import { homedir, hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

import { registerCloudSyncRoot, markCloudFileStatus } from "./cloud-files.js";
import { SettingsStore } from "./settings-store.js";
import { startSyncCore, type SyncCoreHandle } from "./sync-core-process.js";
import type { FileStatus } from "./sync-types.js";
import { SyncEngine } from "./sync-engine.js";
import type { DesktopSettings, DesktopSnapshot } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rendererPath = join(__dirname, "..", "renderer", "index.html");
const preloadPath = join(__dirname, "..", "preload", "preload.js");

let panelWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let engine: SyncEngine | null = null;
let settings: SettingsStore | null = null;
let db: DatabaseSync | null = null;
let syncCore: SyncCoreHandle | null = null;
let isQuitting = false;
const PANEL_WIDTH = 820;
const PANEL_HEIGHT = 940;
let choosingFolder = false;
let pendingDesktopAuthState: string | null = null;
const startupDesktopAuthUrl = findDesktopAuthUrl(process.argv);
const isSmokeTest =
  process.env.GYENBOX_DESKTOP_SMOKE_TEST === "1" ||
  process.argv.includes("--smoke-test") ||
  app.commandLine.hasSwitch("smoke-test");

app.setAppUserModelId("com.gyenbox.desktop");
registerProtocolClient();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", (_event, commandLine) => {
  const authUrl = findDesktopAuthUrl(commandLine);
  if (authUrl) void handleDesktopAuthCallback(authUrl);
  if (app.isReady()) showPanel();
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  if (url) void handleDesktopAuthCallback(url);
});

void app
  .whenReady()
  .then(bootstrap)
  .catch((error) => {
    console.error("Failed to start GyenBox", error);
    app.quit();
  });

async function bootstrap() {
  if (isSmokeTest) {
    app.quit();
    return;
  }

  Menu.setApplicationMenu(null);

  const userData = app.getPath("userData");
  settings = new SettingsStore(
    join(userData, "settings.json"),
    defaultSettings(),
  );
  await settings.load();
  await mkdir(settings.get().syncFolder, { recursive: true });
  registerCloudSyncRoot(settings.get().syncFolder);

  db = new DatabaseSync(join(userData, "gyenbox-sync.db"));
  syncCore = startSyncCore(settings.get().syncFolder, (event) => {
    console.info("[gyenbox-sync]", event);
  });

  engine = new SyncEngine(db, settings, (relativePath, status) => {
    markCloudFileStatus(currentSettings().syncFolder, relativePath, status);
  });
  engine.on("snapshot", (snapshot: DesktopSnapshot) => {
    panelWindow?.webContents.send("sync:snapshot", publicSnapshot(snapshot));
    updateTray(snapshot);
  });

  createPanelWindow();
  createTray();
  registerIpc();
  showPanel();

  if (startupDesktopAuthUrl)
    void handleDesktopAuthCallback(startupDesktopAuthUrl);

  void engine
    .start()
    .then(() => {
      const snapshot = currentSnapshot();
      panelWindow?.webContents.send("sync:snapshot", publicSnapshot(snapshot));
      updateTray(snapshot);
      applyKnownCloudFileStatuses();
    })
    .catch((error) => {
      console.error("Failed to start GyenBox sync engine", error);
    });
}

app.on("activate", () => {
  if (!panelWindow) createPanelWindow();
  showPanel();
});

app.on("window-all-closed", () => {
  // Keep the sync engine alive in the tray.
});

app.on("before-quit", async () => {
  isQuitting = true;
  syncCore?.stop();
  await engine?.stop();
  db?.close();
});

function defaultSettings(): DesktopSettings {
  return {
    apiBaseUrl: process.env.GYENBOX_API_BASE_URL ?? "https://gyenbox.com",
    accessToken: process.env.GYENBOX_ACCESS_TOKEN ?? "",
    refreshToken: process.env.GYENBOX_REFRESH_TOKEN ?? "",
    tokenExpiresAt: null,
    accountEmail: null,
    syncFolder: join(homedir(), "GyenBox"),
    paused: false,
  };
}

function registerProtocolClient() {
  try {
    const runningDefaultApp = Boolean(
      (process as NodeJS.Process & { defaultApp?: boolean }).defaultApp,
    );
    if (runningDefaultApp && process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("gyenbox", process.execPath, [
        process.argv[1],
      ]);
      return;
    }
    app.setAsDefaultProtocolClient("gyenbox");
  } catch (error) {
    console.warn("Could not register gyenbox:// protocol", error);
  }
}

function desktopSignInUrl() {
  const baseUrl = currentSettings().apiBaseUrl.trim() || "https://gyenbox.com";
  pendingDesktopAuthState = randomUUID();

  try {
    const url = new globalThis.URL("/desktop/authorize", baseUrl);
    url.searchParams.set("state", pendingDesktopAuthState);
    url.searchParams.set("deviceName", deviceName());
    url.searchParams.set("platform", process.platform);
    url.searchParams.set("appVersion", app.getVersion());
    return url.toString();
  } catch {
    const fallback = new globalThis.URL(
      "https://gyenbox.com/desktop/authorize",
    );
    fallback.searchParams.set("state", pendingDesktopAuthState);
    fallback.searchParams.set("deviceName", deviceName());
    fallback.searchParams.set("platform", process.platform);
    fallback.searchParams.set("appVersion", app.getVersion());
    return fallback.toString();
  }
}

function deviceName() {
  return process.env.COMPUTERNAME || hostname() || "Windows PC";
}

function findDesktopAuthUrl(argv: readonly string[]) {
  return (
    argv.find((value) => value.startsWith("gyenbox://auth/callback")) ?? null
  );
}

async function handleDesktopAuthCallback(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (
    parsed.protocol !== "gyenbox:" ||
    parsed.hostname !== "auth" ||
    parsed.pathname !== "/callback"
  )
    return false;

  const callbackState = parsed.searchParams.get("state") ?? "";
  if (!pendingDesktopAuthState || callbackState !== pendingDesktopAuthState) {
    console.warn("Ignored desktop auth callback with stale state.");
    showPanel();
    return false;
  }

  const accessToken = parsed.searchParams.get("access_token")?.trim() ?? "";
  if (!accessToken) {
    console.warn("Ignored desktop auth callback without an access token.");
    showPanel();
    return false;
  }

  pendingDesktopAuthState = null;
  const input: Partial<DesktopSettings> = {
    accessToken,
    refreshToken: parsed.searchParams.get("refresh_token")?.trim() ?? "",
    tokenExpiresAt: parseExpiresAt(parsed.searchParams.get("expires_at")),
    accountEmail: parsed.searchParams.get("email")?.trim() || null,
  };

  const snapshot = engine
    ? await engine.updateSettings(input)
    : await updateSettingsBeforeEngine(input);
  panelWindow?.webContents.send("sync:snapshot", publicSnapshot(snapshot));
  updateTray(snapshot);
  showPanel();
  return true;
}

function parseExpiresAt(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0)
    return new Date(seconds * 1000).toISOString();
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

async function updateSettingsBeforeEngine(input: Partial<DesktopSettings>) {
  await settings?.update(input);
  return currentSnapshot();
}

function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    show: false,
    center: false,
    title: "GyenBox Desktop",
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    skipTaskbar: true,
    backgroundColor: "#151515",
    icon: createAppIcon(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  panelWindow.loadFile(rendererPath);
  panelWindow.webContents.once("did-finish-load", () => {
    panelWindow?.webContents.send(
      "sync:snapshot",
      publicSnapshot(currentSnapshot()),
    );
  });
  panelWindow.on("blur", () => {
    if (!isQuitting && !choosingFolder) panelWindow?.hide();
  });
  panelWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    panelWindow?.hide();
  });
  panelWindow.on("closed", () => {
    panelWindow = null;
  });
}

function createTray() {
  tray = new Tray(createTrayIcon("idle"));
  tray.setToolTip("GyenBox");
  tray.on("click", () => togglePanel());
  tray.on("right-click", () => tray?.popUpContextMenu(contextMenu()));
}

function contextMenu() {
  const snapshot = engine?.snapshot();
  return Menu.buildFromTemplate([
    { label: snapshot?.summary.lastMessage ?? "GyenBox", enabled: false },
    { type: "separator" },
    { label: "Open panel", click: () => showPanel() },
    {
      label: "Open GyenBox folder",
      click: () => void shell.openPath(currentSettings().syncFolder),
    },
    {
      label: currentSettings().paused ? "Resume sync" : "Pause sync",
      click: () => void engine?.setPaused(!currentSettings().paused),
    },
    { type: "separator" },
    { label: "Quit GyenBox", click: () => app.quit() },
  ]);
}

function togglePanel() {
  if (!panelWindow) createPanelWindow();
  if (panelWindow?.isVisible()) panelWindow.hide();
  else showPanel();
}

function showPanel() {
  if (!panelWindow) return;
  if (tray) positionPanelNearTray();
  else panelWindow.center();
  panelWindow.show();
  panelWindow.focus();
  panelWindow.moveTop();
  panelWindow.webContents.send(
    "sync:snapshot",
    publicSnapshot(currentSnapshot()),
  );
}

function positionPanelNearTray() {
  if (!panelWindow) return;
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const bounds = panelWindow.getBounds();
  panelWindow.setPosition(
    Math.round(workArea.x + workArea.width - bounds.width - 12),
    Math.round(workArea.y + workArea.height - bounds.height),
  );
}

function applyKnownCloudFileStatuses() {
  if (!db) return;
  try {
    const rows = db
      .prepare(
        "SELECT relative_path, status FROM local_files WHERE status IN ('queued', 'syncing', 'uploaded', 'failed')",
      )
      .all();
    for (const row of rows) {
      markCloudFileStatus(
        currentSettings().syncFolder,
        String(row.relative_path ?? ""),
        String(row.status ?? "queued") as FileStatus,
      );
    }
  } catch (error) {
    console.warn(
      "[gyenbox-cloud-files] could not apply existing file states",
      error,
    );
  }
}

async function updateDesktopSettings(input: Partial<DesktopSettings>) {
  const previousFolder = currentSettings().syncFolder;
  const snapshot = engine
    ? await engine.updateSettings(input)
    : await updateSettingsBeforeEngine(input);
  if (snapshot.settings.syncFolder !== previousFolder) {
    registerCloudSyncRoot(snapshot.settings.syncFolder);
    applyKnownCloudFileStatuses();
  }
  return snapshot;
}

function registerIpc() {
  ipcMain.handle("desktop:getAppVersion", () => app.getVersion());
  ipcMain.handle("desktop:getSnapshot", () =>
    publicSnapshot(currentSnapshot()),
  );
  ipcMain.handle(
    "desktop:updateSettings",
    async (_event, input: Partial<DesktopSettings>) =>
      publicSnapshot(await updateDesktopSettings(input)),
  );
  ipcMain.handle("desktop:togglePaused", async () =>
    publicSnapshot(
      engine
        ? await engine.setPaused(!currentSettings().paused)
        : currentSnapshot(),
    ),
  );
  ipcMain.handle("desktop:rescan", async () =>
    publicSnapshot(engine ? await engine.rescan() : currentSnapshot()),
  );
  ipcMain.handle("desktop:retryFailed", async () =>
    publicSnapshot(engine ? await engine.retryFailed() : currentSnapshot()),
  );
  ipcMain.handle("desktop:openFolder", async () =>
    shell.openPath(currentSettings().syncFolder),
  );
  ipcMain.handle("desktop:openSignIn", async () =>
    shell.openExternal(desktopSignInUrl()),
  );
  ipcMain.handle("desktop:signOut", async () => {
    const input = {
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: null,
      accountEmail: null,
    };
    return publicSnapshot(await updateDesktopSettings(input));
  });
  ipcMain.handle("desktop:chooseFolder", async () => {
    const dialogOptions = {
      title: "Choose GyenBox sync folder",
      defaultPath: currentSettings().syncFolder,
      properties: ["openDirectory", "createDirectory"] as Array<
        "openDirectory" | "createDirectory"
      >,
    };
    choosingFolder = true;
    try {
      const result = panelWindow
        ? await dialog.showOpenDialog(panelWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);
      if (result.canceled || !result.filePaths[0])
        return publicSnapshot(currentSnapshot());
      return publicSnapshot(
        engine
          ? await updateDesktopSettings({ syncFolder: result.filePaths[0] })
          : currentSnapshot(),
      );
    } finally {
      choosingFolder = false;
      showPanel();
    }
  });
  ipcMain.handle("desktop:quit", () => app.quit());
}

function currentSettings(): DesktopSettings {
  return settings?.get() ?? defaultSettings();
}
function currentSnapshot(): DesktopSnapshot {
  try {
    const snapshot = engine?.snapshot();
    if (snapshot) return snapshot;
  } catch {
    // The sync database may still be initializing while the first window paints.
  }

  const snapshotSettings = currentSettings();
  const accessTokenConfigured = Boolean(
    snapshotSettings.accessToken.trim() || snapshotSettings.refreshToken.trim(),
  );
  return {
    settings: snapshotSettings,
    summary: {
      state: accessTokenConfigured ? "syncing" : "needs-auth",
      syncFolder: snapshotSettings.syncFolder,
      apiBaseUrl: snapshotSettings.apiBaseUrl,
      accessTokenConfigured,
      accountEmail: snapshotSettings.accountEmail,
      paused: snapshotSettings.paused,
      queued: 0,
      syncing: 0,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
      lastMessage: accessTokenConfigured
        ? "Starting GyenBox desktop."
        : "Sign in to start uploading.",
      updatedAt: new Date().toISOString(),
    },
    activity: [],
  };
}

function publicSnapshot(snapshot: DesktopSnapshot): DesktopSnapshot {
  return {
    ...snapshot,
    settings: {
      ...snapshot.settings,
      accessToken: "",
      refreshToken: "",
    },
  };
}

function updateTray(snapshot: DesktopSnapshot) {
  const state = snapshot.summary.state;
  tray?.setImage(createTrayIcon(state));
  tray?.setToolTip(`GyenBox - ${snapshot.summary.lastMessage}`);
  tray?.setContextMenu(contextMenu());
}

function createTrayIcon(state: string) {
  const color =
    state === "error"
      ? "#BD6F7C"
      : state === "syncing"
        ? "#6F8FFF"
        : state === "paused"
          ? "#C49A4F"
          : "#5F74C4";
  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trayIconSvg(color))}`,
  );
  return image.resize({ width: 20, height: 20 });
}

function trayIconSvg(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="30" rx="8" fill="#FFFDF9"/><path d="M20 9 31 15.4 20 21.6 9 15.4 20 9Z" fill="#E7EAF5" stroke="#31343A" stroke-width="1.5"/><path d="M9 16.2 20 22.4v10.1L9 26.3V16.2Z" fill="#F4F2EE" stroke="#31343A" stroke-width="1.4"/><path d="M31 16.2 20 22.4v10.1l11-6.2V16.2Z" fill="#DDE3F4" stroke="#31343A" stroke-width="1.4"/><path d="M14.3 15.4 20 12.2l5.7 3.2-5.7 3.2-5.7-3.2Z" fill="#FFFFFF" stroke="${accent}" stroke-width="2"/><path d="M15.8 24.2c0 2.5 1.9 4 4.7 4h4.1" fill="none" stroke="${accent}" stroke-width="2.8" stroke-linecap="round"/></svg>`;
}
function createAppIcon() {
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(brandIconSvg("#5F74C4"))}`,
  );
}

function brandIconSvg(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="6.5" y="6.5" width="51" height="51" rx="5.5" fill="#FFFDF9" stroke="#C8C1B8"/><path d="M32 11.5 51 22.3 32 33 13 22.3 32 11.5Z" fill="#E7EAF5" stroke="#1A1A1A" stroke-opacity=".52" stroke-width="1.4"/><path d="M13 22.5 32 33.2v19.3L13 41.8V22.5Z" fill="#F4F2EE" stroke="#1A1A1A" stroke-opacity=".42" stroke-width="1.4"/><path d="M51 22.5 32 33.2v19.3l19-10.7V22.5Z" fill="#DDE3F4" stroke="#1A1A1A" stroke-opacity=".42" stroke-width="1.4"/><path d="M22.2 22.6 32 17.1l9.8 5.5L32 28.1l-9.8-5.5Z" fill="#FFFDF9" stroke="${accent}" stroke-width="1.7"/><path d="M24.8 38.2c0 3.8 3 6.4 7.2 6.4h7.8" stroke="${accent}" stroke-width="3.4" stroke-linecap="round"/><path d="M24.8 38.2h-4.6v-6.9" stroke="#8896C6" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M39.5 38.3h-7.1" stroke="#1A1A1A" stroke-opacity=".72" stroke-width="2.8" stroke-linecap="round"/></svg>`;
}
