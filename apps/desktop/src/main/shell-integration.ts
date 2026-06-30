import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { logInfo, logWarn } from "./logging.js";

export type ExplorerShellAction =
  | "make-online-only"
  | "make-available-offline"
  | "view-on-web"
  | "file-info"
  | "manage-space"
  | "sync-storage";

export type ExplorerShellCommand = {
  action: ExplorerShellAction;
  targetPath: string | null;
};

type MenuTarget = {
  key: string;
  placeholder: "%1" | "%V";
};

type MenuCommand = {
  key: string;
  label: string;
  action: ExplorerShellAction;
};

type ExplorerOverlayRootState = "synced" | "dirty";

type ExplorerOverlayRegistration = {
  syncFolder: string;
  shellExtensionDllPath: string;
  overlaySyncedIconPath: string;
  namespaceIconPath: string;
  rootState: ExplorerOverlayRootState;
};

const SHELL_SWITCH = "--gyenbox-shell";
const CONTEXT_MENU_ID = "GyenBox";
const SYNCED_OVERLAY_CLSID = "{E6E22C74-2E0A-4F91-9665-9FC3902DD593}";
const OVERLAY_KEY = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ShellIconOverlayIdentifiers\\  GyenBoxSynced`;
const OVERLAY_CLSID_KEY = `HKCU\\Software\\Classes\\CLSID\\${SYNCED_OVERLAY_CLSID}`;
const SHELL_SETTINGS_KEY = "HKCU\\Software\\GyenBox\\Shell";
const MENU_TARGETS: MenuTarget[] = [
  { key: `HKCU\\Software\\Classes\\*\\shell\\${CONTEXT_MENU_ID}`, placeholder: "%1" },
  { key: `HKCU\\Software\\Classes\\Directory\\shell\\${CONTEXT_MENU_ID}`, placeholder: "%1" },
  { key: `HKCU\\Software\\Classes\\Directory\\Background\\shell\\${CONTEXT_MENU_ID}`, placeholder: "%V" },
];
const MENU_COMMANDS: MenuCommand[] = [
  { key: "01MakeOnlineOnly", label: "Make online-only", action: "make-online-only" },
  { key: "02MakeAvailableOffline", label: "Make available offline", action: "make-available-offline" },
  { key: "03ViewOnWeb", label: "View on GyenBox.com", action: "view-on-web" },
  { key: "04FileInfo", label: "File info...", action: "file-info" },
  { key: "05ManageSpace", label: "Manage hard drive space", action: "manage-space" },
  { key: "06SyncStorage", label: "Sync & storage", action: "sync-storage" },
];

export function findExplorerShellCommand(
  argv: readonly string[],
): ExplorerShellCommand | null {
  const switchIndex = argv.findIndex((value) => value === SHELL_SWITCH);
  if (switchIndex < 0) return null;

  const action = argv[switchIndex + 1] as ExplorerShellAction | undefined;
  if (!action || !isExplorerShellAction(action)) return null;

  const targetPath = argv[switchIndex + 2]?.trim() || null;
  return { action, targetPath };
}

export async function registerExplorerContextMenuIntegration() {
  if (process.platform !== "win32") return;

  await registerExplorerContextMenu();
}

export async function registerExplorerOverlayIntegration(
  options: ExplorerOverlayRegistration,
) {
  if (process.platform !== "win32") return;
  if (!existsSync(options.shellExtensionDllPath)) {
    throw new Error(`Explorer overlay DLL was not found: ${options.shellExtensionDllPath}`);
  }
  if (!existsSync(options.overlaySyncedIconPath)) {
    throw new Error(`Explorer overlay icon was not found: ${options.overlaySyncedIconPath}`);
  }

  await regAddDefault(OVERLAY_CLSID_KEY, "GyenBox Synced Overlay");
  await regAddDefault(
    `${OVERLAY_CLSID_KEY}\\InProcServer32`,
    options.shellExtensionDllPath,
  );
  await regAddValue(
    `${OVERLAY_CLSID_KEY}\\InProcServer32`,
    "ThreadingModel",
    "REG_SZ",
    "Apartment",
  );
  await regAddDefault(OVERLAY_KEY, SYNCED_OVERLAY_CLSID);
  await writeExplorerOverlayState(options);
  await notifyExplorerAssociationsChanged();
}

export async function updateExplorerOverlayState(
  syncFolder: string,
  rootState: ExplorerOverlayRootState,
) {
  if (process.platform !== "win32") return;
  await writeExplorerOverlayState({ syncFolder, rootState });
  await notifyExplorerPathChanged(syncFolder);
  await notifyExplorerPathChanged(dirname(syncFolder));
}
export async function applySyncFolderIcon(syncFolder: string, iconPath: string) {
  if (process.platform !== "win32") return;
  if (!existsSync(syncFolder) || !existsSync(iconPath)) return;

  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$path = ${powershellString(syncFolder)}
$icon = ${powershellString(iconPath)}
$iniPath = Join-Path $path 'desktop.ini'
$ini = [string]::Join([Environment]::NewLine, @("[.ShellClassInfo]", "IconResource=$icon,0", "IconFile=$icon", "IconIndex=0", "InfoTip=GyenBox")) + [Environment]::NewLine
Set-Content -LiteralPath $iniPath -Value $ini -Encoding Unicode -Force
attrib +r "$path" 2>$null
attrib +h +s "$iniPath" 2>$null
`;

  await runHidden(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { timeoutMs: 4_000 },
  );
  await notifyExplorerPathChanged(syncFolder);
  await notifyExplorerPathChanged(dirname(syncFolder));
}
export async function pinSyncFolderToQuickAccess(syncFolder: string) {
  if (process.platform !== "win32") return;
  if (!existsSync(syncFolder)) {
    logWarn("quick-access", "sync folder missing before pin", { syncFolder });
    return;
  }
  logInfo("quick-access", "shell pin script start", { syncFolder });

  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$path = ${powershellString(syncFolder)}

function Get-GyenBoxFolderItem {
  param([string]$TargetPath, [object]$ShellObject)
  $parent = [System.IO.Path]::GetDirectoryName($TargetPath)
  $name = [System.IO.Path]::GetFileName($TargetPath)
  $folder = $ShellObject.Namespace($parent)
  if (-not $folder) { return $null }
  return $folder.ParseName($name)
}

function Normalize-PathForCompare([string]$value) {
  if (-not $value) { return '' }
  try { return ([System.IO.Path]::GetFullPath($value)).TrimEnd('\\').ToLowerInvariant() } catch { return $value.TrimEnd('\\').ToLowerInvariant() }
}

function Test-GyenBoxQuickAccessPinned {
  param([string]$TargetPath, [object]$ShellObject)
  $target = Normalize-PathForCompare $TargetPath
  $quickAccess = $ShellObject.Namespace('shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}')
  if (-not $quickAccess) { return $false }
  foreach ($entry in @($quickAccess.Items())) {
    if ((Normalize-PathForCompare ([string]$entry.Path)) -eq $target) { return $true }
  }
  return $false
}

$shell = New-Object -ComObject Shell.Application

function Invoke-GyenBoxQuickAccessUnpin {
  param([object]$Entry)
  foreach ($verb in @($Entry.Verbs())) {
    $label = ($verb.Name -replace '&', '').Trim()
    if (
      $label -eq 'Unpin from Quick access' -or
      $label -eq 'Remove from Quick access' -or
      $label -eq '从快速访问取消固定' -or
      $label -eq '取消固定到快速访问' -or
      $label -eq '从快速访问中删除'
    ) {
      $verb.DoIt()
      return $true
    }
  }
  return $false
}

function Cleanup-GyenBoxQuickAccessDuplicates {
  param([string]$TargetPath, [object]$ShellObject)
  $target = Normalize-PathForCompare $TargetPath
  $quickAccess = $ShellObject.Namespace('shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}')
  if (-not $quickAccess) { return }
  $targetSeen = $false
  foreach ($entry in @($quickAccess.Items())) {
    $entryPath = [string]$entry.Path
    $entryName = [string]$entry.Name
    $entryBase = [System.IO.Path]::GetFileName($entryPath)
    if ($entryName -ne 'GyenBox' -and $entryBase -ne 'GyenBox') { continue }

    $entryNorm = Normalize-PathForCompare $entryPath
    if ($entryNorm -eq $target) {
      if ($targetSeen) { [void](Invoke-GyenBoxQuickAccessUnpin -Entry $entry) }
      else { $targetSeen = $true }
      continue
    }

    if ($entryBase -eq 'GyenBox') {
      [void](Invoke-GyenBoxQuickAccessUnpin -Entry $entry)
    }
  }
}

Cleanup-GyenBoxQuickAccessDuplicates -TargetPath $path -ShellObject $shell
Start-Sleep -Milliseconds 150
if (Test-GyenBoxQuickAccessPinned -TargetPath $path -ShellObject $shell) { exit 0 }

$item = Get-GyenBoxFolderItem -TargetPath $path -ShellObject $shell
if (-not $item) { exit 4 }

$verbs = @($item.Verbs())
$pinVerb = $verbs | Where-Object {
  $label = ($_.Name -replace '&', '').Trim()
  $label -eq 'Pin to Quick access' -or $label -eq '固定到快速访问'
} | Select-Object -First 1
if ($pinVerb) {
  $pinVerb.DoIt()
} else {
  $item.InvokeVerb('pintohome')
}

for ($i = 0; $i -lt 8; $i++) {
  Start-Sleep -Milliseconds 250
  if (Test-GyenBoxQuickAccessPinned -TargetPath $path -ShellObject $shell) { exit 0 }
}
exit 2
`;

  try {
    await runHidden(
      "powershell.exe",
    [
      "-NoProfile",
      "-Sta",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ],
      { timeoutMs: 3_500 },
    );
    logInfo("quick-access", "shell pin script ok", { syncFolder });
  } catch (error) {
    logWarn("quick-access", "shell pin script failed", { syncFolder, error });
    throw error;
  }
}
export async function cleanupStaleGyenBoxNamespaceEntries(syncFolder: string) {
  if (process.platform !== "win32") return;

  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$currentPath = ${powershellString(syncFolder)}
function Normalize-PathForCompare([string]$value) {
  if (-not $value) { return '' }
  try { return ([System.IO.Path]::GetFullPath($value)).TrimEnd('\\').ToLowerInvariant() } catch { return $value.TrimEnd('\\').ToLowerInvariant() }
}
$current = Normalize-PathForCompare $currentPath
$syncRootBase = 'Registry::HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager'
$currentRootId = $null
if (Test-Path -LiteralPath $syncRootBase) {
  Get-ChildItem -LiteralPath $syncRootBase -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -like 'GyenBox!*' } | ForEach-Object {
    $userRoots = Join-Path $_.PSPath 'UserSyncRoots'
    if (-not (Test-Path -LiteralPath $userRoots)) { return }
    $props = Get-ItemProperty -LiteralPath $userRoots -ErrorAction SilentlyContinue
    foreach ($p in $props.PSObject.Properties) {
      if ($p.Name -match '^PS') { continue }
      if ((Normalize-PathForCompare ([string]$p.Value)) -eq $current) { $currentRootId = $_.PSChildName }
    }
  }
}
$namespaceBase = 'Registry::HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace'
if (Test-Path -LiteralPath $namespaceBase) {
  Get-ChildItem -LiteralPath $namespaceBase -ErrorAction SilentlyContinue | ForEach-Object {
    $default = (Get-Item -LiteralPath $_.PSPath).GetValue('')
    if ([string]$default -like 'GyenBox!*' -and $default -ne $currentRootId) {
      Remove-Item -LiteralPath $_.PSPath -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath ('Registry::HKEY_CURRENT_USER\\Software\\Classes\\CLSID\\' + $_.PSChildName) -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}
`;

  await runHidden(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { timeoutMs: 4_000 },
  );
}

export async function ensureQuickAccessFolderShortcut(syncFolder: string) {
  if (process.platform !== "win32") return;
  if (!existsSync(syncFolder)) return;

  const script = `
$ErrorActionPreference = 'Stop'
$path = ${powershellString(syncFolder)}
$links = Join-Path $env:USERPROFILE 'Links'
New-Item -ItemType Directory -Path $links -Force | Out-Null
$shortcutPath = Join-Path $links 'GyenBox.lnk'
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $path
$shortcut.WorkingDirectory = $path
$shortcut.IconLocation = ${powershellString(shellIconValue())}
$shortcut.Description = 'Open your GyenBox folder'
$shortcut.Save()
`;

  await runHidden(
    "powershell.exe",
    ["-NoProfile", "-Sta", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { timeoutMs: 4_000 },
  );
}
export function isInsideSyncFolder(targetPath: string, syncFolder: string) {
  const root = normalizeForCompare(syncFolder);
  const target = normalizeForCompare(targetPath);
  return target === root || target.startsWith(`${root}\\`);
}

export function shellActionLabel(action: ExplorerShellAction) {
  return MENU_COMMANDS.find((command) => command.action === action)?.label ?? "GyenBox";
}

export function shellTargetName(targetPath: string | null) {
  if (!targetPath) return "GyenBox";
  return basename(targetPath) || targetPath;
}

async function writeExplorerOverlayState(
  options: {
    syncFolder: string;
    rootState: ExplorerOverlayRootState;
    overlaySyncedIconPath?: string;
    namespaceIconPath?: string;
    shellExtensionDllPath?: string;
  },
) {
  await regAddValue(SHELL_SETTINGS_KEY, "SyncRoot", "REG_SZ", options.syncFolder);
  await regAddValue(SHELL_SETTINGS_KEY, "RootState", "REG_SZ", options.rootState);
  if (options.overlaySyncedIconPath) {
    await regAddValue(
      SHELL_SETTINGS_KEY,
      "OverlaySyncedIcon",
      "REG_SZ",
      options.overlaySyncedIconPath,
    );
  }
  if (options.namespaceIconPath) {
    await regAddValue(
      SHELL_SETTINGS_KEY,
      "NamespaceIcon",
      "REG_SZ",
      `${options.namespaceIconPath},0`,
    );
  }
  if (options.shellExtensionDllPath) {
    await regAddValue(
      SHELL_SETTINGS_KEY,
      "ShellExtensionDll",
      "REG_SZ",
      options.shellExtensionDllPath,
    );
  }
}

async function registerExplorerContextMenu() {
  for (const target of MENU_TARGETS) {
    await regAddValue(target.key, "MUIVerb", "REG_SZ", "GyenBox");
    await regAddValue(target.key, "Icon", "REG_SZ", shellIconValue());
    await regAddValue(target.key, "SubCommands", "REG_SZ", "");
    await regAddValue(target.key, "Position", "REG_SZ", "Top");

    for (const command of MENU_COMMANDS) {
      const commandKey = `${target.key}\\shell\\${command.key}`;
      await regAddValue(commandKey, "MUIVerb", "REG_SZ", command.label);
      await regAddValue(commandKey, "Icon", "REG_SZ", shellIconValue());
      await regAddDefault(
        `${commandKey}\\command`,
        shellCommand(command.action, target.placeholder),
      );
    }
  }
}


function shellCommand(action: ExplorerShellAction, placeholder: "%1" | "%V") {
  return `${shellCommandPrefix()} ${SHELL_SWITCH} ${action} "${placeholder}"`;
}

function shellCommandPrefix() {
  const runningDefaultApp = Boolean(
    (process as NodeJS.Process & { defaultApp?: boolean }).defaultApp,
  );
  const parts = [quoteForCommand(process.execPath)];
  if (runningDefaultApp && process.argv[1]) {
    parts.push(quoteForCommand(process.argv[1]));
  }
  return parts.join(" ");
}

function shellIconValue() {
  return `${process.execPath},0`;
}

function isExplorerShellAction(value: string): value is ExplorerShellAction {
  return MENU_COMMANDS.some((command) => command.action === value);
}

function normalizeForCompare(path: string) {
  return resolve(path).replace(/\\+$/, "").toLowerCase();
}

function quoteForCommand(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function powershellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function regAddValue(key: string, name: string, type: "REG_SZ", value: string) {
  return runHidden("reg.exe", ["add", key, "/f", "/v", name, "/t", type, "/d", value]);
}

function regAddDefault(key: string, value: string) {
  return runHidden("reg.exe", ["add", key, "/f", "/ve", "/d", value]);
}

function notifyExplorerAssociationsChanged() {
  return notifyExplorer(0x08000000, 0, null);
}

function notifyExplorerPathChanged(path: string) {
  return notifyExplorer(0x00000800, 0x0005 | 0x1000, path);
}

function notifyExplorer(eventId: number, flags: number, path: string | null) {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class GyenBoxShellNotify {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  public static extern void SHChangeNotify(int wEventId, uint uFlags, string dwItem1, IntPtr dwItem2);
}
"@
[GyenBoxShellNotify]::SHChangeNotify(${eventId}, ${flags}, ${path ? powershellString(path) : "$null"}, [IntPtr]::Zero)
`;
  return runHidden(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { timeoutMs: 2_500 },
  );
}

function runHidden(
  command: string,
  args: string[],
  options: { timeoutMs?: number } = {},
) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = "";
    let settled = false;
    const timer =
      options.timeoutMs === undefined
        ? null
        : setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill();
            reject(new Error(`${command} timed out after ${options.timeoutMs}ms`));
          }, options.timeoutMs);
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      callback();
    };
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => settle(() => reject(error)));
    child.on("exit", (code) => {
      settle(() => {
        if (code === 0) resolvePromise();
        else reject(new Error(stderr.trim() || `${command} exited with ${code}`));
      });
    });
  });
}


