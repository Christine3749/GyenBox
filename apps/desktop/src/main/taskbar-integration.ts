import { shell } from "electron";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { logInfo, logWarn } from "./logging.js";

export type TaskbarShortcutOptions = {
  appUserModelId: string;
  shortcutAppUserModelId?: string;
  shortcutName: string;
  description: string;
  syncFolder: string;
};

const OPEN_FOLDER_SWITCH = "--open-folder";
const FOLDER_LAUNCHER_EXE = "gyenbox-folder-launcher.exe";

export function hasOpenFolderSwitch(argv: readonly string[]) {
  return argv.includes(OPEN_FOLDER_SWITCH);
}

export async function ensureTaskbarPinShortcut(options: TaskbarShortcutOptions) {
  if (process.platform !== "win32") return null;

  const shortcut = taskbarShortcutDetails(options);
  const startPath = startMenuShortcutPath(options.shortcutName);
  const pinnedPath = taskbarPinnedShortcutPath(options.shortcutName);

  await writeShortcutIfNeeded(startPath, shortcut);
  await cleanupDuplicateStartMenuShortcuts(
    options.shortcutName,
    startPath,
    options.appUserModelId,
  );

  try {
    const existingPinnedPath = await findExistingPinnedShortcut(
      options.shortcutName,
      pinnedPath,
      options.appUserModelId,
    );
    if (existingPinnedPath) {
      await cleanupDuplicatePinnedShortcuts(
        options.shortcutName,
        existingPinnedPath,
        options.appUserModelId,
      );
      await writeShortcutIfNeeded(existingPinnedPath, shortcut);
      await notifyTaskbarShortcutChanged(existingPinnedPath);
      logInfo("taskbar", "existing pinned shortcut repaired", {
        pinnedPath: existingPinnedPath,
        preferredPinnedPath: pinnedPath,
      });
    } else {
      // Windows 11 keeps taskbar pins in Explorer's Taskband state, not just in
      // this folder. Creating a new .lnk here can produce a visible-but-dead pin.
      // Only repair the pinned shortcut after Windows creates it via user pinning.
      logInfo("taskbar", "pinned shortcut absent; start shortcut ready", { pinnedPath });
    }
  } catch (error) {
    logWarn("taskbar", "pinned taskbar shortcut repair skipped", {
      shortcutPath: pinnedPath,
      error,
    });
  }

  logInfo("taskbar", "shortcut ensured", {
    startPath,
    pinnedPath,
    target: shortcut.target,
    args: shortcut.args,
    appUserModelId: shortcut.appUserModelId,
    runtimeAppUserModelId: options.appUserModelId,
    syncFolder: options.syncFolder,
  });

  return startPath;
}

export function startMenuShortcutPath(shortcutName: string) {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error("APPDATA is not set; cannot repair Start Menu shortcut.");
  }
  return join(
    appData,
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    `${shortcutName}.lnk`,
  );
}

export function taskbarPinnedShortcutPath(shortcutName: string) {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error("APPDATA is not set; cannot repair taskbar shortcut.");
  }
  return join(
    appData,
    "Microsoft",
    "Internet Explorer",
    "Quick Launch",
    "User Pinned",
    "TaskBar",
    `${shortcutName}.lnk`,
  );
}

function taskbarShortcutDetails(options: TaskbarShortcutOptions): Electron.ShortcutDetails {
  const launcherPath = folderLauncherPath();
  const target = launcherPath ?? process.execPath;
  return {
    target,
    cwd: dirname(target),
    args: launcherPath ? quoteShortcutArg(options.syncFolder) : OPEN_FOLDER_SWITCH,
    description: options.description,
    icon: process.execPath,
    iconIndex: 0,
    // Keep the pinned folder launcher separate from the resident tray app.
    // If the shortcut targets GyenBox.exe directly, Windows can treat a click as
    // "activate the already-running Electron app" and never execute --open-folder.
    appUserModelId: options.shortcutAppUserModelId ?? options.appUserModelId,
  };
}

function folderLauncherPath() {
  const candidate = join(process.resourcesPath, "bin", FOLDER_LAUNCHER_EXE);
  return existsSync(candidate) ? candidate : null;
}

async function writeShortcutIfNeeded(
  shortcutPath: string,
  shortcut: Electron.ShortcutDetails,
) {
  await mkdir(dirname(shortcutPath), { recursive: true });
  const existing = safeReadShortcut(shortcutPath);
  if (existing && shortcutMatches(existing, shortcut)) return;

  const written = shell.writeShortcutLink(shortcutPath, "replace", shortcut);
  if (!written) {
    throw new Error(`Could not write shortcut: ${shortcutPath}`);
  }
}

async function cleanupDuplicateStartMenuShortcuts(
  shortcutName: string,
  keepPath: string,
  appUserModelId: string,
) {
  const dir = dirname(keepPath);
  if (!existsSync(dir)) return;

  for (const entry of await readdir(dir)) {
    if (!entry.toLowerCase().endsWith(".lnk")) continue;

    const path = join(dir, entry);
    if (samePath(path, keepPath)) continue;

    const shortcut = safeReadShortcut(path);
    if (looksLikePinnedShortcut(entry, shortcut, shortcutName, appUserModelId)) {
      await rm(path, { force: true });
      logInfo("taskbar", "duplicate start shortcut removed", { path });
    }
  }
}

async function findExistingPinnedShortcut(
  shortcutName: string,
  preferredPath: string,
  appUserModelId: string,
) {
  const dir = dirname(preferredPath);
  if (!existsSync(dir)) return null;
  if (existsSync(preferredPath)) return preferredPath;

  for (const entry of await readdir(dir)) {
    if (!entry.toLowerCase().endsWith(".lnk")) continue;
    const path = join(dir, entry);
    if (
      looksLikePinnedShortcut(
        entry,
        safeReadShortcut(path),
        shortcutName,
        appUserModelId,
      )
    ) {
      return path;
    }
  }
  return null;
}

async function cleanupDuplicatePinnedShortcuts(
  shortcutName: string,
  keepPath: string,
  appUserModelId: string,
) {
  const dir = dirname(keepPath);
  if (!existsSync(dir)) return;

  for (const entry of await readdir(dir)) {
    if (!entry.toLowerCase().endsWith(".lnk")) continue;

    const path = join(dir, entry);
    if (samePath(path, keepPath)) continue;

    const shortcut = safeReadShortcut(path);
    if (looksLikePinnedShortcut(entry, shortcut, shortcutName, appUserModelId)) {
      await rm(path, { force: true });
    }
  }
}

function looksLikePinnedShortcut(
  entry: string,
  shortcut: Electron.ShortcutDetails | null,
  shortcutName: string,
  appUserModelId: string,
) {
  const lowerName = basename(entry, ".lnk").toLowerCase();
  const lowerShortcutName = shortcutName.toLowerCase();
  return (
    lowerName.includes(lowerShortcutName) ||
    (shortcut?.appUserModelId ?? "") === appUserModelId ||
    (shortcut?.target ?? "").toLowerCase().includes("gyenbox")
  );
}

function safeReadShortcut(shortcutPath: string) {
  try {
    return shell.readShortcutLink(shortcutPath);
  } catch {
    return null;
  }
}

function shortcutMatches(
  existing: Electron.ShortcutDetails,
  expected: Electron.ShortcutDetails,
) {
  return (
    samePath(existing.target, expected.target) &&
    samePath(existing.cwd ?? "", expected.cwd ?? "") &&
    (existing.args ?? "") === (expected.args ?? "") &&
    (existing.description ?? "") === (expected.description ?? "") &&
    samePath(existing.icon ?? "", expected.icon ?? "") &&
    Number(existing.iconIndex ?? 0) === Number(expected.iconIndex ?? 0) &&
    (existing.appUserModelId ?? "") === (expected.appUserModelId ?? "")
  );
}

function samePath(left: string, right: string) {
  return left.replace(/[\\/]+$/, "").toLowerCase() === right.replace(/[\\/]+$/, "").toLowerCase();
}

function quoteShortcutArg(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function notifyTaskbarShortcutChanged(shortcutPath: string) {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class GyenBoxTaskbarNotify {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  public static extern void SHChangeNotify(int wEventId, uint uFlags, string dwItem1, IntPtr dwItem2);
}
"@
[GyenBoxTaskbarNotify]::SHChangeNotify(0x08000000, 0, $null, [IntPtr]::Zero)
[GyenBoxTaskbarNotify]::SHChangeNotify(0x00002000, 0x1005, ${powershellString(shortcutPath)}, [IntPtr]::Zero)
ie4uinit.exe -show 2>$null
`;
  return runHidden("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ]);
}

function runHidden(command: string, args: string[]) {
  return new Promise<void>((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    child.on("error", () => resolve());
    child.on("exit", () => resolve());
  });
}

function powershellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}