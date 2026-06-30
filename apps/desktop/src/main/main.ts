import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  shell,
  Tray,
  screen,
} from "electron";
import { randomUUID } from "node:crypto";
import { homedir, hostname } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

import {
  cleanupCloudSyncRoots,
  markCloudFileStatus,
  markCloudSyncRootStatus,
  registerCloudSyncRoot,
  unregisterCloudSyncRoot,
  setCloudPathPinState,
  setCloudProviderConnected,
} from "./cloud-files.js";
import {
  startCloudProvider,
  type CloudProviderHandle,
} from "./cloud-provider-process.js";
import {
  allFolderAggregates,
  applyLeafTransition,
  rebuildFolderRollup,
} from "./folder-status.js";
import { SettingsStore } from "./settings-store.js";
import {
  ensureTaskbarPinShortcut,
  hasOpenFolderSwitch,
  startMenuShortcutPath,
} from "./taskbar-integration.js";
import {
  applySyncFolderIcon,
  cleanupStaleGyenBoxNamespaceEntries,
  ensureQuickAccessFolderShortcut,
  findExplorerShellCommand,
  isInsideSyncFolder,
  pinSyncFolderToQuickAccess,
  registerExplorerContextMenuIntegration,
  registerExplorerOverlayIntegration,
  updateExplorerOverlayState,
  shellActionLabel,
  shellTargetName,
  type ExplorerShellCommand,
} from "./shell-integration.js";
import { startSyncCore, type SyncCoreHandle } from "./sync-core-process.js";
import type { FileStatus } from "./sync-types.js";
import { SyncEngine } from "./sync-engine.js";
import { runSetupOrchestrator, type SetupResult, type SetupStepProgress } from "./setup-orchestrator.js";
import { logError, logInfo, logSetup, logSetupError, logSetupWarn, logWarn } from "./logging.js";
import type { DesktopSettings, DesktopSnapshot } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rendererPath = join(__dirname, "..", "renderer", "index.html");
const setupPath = join(__dirname, "..", "renderer", "setup.html");
const preloadPath = join(__dirname, "..", "preload", "preload.js");

let panelWindow: BrowserWindow | null = null;
// Normal, framed, taskbar-visible window users can pin to the taskbar. Distinct
// from the lightweight tray popover (panelWindow). Background sync stays in the
// tray regardless of whether this window is open.
let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let engine: SyncEngine | null = null;
let settings: SettingsStore | null = null;
let db: DatabaseSync | null = null;
let syncCore: SyncCoreHandle | null = null;
let cloudProvider: CloudProviderHandle | null = null;
let cloudProviderRestartTimer: NodeJS.Timeout | null = null;
let cloudProviderBackoffResetTimer: NodeJS.Timeout | null = null;
let cloudProviderRestartAttempts = 0;
let isQuitting = false;
const CLOUD_PROVIDER_RESTART_DELAYS_MS = [1_000, 3_000, 10_000, 30_000];
const CLOUD_PROVIDER_STABLE_RESET_MS = 30_000;
const APP_USER_MODEL_ID = "com.gyenbox.desktop";
const FOLDER_SHORTCUT_APP_USER_MODEL_ID = "com.gyenbox.folder";
const SHORTCUT_NAME = "GyenBox";
const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 611;
const MAIN_WIDTH = 1040;
const MAIN_HEIGHT = 720;
const PANEL_SCREEN_MARGIN = 2;
const PANEL_EDGE_OVERLAP = 8;
const TRAY_ICON_SIZE = 24;
const TRAY_BLUR_IGNORE_PADDING = 56;
const TRAY_TOGGLE_DEBOUNCE_MS = 250;
const BACKGROUND_STARTUP_DELAY_MS = 900;
const EXPLORER_INTEGRATION_DELAY_MS = 2_500;
const QUICK_ACCESS_PIN_RETRY_DELAYS_MS = [2_000, 10_000, 30_000];
const EXPLORER_INTEGRATION_MARKER_FILE = "explorer-integration.json";
const SETUP_STATE_FILE = "setup-state.json";
const SETUP_STATE_SCHEMA = "setup-orchestrator-v3";
let choosingFolder = false;
let lastTrayToggleAt = 0;
let backgroundStartupTimer: NodeJS.Timeout | null = null;
let explorerIntegrationTimer: NodeJS.Timeout | null = null;
let quickAccessPinBeforeCloudRoot: Promise<boolean> | null = null;
let quickAccessPinRetryTimer: NodeJS.Timeout | null = null;
let pendingDesktopAuthState: string | null = null;
let setupRunPromise: Promise<SetupResult> | null = null;
type SetupLanguage = "en" | "zh";
type SetupHandoff = {
  bootstrapDir: string | null;
  initialProgress: number;
  language: SetupLanguage;
};
let setupHandoff = parseSetupHandoff(process.argv, true);
let setupWindowReadyToShow = false;
let setupHandoffShowRequested = false;
let setupHandoffVisible = false;
let setupHandoffShowTimer: NodeJS.Timeout | null = null;
type CloudProviderWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};
const cloudProviderWaiters = new Set<CloudProviderWaiter>();
let lastExplorerOverlayStateKey: string | null = null;
const startupDesktopAuthUrl = findDesktopAuthUrl(process.argv);
const startupExplorerShellCommand = findExplorerShellCommand(process.argv);
const startupOpenFolder = hasOpenFolderSwitch(process.argv);
const isSmokeTest =
  process.env.GYENBOX_DESKTOP_SMOKE_TEST === "1" ||
  process.argv.includes("--smoke-test") ||
  app.commandLine.hasSwitch("smoke-test");

app.setAppUserModelId(APP_USER_MODEL_ID);
registerProtocolClient();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", (_event, commandLine) => {
  const nextSetupHandoff = parseSetupHandoff(commandLine);
  if (nextSetupHandoff.bootstrapDir) {
    setupHandoff = nextSetupHandoff;
    resetSetupHandoffShowState();
  }
  const wantsOpenFolder = hasOpenFolderSwitch(commandLine);
  logInfo("main", "second instance", {
    wantsOpenFolder,
    hasSetupHandoff: Boolean(nextSetupHandoff.bootstrapDir),
    activeSetupHandoff: Boolean(setupHandoff.bootstrapDir),
  });

  const shellCommand = findExplorerShellCommand(commandLine);
  if (shellCommand && app.isReady()) {
    void handleExplorerShellCommand(shellCommand);
    return;
  }

  const authUrl = findDesktopAuthUrl(commandLine);
  if (authUrl) {
    void handleDesktopAuthCallback(authUrl);
    return;
  }
  if (wantsOpenFolder && app.isReady() && !nextSetupHandoff.bootstrapDir) {
    void openSyncFolder();
    return;
  }
  if (app.isReady() && (setupHandoff.bootstrapDir || shouldRunSetupForCurrentUser())) {
    showSetupWindow();
    return;
  }

  // After setup completes, a bare second launch (e.g. clicking a pinned
  // taskbar icon) behaves like Dropbox: jump straight to the local sync folder.
  if (app.isReady()) void openSyncFolder();
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
    logError("main", "bootstrap failed", { error });
    app.quit();
  });

async function bootstrap() {
  logInfo("main", "bootstrap start", {
    version: app.getVersion(),
    packaged: app.isPackaged,
    argv: process.argv,
  });
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

  const shouldRunSetup = shouldRunSetupOnLaunch(userData);
  logInfo("main", "settings loaded", {
    userData,
    syncFolder: settings.get().syncFolder,
    shouldRunSetup,
    setupHandoff,
  });
  if (!shouldRunSetup) {
    await mkdir(settings.get().syncFolder, { recursive: true });
  }
  const shouldOpenSyncFolderOnLaunch =
    !shouldRunSetup &&
    (startupOpenFolder ||
      (!startupDesktopAuthUrl && !startupExplorerShellCommand));

  if (!shouldRunSetup) {
    quickAccessPinBeforeCloudRoot = pinQuickAccessBeforeCloudRoot(settings.get().syncFolder);
  }
  void ensureTaskbarShortcutIfPackaged();
  if (shouldOpenSyncFolderOnLaunch) void openSyncFolder();
  if (!shouldRunSetup) {
    await cleanupLegacySyncCoreState(settings.get().syncFolder);
  }

  db = new DatabaseSync(join(userData, "gyenbox-sync.db"));
  engine = new SyncEngine(
    db,
    settings,
    (relativePath, status, previousStatus) => {
      applyLeafCloudStatus(relativePath, status, previousStatus);
    },
  );
  engine.on("snapshot", (snapshot: DesktopSnapshot) => {
    applyCloudRootStatus(snapshot);
    sendSnapshotToWindows(publicSnapshot(snapshot));
    updateTray(snapshot);
  });

  createTray();
  registerIpc();
  if (shouldRunSetup) void showSetupWindow();

  if (startupDesktopAuthUrl)
    void handleDesktopAuthCallback(startupDesktopAuthUrl);
  if (startupExplorerShellCommand)
    void handleExplorerShellCommand(startupExplorerShellCommand);

  if (!shouldRunSetup) scheduleBackgroundStartup(join(userData, "sync-core"));
}

app.on("activate", () => {
  void openSyncFolder();
});

app.on("window-all-closed", () => {
  // Keep the sync engine alive in the tray.
});

app.on("before-quit", async () => {
  isQuitting = true;
  clearBackgroundStartupTimer();
  clearExplorerIntegrationTimer();
  clearCloudProviderRestartTimer();
  clearCloudProviderBackoffResetTimer();
  syncCore?.stop();
  cloudProvider?.stop();
  setCloudProviderConnected(null);
  await engine?.stop();
  db?.close();
});

async function ensureTaskbarShortcutIfPackaged() {
  if (!app.isPackaged) return;
  try {
    await ensureTaskbarPinShortcut({
      appUserModelId: APP_USER_MODEL_ID,
      shortcutAppUserModelId: FOLDER_SHORTCUT_APP_USER_MODEL_ID,
      shortcutName: SHORTCUT_NAME,
      description: "Open your GyenBox folder.",
      syncFolder: currentSettings().syncFolder,
    });
  } catch (error) {
    console.warn("[gyenbox-taskbar] Start Menu shortcut repair skipped", error);
  }
}

function scheduleBackgroundStartup(stateFolder: string) {
  clearBackgroundStartupTimer();
  backgroundStartupTimer = setTimeout(() => {
    backgroundStartupTimer = null;
    startBackgroundServices(stateFolder);
  }, BACKGROUND_STARTUP_DELAY_MS);
}

function startBackgroundServices(stateFolder: string) {
  const syncFolder = currentSettings().syncFolder;
  logInfo("main", "background services start", { syncFolder, stateFolder });
  const pendingQuickAccessPin = quickAccessPinBeforeCloudRoot;
  quickAccessPinBeforeCloudRoot = null;

  if (pendingQuickAccessPin) {
    void pendingQuickAccessPin.then((pinned) => {
      startCloudBackedServices(syncFolder, stateFolder);
      if (!pinned) scheduleQuickAccessPinRetry(syncFolder);
    });
    return;
  }

  startCloudBackedServices(syncFolder, stateFolder);
  scheduleQuickAccessPinRetry(syncFolder);
}

function startCloudBackedServices(syncFolder: string, stateFolder: string) {
  void cleanupGyenBoxExplorerRoots(syncFolder);
  scheduleExplorerIntegration(syncFolder);
  startSyncCoreIfNeeded(syncFolder, stateFolder);
  restartCloudProvider(syncFolder);
  void startSyncEngineIfNeeded().catch((error) => {
    console.error("Failed to start GyenBox sync engine", error);
  });
}

function startSyncCoreIfNeeded(syncFolder: string, stateFolder: string) {
  if (syncCore) return;
  syncCore = startSyncCore(syncFolder, stateFolder, (event) => {
    console.info("[gyenbox-sync]", event);
  });
}

async function startSyncEngineIfNeeded() {
  if (!engine) return currentSnapshot();
  const snapshot = await engine.start();
  const latest = snapshot ?? currentSnapshot();
  sendSnapshotToWindows(publicSnapshot(latest));
  updateTray(latest);
  applyKnownCloudFileStatuses();
  applyCloudRootStatus(latest);
  return latest;
}

async function cleanupGyenBoxExplorerRoots(syncFolder: string) {
  logInfo("explorer", "cleanup/register roots start", { syncFolder });
  await cleanupCloudSyncRoots(syncFolder);
  await registerCloudSyncRoot(syncFolder);
  await cleanupStaleGyenBoxNamespaceEntries(syncFolder);
  logInfo("explorer", "cleanup/register roots ok", { syncFolder });
}
async function pinQuickAccessBeforeCloudRoot(syncFolder: string) {
  if (process.platform !== "win32") return true;

  logInfo("quick-access", "pin start", { syncFolder });
  try {
    const iconPath = resolveSyncFolderIconPath();
    await applySyncFolderIcon(syncFolder, iconPath);
    logInfo("quick-access", "folder icon applied", { syncFolder, iconPath });
    await pinSyncFolderToQuickAccess(syncFolder);
    logInfo("quick-access", "pin ok", { syncFolder });
    return true;
  } catch (error) {
    console.warn("[gyenbox-shell] Quick Access pin skipped", error);
    logWarn("quick-access", "pin failed", { syncFolder, error });
    try {
      await ensureQuickAccessFolderShortcut(syncFolder);
      logWarn("quick-access", "fallback shortcut written", { syncFolder });
      return true;
    } catch (shortcutError) {
      console.warn("[gyenbox-shell] Quick Access fallback shortcut skipped", shortcutError);
      logError("quick-access", "fallback shortcut failed", { syncFolder, error: shortcutError });
      return false;
    }
  }
}

function scheduleQuickAccessPinRetry(syncFolder: string, attempt = 0) {
  if (process.platform !== "win32") return;
  if (attempt >= QUICK_ACCESS_PIN_RETRY_DELAYS_MS.length) return;
  logWarn("quick-access", "retry scheduled", {
    syncFolder,
    attempt: attempt + 1,
    delayMs: QUICK_ACCESS_PIN_RETRY_DELAYS_MS[attempt],
  });

  clearQuickAccessPinRetryTimer();
  quickAccessPinRetryTimer = setTimeout(() => {
    quickAccessPinRetryTimer = null;
    void pinQuickAccessBeforeCloudRoot(syncFolder).then((pinned) => {
      if (!pinned) scheduleQuickAccessPinRetry(syncFolder, attempt + 1);
    });
  }, QUICK_ACCESS_PIN_RETRY_DELAYS_MS[attempt]);
}

function scheduleExplorerIntegration(syncFolder: string) {
  clearExplorerIntegrationTimer();
  explorerIntegrationTimer = setTimeout(() => {
    explorerIntegrationTimer = null;
    void registerExplorerIntegrationIfNeeded(syncFolder);
  }, EXPLORER_INTEGRATION_DELAY_MS);
}

async function registerExplorerIntegrationIfNeeded(syncFolder: string) {
  const markerPath = join(app.getPath("userData"), EXPLORER_INTEGRATION_MARKER_FILE);
  const shellExtensionDllPath = resolveShellExtensionDllPath();
  const overlaySyncedIconPath = resolveOverlaySyncedIconPath();
  const namespaceIconPath = resolveNamespaceIconPath();
  const marker = {
    version: app.getVersion(),
    exePath: process.execPath,
    syncFolder,
    schema: "shell-v4-context-menu-overlay-root",
    shellExtensionDllPath,
    overlaySyncedIconPath,
    namespaceIconPath,
  };

  try {
    const existing = JSON.parse(await readFile(markerPath, "utf8")) as typeof marker;
    if (
      shellExtensionDllPath &&
      overlaySyncedIconPath &&
      existing.version === marker.version &&
      existing.exePath === marker.exePath &&
      existing.syncFolder === marker.syncFolder &&
      existing.schema === marker.schema &&
      existing.shellExtensionDllPath === marker.shellExtensionDllPath &&
      existing.overlaySyncedIconPath === marker.overlaySyncedIconPath &&
      existing.namespaceIconPath === marker.namespaceIconPath
    ) {
      return;
    }
  } catch {
    // Missing or invalid marker means the shell integration should be refreshed.
  }

  await registerExplorerContextMenuIntegration();

  if (!shellExtensionDllPath || !overlaySyncedIconPath) {
    console.warn(
      `[gyenbox-shell] Explorer overlay skipped; dll=${shellExtensionDllPath ?? "missing"}, icon=${overlaySyncedIconPath ?? "missing"}`,
    );
    return;
  }

  await registerExplorerOverlayIntegration({
    syncFolder,
    shellExtensionDllPath,
    overlaySyncedIconPath,
    namespaceIconPath,
    rootState: currentExplorerOverlayRootState(),
  });

  await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
}
function clearBackgroundStartupTimer() {
  if (!backgroundStartupTimer) return;
  clearTimeout(backgroundStartupTimer);
  backgroundStartupTimer = null;
}

function clearExplorerIntegrationTimer() {
  if (!explorerIntegrationTimer) return;
  clearTimeout(explorerIntegrationTimer);
  explorerIntegrationTimer = null;
}

function clearQuickAccessPinRetryTimer() {
  if (!quickAccessPinRetryTimer) return;
  clearTimeout(quickAccessPinRetryTimer);
  quickAccessPinRetryTimer = null;
}
function restartCloudProvider(syncFolder: string, resetBackoff = true) {
  clearCloudProviderRestartTimer();
  if (resetBackoff) {
    clearCloudProviderBackoffResetTimer();
    cloudProviderRestartAttempts = 0;
  }

  cloudProvider?.stop();
  cloudProvider = null;
  setCloudProviderConnected(null);

  if (process.platform !== "win32") return;

  let provider: CloudProviderHandle | null = null;
  provider = startCloudProvider(syncFolder, (event) => {
    if (cloudProvider !== provider) return;

    console.info("[gyenbox-provider]", event);
    if (event.event === "provider_connected") {
      setCloudProviderConnected(syncFolder, provider?.markPath ?? null);
      notifyCloudProviderConnected();
      armCloudProviderBackoffReset();
      applyKnownCloudFileStatuses();
      applyCloudRootStatus(currentSnapshot());
      return;
    }
    if (event.event === "provider_disconnected") {
      clearCloudProviderBackoffResetTimer();
      cloudProvider = null;
      setCloudProviderConnected(null);
      rejectCloudProviderWaiters(new Error(event.message ?? "Cloud provider disconnected."));
      scheduleCloudProviderRestart(syncFolder, event.message);
    }
  });
  cloudProvider = provider;

  if (!cloudProvider) {
    console.warn("[gyenbox-provider] gyenbox-sync.exe helper was not found.");
  }
}

function waitForCloudProviderConnected(timeoutMs: number) {
  if (process.platform !== "win32") return Promise.resolve();
  if (cloudProvider?.isConnected()) return Promise.resolve();
  if (!cloudProvider) {
    return Promise.reject(new Error("Cloud provider helper is not running yet."));
  }

  return new Promise<void>((resolve, reject) => {
    const waiter: CloudProviderWaiter = {
      resolve: () => {
        clearTimeout(waiter.timer);
        cloudProviderWaiters.delete(waiter);
        resolve();
      },
      reject: (error) => {
        clearTimeout(waiter.timer);
        cloudProviderWaiters.delete(waiter);
        reject(error);
      },
      timer: setTimeout(() => {
        waiter.reject(new Error("Cloud provider did not connect within setup timeout."));
      }, timeoutMs),
    };
    cloudProviderWaiters.add(waiter);
  });
}

function notifyCloudProviderConnected() {
  for (const waiter of [...cloudProviderWaiters]) waiter.resolve();
}

function rejectCloudProviderWaiters(error: Error) {
  for (const waiter of [...cloudProviderWaiters]) waiter.reject(error);
}
function scheduleCloudProviderRestart(syncFolder: string, reason?: string) {
  if (isQuitting || process.platform !== "win32" || cloudProviderRestartTimer) return;

  const delayMs = CLOUD_PROVIDER_RESTART_DELAYS_MS[
    Math.min(cloudProviderRestartAttempts, CLOUD_PROVIDER_RESTART_DELAYS_MS.length - 1)
  ];
  cloudProviderRestartAttempts += 1;
  console.warn(
    `[gyenbox-provider] disconnected${reason ? `: ${reason}` : ""}; restarting in ${delayMs}ms.`,
  );
  cloudProviderRestartTimer = setTimeout(() => {
    cloudProviderRestartTimer = null;
    restartCloudProvider(syncFolder, false);
  }, delayMs);
}

function armCloudProviderBackoffReset() {
  clearCloudProviderBackoffResetTimer();
  cloudProviderBackoffResetTimer = setTimeout(() => {
    cloudProviderRestartAttempts = 0;
    cloudProviderBackoffResetTimer = null;
  }, CLOUD_PROVIDER_STABLE_RESET_MS);
}

function clearCloudProviderRestartTimer() {
  if (!cloudProviderRestartTimer) return;
  clearTimeout(cloudProviderRestartTimer);
  cloudProviderRestartTimer = null;
}

function clearCloudProviderBackoffResetTimer() {
  if (!cloudProviderBackoffResetTimer) return;
  clearTimeout(cloudProviderBackoffResetTimer);
  cloudProviderBackoffResetTimer = null;
}

async function cleanupLegacySyncCoreState(syncFolder: string) {
  const legacyFolder = join(syncFolder, ".gyenbox");
  const legacyEventsFile = join(legacyFolder, "core-events.jsonl");
  try {
    if (!existsSync(legacyFolder) || !statSync(legacyFolder).isDirectory()) {
      return;
    }
    await rm(legacyEventsFile, { force: true });
    const remainingEntries = await readdir(legacyFolder);
    if (remainingEntries.length === 0) {
      await rm(legacyFolder, { force: true });
    }
  } catch (error) {
    console.warn("[gyenbox-sync] legacy state cleanup skipped", error);
  }
}
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

function resolveShellExtensionDllPath() {
  const envPath = process.env.GYENBOX_SHELL_EXTENSION_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const resourcePath = join(process.resourcesPath, "bin", "gyenbox-shell.dll");
  if (existsSync(resourcePath)) return resourcePath;

  const devPath = join(
    app.getAppPath(),
    "..",
    "..",
    "target",
    "release",
    "gyenbox_shell.dll",
  );
  if (existsSync(devPath)) return devPath;

  const cwdPath = join(process.cwd(), "target", "release", "gyenbox_shell.dll");
  if (existsSync(cwdPath)) return cwdPath;

  return null;
}

function resolveOverlaySyncedIconPath() {
  const resourcePath = join(process.resourcesPath, "overlay-synced.ico");
  if (existsSync(resourcePath)) return resourcePath;

  const devPath = join(__dirname, "..", "..", "build", "overlay-synced.ico");
  if (existsSync(devPath)) return devPath;

  return null;
}

function resolveNamespaceIconPath() {
  if (app.isPackaged) return process.execPath;

  const devIcon = join(__dirname, "..", "..", "build", "icon.ico");
  if (existsSync(devIcon)) return devIcon;

  return process.execPath;
}
function resolveSyncFolderIconPath() {
  const resourceIcon = join(process.resourcesPath, "icon.ico");
  if (existsSync(resourceIcon)) return resourceIcon;

  const devIcon = join(__dirname, "..", "..", "build", "icon.ico");
  if (existsSync(devIcon)) return devIcon;

  return process.execPath;
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

async function openSyncFolder() {
  const syncFolder = currentSettings().syncFolder;
  logInfo("main", "open sync folder requested", { syncFolder });
  try {
    await mkdir(syncFolder, { recursive: true });
  } catch (error) {
    logWarn("main", "open sync folder mkdir failed", { syncFolder, error });
  }
  const errorMessage = await shell.openPath(syncFolder);
  if (errorMessage) {
    logWarn("main", "open sync folder failed", { syncFolder, error: errorMessage });
  } else {
    logInfo("main", "open sync folder ok", { syncFolder });
  }
  return errorMessage;
}

function desktopWorkspaceUrl() {
  const baseUrl = currentSettings().apiBaseUrl.trim() || "https://gyenbox.com";
  try {
    return new globalThis.URL("/workspace", baseUrl).toString();
  } catch {
    return "https://gyenbox.com/workspace";
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
  sendSnapshotToWindows(publicSnapshot(snapshot));
  updateTray(snapshot);
  showPanel();
  return true;
}

async function handleExplorerShellCommand(command: ExplorerShellCommand) {
  const targetPath = command.targetPath;
  const settings = currentSettings();

  if (targetPath && !isInsideSyncFolder(targetPath, settings.syncFolder)) {
    showShellNotification(
      "GyenBox",
      "Use GyenBox actions on files inside your GyenBox sync folder.",
    );
    return false;
  }

  try {
    if (command.action === "make-online-only") {
      if (!targetPath) return false;
      await setCloudPathPinState(targetPath, "online-only");
      showShellNotification("GyenBox", `${shellTargetName(targetPath)} is online-only.`);
      return true;
    }

    if (command.action === "make-available-offline") {
      if (!targetPath) return false;
      await setCloudPathPinState(targetPath, "pinned");
      showShellNotification("GyenBox", `${shellTargetName(targetPath)} is available offline.`);
      return true;
    }

    if (command.action === "view-on-web") {
      await shell.openExternal(desktopWorkspaceUrlForPath(targetPath));
      return true;
    }

    if (command.action === "file-info") {
      if (targetPath) shell.showItemInFolder(targetPath);
      showPanel();
      return true;
    }

    if (command.action === "manage-space" || command.action === "sync-storage") {
      showPanel();
      return true;
    }
  } catch (error) {
    showShellNotification(
      shellActionLabel(command.action),
      error instanceof Error ? error.message : String(error),
    );
  }

  return false;
}

function desktopWorkspaceUrlForPath(targetPath: string | null) {
  const workspaceUrl = desktopWorkspaceUrl();
  if (!targetPath) return workspaceUrl;

  try {
    const url = new globalThis.URL(workspaceUrl);
    const relativePath = relative(currentSettings().syncFolder, targetPath).replace(/\\/g, "/");
    if (relativePath && !relativePath.startsWith("..")) {
      url.searchParams.set("path", relativePath);
    }
    return url.toString();
  } catch {
    return workspaceUrl;
  }
}

function showShellNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
    return;
  }
  console.info(`[gyenbox-shell] ${title}: ${body}`);
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
    if (isQuitting || choosingFolder || isCursorNearTray()) return;
    panelWindow?.hide();
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

function sendSnapshotToWindows(payload: ReturnType<typeof publicSnapshot>) {
  panelWindow?.webContents.send("sync:snapshot", payload);
  mainWindow?.webContents.send("sync:snapshot", payload);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: "GyenBox",
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
  });

  mainWindow.loadFile(rendererPath);
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow?.webContents.send(
      "sync:snapshot",
      publicSnapshot(currentSnapshot()),
    );
  });
  mainWindow.on("close", (event) => {
    // Closing returns to the tray (background sync keeps running); it does not
    // quit. Quit only happens via the tray "Quit GyenBox" item.
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showMainWindow() {
  if (!mainWindow) createMainWindow();
  mainWindow?.show();
  mainWindow?.focus();
  mainWindow?.moveTop();
  mainWindow?.webContents.send(
    "sync:snapshot",
    publicSnapshot(currentSnapshot()),
  );
}

function shouldRunSetupForCurrentUser() {
  if (setupHandoff.bootstrapDir) return true;

  if (!app.isPackaged && !process.argv.includes("--show-setup-welcome")) {
    return false;
  }

  return !hasCompletedSetupState(app.getPath("userData"));
}
function shouldRunSetupOnLaunch(userData: string) {
  if (setupHandoff.bootstrapDir) return true;

  if (startupDesktopAuthUrl || startupExplorerShellCommand) {
    return false;
  }

  if (!app.isPackaged && !process.argv.includes("--show-setup-welcome")) {
    return false;
  }

  return !hasCompletedSetupState(userData);
}

function setupStatePath(userData: string) {
  return join(userData, SETUP_STATE_FILE);
}

function hasCompletedSetupState(userData: string) {
  try {
    const existing = JSON.parse(readFileSyncUtf8(setupStatePath(userData))) as Partial<SetupResult>;
    return Boolean(
      existing.completed &&
        existing.schema === SETUP_STATE_SCHEMA &&
        existing.version === app.getVersion(),
    );
  } catch {
    return false;
  }
}

function showSetupWindow() {
  if (!existsSync(setupPath)) return;
  if (!setupWindow) createSetupWindow();
  if (shouldDeferSetupWindowShow() && (!setupWindowReadyToShow || !setupHandoffShowRequested)) return;
  showSetupWindowNow();
}

function showSetupWindowNow(options: { quiet?: boolean } = {}) {
  const window = setupWindow;
  if (!window || window.isDestroyed()) return;

  if (options.quiet) {
    window.setFocusable(false);
    window.showInactive();
    setTimeout(() => {
      if (!window.isDestroyed()) window.setFocusable(true);
    }, 450);
    return;
  }

  window.show();
  window.focus();
  window.moveTop();
  sendSetupVisible();
}

function shouldDeferSetupWindowShow() {
  return Boolean(setupHandoff.bootstrapDir);
}

function sendSetupProgress(progress: SetupStepProgress) {
  setupWindow?.webContents.send("setup:progress", progress);
}

function sendSetupVisible() {
  setupWindow?.webContents.send("setup:visible");
}

async function runSetupSequence(force = false) {
  if (setupRunPromise && !force) return setupRunPromise;
  if (force && setupRunPromise) return setupRunPromise;
  logSetup("main", "setup sequence requested", { force, setupHandoff });

  const userData = app.getPath("userData");
  const stateFolder = join(userData, "sync-core");
  const syncFolder = currentSettings().syncFolder;
  const initialPct = force ? 0 : setupHandoff.initialProgress;
  const handoffStops = initialPct >= 55;
  const progressStops = handoffStops
    ? { folder: 62, quick: 68, cloud: 76, shell: 84, provider: 90, engine: 96, done: 100 }
    : { folder: 45, quick: 55, cloud: 65, shell: 75, provider: 85, engine: 96, done: 100 };
  logSetup("main", "setup sequence start", {
    version: app.getVersion(),
    userData,
    syncFolder,
    stateFolder,
    initialPct,
    handoffStops,
    progressStops,
  });

  setupRunPromise = runSetupOrchestrator({
    version: app.getVersion(),
    schema: SETUP_STATE_SCHEMA,
    initialPct,
    onProgress: sendSetupProgress,
    minStepDurationMs: 750,
    tasks: [
      {
        id: "folder",
        label: "Preparing your space...",
        endPct: progressStops.folder,
        run: async () => {
          await mkdir(syncFolder, { recursive: true });
          await cleanupLegacySyncCoreState(syncFolder);
        },
      },
      {
        id: "quick",
        label: "Preparing Explorer sidebar...",
        endPct: progressStops.quick,
        optional: true,
        run: async () => {
          await unregisterCloudSyncRoot(syncFolder);
          const pinned = await pinQuickAccessBeforeCloudRoot(syncFolder);
          if (!pinned) scheduleQuickAccessPinRetry(syncFolder);
        },
      },
      {
        id: "cloud",
        label: "Preparing your secure workspace...",
        endPct: progressStops.cloud,
        optional: true,
        run: async () => {
          await cleanupGyenBoxExplorerRoots(syncFolder);
        },
      },
      {
        id: "shell",
        label: "Installing Explorer integration...",
        endPct: progressStops.shell,
        optional: true,
        run: async () => {
          await registerExplorerIntegrationIfNeeded(syncFolder);
        },
      },
      {
        id: "provider",
        label: "Connecting sync badges...",
        endPct: progressStops.provider,
        optional: true,
        run: async () => {
          restartCloudProvider(syncFolder);
          await waitForCloudProviderConnected(8_000);
        },
      },
      {
        id: "engine",
        label: "Scanning your files...",
        endPct: progressStops.engine,
        optional: true,
        run: async () => {
          startSyncCoreIfNeeded(syncFolder, stateFolder);
          await startSyncEngineIfNeeded();
        },
      },
      {
        id: "done",
        label: "Ready.",
        endPct: progressStops.done,
        minDurationMs: 1100,
        run: async () => {
          await ensureTaskbarShortcutIfPackaged();
        },
      },
    ],
  })
    .then(async (result) => {
      logSetup("main", "setup sequence ok", { syncFolder, result });
      scheduleSetupWarningRepairs(result, syncFolder, stateFolder);
      await writeSetupState(userData, result);
      setupHandoff = { bootstrapDir: null, initialProgress: 0, language: "zh" };
      resetSetupHandoffShowState();
      delete process.env.GYENBOX_BOOTSTRAP_DIR;
      delete process.env.GYENBOX_INITIAL_PROGRESS;
      delete process.env.GYENBOX_SETUP_LANG;
      // The setup page owns the final confirmation. Do not auto-hide it; the
      // user chooses when to open the GyenBox folder.
      return result;
    })
    .catch((error) => {
      console.error("[gyenbox-setup] setup failed", error);
      logSetupError("main", "setup sequence failed", { syncFolder, error });
      throw error;
    })
    .finally(() => {
      setupRunPromise = null;
    });

  return setupRunPromise;
}

function scheduleSetupWarningRepairs(result: SetupResult, syncFolder: string, stateFolder: string) {
  const warningIds = new Set(result.warnings.map((warning) => warning.id));
  if (result.warnings.length > 0) {
    logSetupWarn("main", "setup warning repairs scheduled", { syncFolder, stateFolder, warnings: result.warnings });
  }
  if (warningIds.has("quick")) scheduleQuickAccessPinRetry(syncFolder);
  if (warningIds.has("cloud")) void cleanupGyenBoxExplorerRoots(syncFolder);
  if (warningIds.has("shell")) scheduleExplorerIntegration(syncFolder);
  if (warningIds.has("provider")) restartCloudProvider(syncFolder, false);
  if (warningIds.has("engine")) {
    startSyncCoreIfNeeded(syncFolder, stateFolder);
    void startSyncEngineIfNeeded();
  }
}
async function writeSetupState(userData: string, result: SetupResult) {
  try {
    await writeFile(
      setupStatePath(userData),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    console.warn("[gyenbox-setup] setup marker skipped", error);
  }
}

function readFileSyncUtf8(path: string) {
  return readFileSync(path, "utf8");
}

function parseSetupHandoff(argv: string[], includeEnv = false): SetupHandoff {
  const bootstrapDir =
    findSwitchValue(argv, "bootstrap-dir") ??
    (includeEnv ? process.env.GYENBOX_BOOTSTRAP_DIR : null) ??
    null;
  const initialValue =
    findSwitchValue(argv, "initial-progress") ??
    (includeEnv ? process.env.GYENBOX_INITIAL_PROGRESS : null) ??
    (bootstrapDir ? "55" : "0");
  const languageValue =
    findSwitchValue(argv, "setup-lang") ??
    (includeEnv ? process.env.GYENBOX_SETUP_LANG : null) ??
    "zh";

  return {
    bootstrapDir,
    initialProgress: clampProgress(Number.parseFloat(initialValue)),
    language: normalizeSetupLanguage(languageValue),
  };
}

function findSwitchValue(argv: string[], name: string) {
  const exact = `--${name}`;
  const prefix = `${exact}=`;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === exact) return argv[index + 1] ?? null;
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return null;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function normalizeSetupLanguage(value: string | null | undefined): SetupLanguage {
  return value?.trim().toLowerCase().startsWith("zh") ? "zh" : "en";
}

function positionSetupWindow(window: BrowserWindow) {
  const { workArea } = screen.getPrimaryDisplay();
  const bounds = window.getBounds();
  const x = workArea.x + Math.round((workArea.width - bounds.width) / 2);
  const y = workArea.y + Math.round((workArea.height - bounds.height) / 2);
  window.setPosition(x, y, false);
}

// The Rust shell writes its current top-left (DIPs) to `shell-bounds` at handoff.
// Match it so a dragged shell doesn't snap back to center when Electron takes over.
function positionSetupWindowFromShell() {
  const path = handoffFile("shell-bounds");
  if (!path || !setupWindow || setupWindow.isDestroyed()) return;
  try {
    const [x, y] = readFileSync(path, "utf8")
      .trim()
      .split(",")
      .map((value) => Number.parseInt(value, 10));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      setupWindow.setPosition(x, y, false);
    }
  } catch {
    // No bounds handed off (or unreadable) -> keep the work-area-centered spot.
  }
}

function createSetupWindow() {
  setupWindowReadyToShow = false;
  setupWindow = new BrowserWindow({
    width: 1000,
    height: 640,
    minWidth: 920,
    minHeight: 580,
    show: false,
    useContentSize: true,
    center: false,
    title: "GyenBox Setup",
    autoHideMenuBar: true,
    resizable: false,
    maximizable: false,
    skipTaskbar: false,
    backgroundColor: "#ffffff",
    icon: createAppIcon(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  positionSetupWindow(setupWindow);
  setupWindow.loadFile(setupPath, {
    query: { initialProgress: String(setupHandoff.initialProgress), lang: setupHandoff.language },
  });
  setupWindow.once("ready-to-show", () => {
    setupWindowReadyToShow = true;
    if (shouldDeferSetupWindowShow()) {
      signalBootstrapperReady();
      waitForBootstrapperShow();
      return;
    }
    showSetupWindowNow();
  });
  setupWindow.on("closed", () => {
    setupWindowReadyToShow = false;
    clearSetupHandoffShowTimer();
    setupWindow = null;
  });
}

// When launched by the Rust bootstrapper, it passes a temp dir via
// GYENBOX_BOOTSTRAP_DIR. Electron first renders hidden, writes `electron-ready`,
// waits for Rust to write `electron-show`, then shows and writes
// `electron-visible` so Rust can close without exposing the desktop.
function handoffFile(name: string) {
  const dir = setupHandoff.bootstrapDir ?? process.env.GYENBOX_BOOTSTRAP_DIR;
  return dir ? join(dir, name) : null;
}

function signalBootstrapperReady() {
  const path = handoffFile("electron-ready");
  if (!path) return;
  try {
    writeFileSync(path, String(Date.now()), "utf8");
  } catch {
    // The bootstrapper has a timeout fallback; a missed flag only costs a beat.
  }
}

function signalBootstrapperVisible() {
  const path = handoffFile("electron-visible");
  if (!path) return;
  try {
    writeFileSync(path, String(Date.now()), "utf8");
  } catch {
    // Rust also has a timeout fallback here.
  }
}

function waitForBootstrapperShow() {
  clearSetupHandoffShowTimer();
  const showPath = handoffFile("electron-show");
  const startedAt = Date.now();

  const poll = () => {
    if (!setupWindow || setupWindow.isDestroyed() || !shouldDeferSetupWindowShow()) return;
    if (!showPath || existsSync(showPath) || Date.now() - startedAt > 20_000) {
      completeBootstrapperShow();
      return;
    }
    setupHandoffShowTimer = setTimeout(poll, 30);
  };

  poll();
}

function completeBootstrapperShow() {
  if (setupHandoffVisible) return;
  clearSetupHandoffShowTimer();
  setupHandoffShowRequested = true;
  setupHandoffVisible = true;
  setupHandoff.language = readBootstrapperLanguage();
  setupWindow?.webContents.send("setup:language", setupHandoff.language);
  // Land exactly where the shell currently sits (it may have been dragged) so the
  // handoff doesn't teleport back to the work-area center.
  positionSetupWindowFromShell();
  // Cross-fade this Chromium window in over the Rust shell instead of a hard
  // cut. The GDI->Chromium rendering difference then dissolves (reads as the UI
  // "coming into focus") rather than snapping, which is the jarring moment.
  // `electron-visible` (which frees the shell to close) is written only once we
  // are fully opaque, so the shell stays underneath as the fade's base layer.
  fadeInSetupWindow(() => {
    sendSetupVisible();
    signalBootstrapperVisible();
  });
}

function fadeInSetupWindow(onComplete: () => void) {
  const window = setupWindow;
  if (!window || window.isDestroyed()) {
    onComplete();
    return;
  }
  window.setOpacity(0);
  window.setFocusable(false);
  window.showInactive();
  window.moveTop();

  const totalMs = 220;
  const stepMs = 16;
  const startedAt = Date.now();
  let signaled = false;
  const finish = () => {
    if (signaled) return;
    signaled = true;
    onComplete();
  };
  const step = () => {
    if (!window || window.isDestroyed()) {
      finish();
      return;
    }
    const t = Math.min((Date.now() - startedAt) / totalMs, 1);
    const eased = 1 - (1 - t) * (1 - t); // ease-out quad
    window.setOpacity(eased);
    if (t >= 1) {
      window.setOpacity(1);
      setTimeout(() => {
        if (!window.isDestroyed()) window.setFocusable(true);
      }, 250);
      finish();
      return;
    }
    setTimeout(step, stepMs);
  };
  step();
}

function readBootstrapperLanguage() {
  const langPath = handoffFile("setup-lang");
  if (!langPath) return setupHandoff.language;
  try {
    return normalizeSetupLanguage(readFileSync(langPath, "utf8"));
  } catch {
    return setupHandoff.language;
  }
}

function clearSetupHandoffShowTimer() {
  if (setupHandoffShowTimer) clearTimeout(setupHandoffShowTimer);
  setupHandoffShowTimer = null;
}

function resetSetupHandoffShowState() {
  clearSetupHandoffShowTimer();
  setupHandoffShowRequested = false;
  setupHandoffVisible = false;
}
function createTray() {
  tray = new Tray(createTrayIcon("idle"));
  tray.setToolTip(trayTooltip());
  tray.on("click", () => togglePanelFromTray());
  tray.on("right-click", () => tray?.popUpContextMenu(contextMenu()));
}

function contextMenu() {
  const snapshot = engine?.snapshot();
  return Menu.buildFromTemplate([
    { label: snapshot?.summary.lastMessage ?? "GyenBox", enabled: false },
    { type: "separator" },
    { label: "Open GyenBox folder", click: () => void openSyncFolder() },
    { label: "Open panel", click: () => showPanel() },
    {
      label: "Repair Explorer status",
      click: () => applyKnownCloudFileStatuses(),
    },
    {
      label: "Repair setup",
      click: () => {
        showSetupWindow();
        void runSetupSequence(true);
      },
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

function togglePanelFromTray() {
  const now = Date.now();
  if (now - lastTrayToggleAt < TRAY_TOGGLE_DEBOUNCE_MS) return;
  lastTrayToggleAt = now;
  togglePanel();
}

function isCursorNearTray() {
  const trayBounds = tray?.getBounds();
  if (!trayBounds) return false;
  const cursor = screen.getCursorScreenPoint();
  return isPointInsideBounds(cursor, trayBounds, TRAY_BLUR_IGNORE_PADDING);
}

function isPointInsideBounds(
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number },
  padding = 0,
) {
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}
function showPanel() {
  if (!panelWindow) createPanelWindow();
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
  const trayBounds = tray?.getBounds();
  const display = trayBounds
    ? screen.getDisplayNearestPoint({
        x: trayBounds.x + trayBounds.width / 2,
        y: trayBounds.y + trayBounds.height / 2,
      })
    : screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const screenBounds = display.bounds;
  const width = Math.max(
    1,
    Math.min(PANEL_WIDTH, workArea.width - PANEL_SCREEN_MARGIN * 2),
  );
  const height = Math.max(
    1,
    Math.min(PANEL_HEIGHT, workArea.height - PANEL_SCREEN_MARGIN * 2),
  );
  const x = clampToRange(
    screenBounds.x + screenBounds.width - width + PANEL_EDGE_OVERLAP,
    workArea.x + PANEL_SCREEN_MARGIN,
    screenBounds.x + screenBounds.width - width + PANEL_EDGE_OVERLAP,
  );
  const y = clampToRange(
    workArea.y + workArea.height - height + PANEL_EDGE_OVERLAP,
    workArea.y + PANEL_SCREEN_MARGIN,
    workArea.y + workArea.height - height + PANEL_EDGE_OVERLAP,
  );

  panelWindow.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  });
}

function clampToRange(value: number, min: number, max: number) {
  const safeMax = Math.max(min, max);
  return Math.min(Math.max(value, min), safeMax);
}

// Incremental path: one leaf status change updates only its ancestor chain
// (folder_rollup counters) and re-marks just the folders whose aggregate moved.
function applyLeafCloudStatus(
  relativePath: string,
  status: FileStatus,
  previousStatus: FileStatus | null,
) {
  const syncFolder = currentSettings().syncFolder;
  markCloudFileStatus(syncFolder, relativePath, status);
  if (!db) return;
  try {
    const changed = applyLeafTransition(
      db,
      relativePath,
      previousStatus,
      status,
    );
    for (const folder of changed) {
      if (isExistingDirectory(syncFolder, folder.path)) {
        markCloudFileStatus(syncFolder, folder.path, folder.status);
      }
    }
  } catch (error) {
    console.warn("[gyenbox-cloud-files] folder rollup update failed", error);
  }
}

// Full pass: rebuild folder counters from local_files and re-mark every known
// file and folder. Used on startup and on "Repair Explorer status" so drift
// (or an Explorer that dropped its icon cache) self-corrects.
function applyKnownCloudFileStatuses() {
  if (!db) return;
  try {
    const syncFolder = currentSettings().syncFolder;
    rebuildFolderRollup(db);

    const rows = db
      .prepare(
        "SELECT relative_path, status FROM local_files WHERE status IN ('queued', 'syncing', 'uploaded', 'failed')",
      )
      .all()
      .map((row) => ({
        relativePath: normalizeRelativePath(String(row.relative_path ?? "")),
        status: String(row.status ?? "queued") as FileStatus,
      }))
      .filter((row) => row.relativePath);

    for (const row of rows) {
      markCloudFileStatus(syncFolder, row.relativePath, row.status);
    }

    for (const folder of allFolderAggregates(db)) {
      if (isExistingDirectory(syncFolder, folder.path)) {
        markCloudFileStatus(syncFolder, folder.path, folder.status);
      }
    }
  } catch (error) {
    console.warn(
      "[gyenbox-cloud-files] could not apply existing file states",
      error,
    );
  }
  applyCloudRootStatus(currentSnapshot());
}

function normalizeRelativePath(relativePath: string) {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function isExistingDirectory(syncFolder: string, relativePath: string) {
  const absolutePath = join(syncFolder, relativePath.replace(/\//g, "\\"));
  if (!existsSync(absolutePath)) return false;
  try {
    return statSync(absolutePath).isDirectory();
  } catch {
    return false;
  }
}

function applyCloudRootStatus(snapshot: DesktopSnapshot) {
  const { summary } = snapshot;
  const clean = isExplorerRootClean(snapshot);
  const rootState = clean ? "synced" : "dirty";
  markCloudSyncRootStatus(summary.syncFolder, clean ? "uploaded" : "queued");
  updateExplorerRootOverlayStatus(summary.syncFolder, rootState);
}

function currentExplorerOverlayRootState() {
  return isExplorerRootClean(currentSnapshot()) ? "synced" : "dirty";
}

function isExplorerRootClean(snapshot: DesktopSnapshot) {
  const { summary } = snapshot;
  return (
    summary.accessTokenConfigured &&
    !summary.paused &&
    summary.queued === 0 &&
    summary.syncing === 0 &&
    summary.failed === 0
  );
}

function updateExplorerRootOverlayStatus(syncFolder: string, rootState: "synced" | "dirty") {
  if (process.platform !== "win32") return;
  const stateKey = `${syncFolder}\u0000${rootState}`;
  if (lastExplorerOverlayStateKey === stateKey) return;
  lastExplorerOverlayStateKey = stateKey;
  void updateExplorerOverlayState(syncFolder, rootState).catch((error) => {
    console.warn("[gyenbox-shell] Explorer overlay state update failed", error);
    lastExplorerOverlayStateKey = null;
  });
}

async function updateDesktopSettings(input: Partial<DesktopSettings>) {
  const previousFolder = currentSettings().syncFolder;
  const snapshot = engine
    ? await engine.updateSettings(input)
    : await updateSettingsBeforeEngine(input);
  if (snapshot.settings.syncFolder !== previousFolder) {
    await cleanupLegacySyncCoreState(snapshot.settings.syncFolder);
    const pinned = await pinQuickAccessBeforeCloudRoot(snapshot.settings.syncFolder);
    if (!pinned) scheduleQuickAccessPinRetry(snapshot.settings.syncFolder);
    await cleanupGyenBoxExplorerRoots(snapshot.settings.syncFolder);
    scheduleExplorerIntegration(snapshot.settings.syncFolder);
    restartCloudProvider(snapshot.settings.syncFolder);
    applyKnownCloudFileStatuses();
  }
  return snapshot;
}

function registerIpc() {
  ipcMain.handle("desktop:getAppVersion", () => app.getVersion());
  ipcMain.handle("desktop:startSetup", async () => runSetupSequence());
  ipcMain.handle("desktop:repairSetup", async () => runSetupSequence(true));
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
  ipcMain.handle("desktop:repairExplorerStatus", async () => {
    applyKnownCloudFileStatuses();
    return publicSnapshot(currentSnapshot());
  });
  ipcMain.handle("desktop:openFolder", async () => openSyncFolder());
  ipcMain.handle("desktop:showStartShortcut", async () => {
    if (process.platform !== "win32") return;
    const shortcutPath =
      (await ensureTaskbarPinShortcut({
        appUserModelId: APP_USER_MODEL_ID,
        shortcutAppUserModelId: FOLDER_SHORTCUT_APP_USER_MODEL_ID,
        shortcutName: SHORTCUT_NAME,
        description: "Open your GyenBox folder.",
        syncFolder: currentSettings().syncFolder,
      })) ?? startMenuShortcutPath(SHORTCUT_NAME);
    if (existsSync(shortcutPath)) shell.showItemInFolder(shortcutPath);
  });
  ipcMain.handle("desktop:openWeb", async () =>
    shell.openExternal("https://gyenbox.com"),
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
  // Setup-only folder picker: the user chooses WHERE their GyenBox folder lives
  // (Dropbox-style). Unlike desktop:chooseFolder, this only records the path --
  // the setup orchestrator does the actual create/pin/cloud registration, so we
  // don't double-register here.
  ipcMain.handle("desktop:getSyncFolder", () => currentSettings().syncFolder);
  ipcMain.handle("desktop:chooseSetupFolder", async () => {
    const current = currentSettings().syncFolder;
    const dialogOptions = {
      title: "Choose where your GyenBox folder lives",
      defaultPath: dirname(current),
      properties: ["openDirectory", "createDirectory"] as Array<
        "openDirectory" | "createDirectory"
      >,
    };
    choosingFolder = true;
    try {
      const result =
        setupWindow && !setupWindow.isDestroyed()
          ? await dialog.showOpenDialog(setupWindow, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);
      if (result.canceled || !result.filePaths[0]) return current;
      const parent = result.filePaths[0];
      // Keep files inside a clearly-named GyenBox folder unless the user already
      // picked one named exactly that (so they don't get D:\GyenBox\GyenBox).
      const chosen =
        basename(parent).toLowerCase() === "gyenbox"
          ? parent
          : join(parent, "GyenBox");
      await settings?.update({ syncFolder: chosen });
      return chosen;
    } finally {
      choosingFolder = false;
    }
  });
  ipcMain.handle("desktop:finishSetup", async () => {
    await openSyncFolder();
    if (setupWindow && !setupWindow.isDestroyed()) setupWindow.hide();
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
      diskTotalBytes: 0,
      diskUsedBytes: 0,
      diskFreeBytes: 0,
      lastMessage: accessTokenConfigured
        ? "Starting GyenBox desktop."
        : "Sign in to start uploading.",
      updatedAt: new Date().toISOString(),
    },
    files: [],
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
  tray?.setToolTip(trayTooltip(snapshot.summary.lastMessage));
  tray?.setContextMenu(contextMenu());
}

function trayTooltip(message = "Starting GyenBox desktop.") {
  return `GyenBox ${app.getVersion()}\n${message}`;
}

function createTrayIcon(state: string) {
  const bundledIcon = loadBundledIcon(TRAY_ICON_SIZE, ["tray-icon.png", "icon.png", "icon.ico"]);
  if (bundledIcon) return bundledIcon;

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
  return image.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });
}

function trayIconSvg(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 64 64"><path d="M32 .5 63.25 18v28.25L32 63.75.75 46.25V18L32 .5Z" fill="rgba(0,0,0,.2)" transform="translate(0 1)"/><path d="M.75 18 32 36.25v27.5L.75 46.25V18Z" fill="#EDF1FA" stroke="#1E2430" stroke-opacity=".7" stroke-width="1.18"/><path d="M63.25 18 32 36.25v27.5l31.25-17.5V18Z" fill="#D3DFF8" stroke="#1E2430" stroke-opacity=".7" stroke-width="1.18"/><path d="M32 .5 63.25 18 32 36.25.75 18 32 .5Z" fill="#FAFCFF" stroke="#1E2430" stroke-opacity=".78" stroke-width="1.18"/><path d="M32 7.75 49 17.5 32 27.5 15 17.5 32 7.75Z" fill="#1E222C" stroke="${accent}" stroke-width="2.05"/><path d="M20.5 17.5 32 11l11.5 6.5" fill="none" stroke="rgba(168,183,255,.62)" stroke-width=".85" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 36.25v25" fill="none" stroke="rgba(95,116,196,.82)" stroke-width="1.25" stroke-linecap="round"/><path d="M31 35.7 .75 18 .75 46.25 32 63.75 32 50.75 22.5 45.25" fill="none" stroke="${accent}" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 63.75 32 36.25 63.25 18M32 49.25 52.25 37.5" fill="none" stroke="${accent}" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function createAppIcon() {
  const bundledIcon = loadBundledIcon(64, ["icon.ico", "icon.png"]);
  if (bundledIcon) return bundledIcon;

  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(brandIconSvg("#5F74C4"))}`,
  );
}

function loadBundledIcon(size: number, iconNames: string[]) {
  const iconBasePath = app.isPackaged
    ? process.resourcesPath
    : join(__dirname, "..", "..", "build");

  for (const iconName of iconNames) {
    const image = nativeImage.createFromPath(join(iconBasePath, iconName));
    if (!image.isEmpty()) return image.resize({ width: size, height: size });
  }
  return null;
}

function brandIconSvg(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 .5 63.25 18v28.25L32 63.75.75 46.25V18L32 .5Z" fill="rgba(0,0,0,.2)" transform="translate(0 1)"/><path d="M.75 18 32 36.25v27.5L.75 46.25V18Z" fill="#EDF1FA" stroke="#1E2430" stroke-opacity=".7" stroke-width="1.18"/><path d="M63.25 18 32 36.25v27.5l31.25-17.5V18Z" fill="#D3DFF8" stroke="#1E2430" stroke-opacity=".7" stroke-width="1.18"/><path d="M32 .5 63.25 18 32 36.25.75 18 32 .5Z" fill="#FAFCFF" stroke="#1E2430" stroke-opacity=".78" stroke-width="1.18"/><path d="M32 7.75 49 17.5 32 27.5 15 17.5 32 7.75Z" fill="#1E222C" stroke="${accent}" stroke-width="2.05"/><path d="M20.5 17.5 32 11l11.5 6.5" fill="none" stroke="rgba(168,183,255,.62)" stroke-width=".85" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 36.25v25" fill="none" stroke="rgba(95,116,196,.82)" stroke-width="1.25" stroke-linecap="round"/><path d="M31 35.7 .75 18 .75 46.25 32 63.75 32 50.75 22.5 45.25" fill="none" stroke="${accent}" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 63.75 32 36.25 63.25 18M32 49.25 52.25 37.5" fill="none" stroke="${accent}" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
