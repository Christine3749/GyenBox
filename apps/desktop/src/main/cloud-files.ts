import { app } from "electron";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { logError, logInfo, logWarn } from "./logging.js";
import type { FileStatus } from "./sync-types.js";

let warnedMissingHelper = false;
let statusDrainPromise: Promise<void> | null = null;
const pendingStatusMarks = new Map<string, CloudStatusRequest>();
let connectedProviderRoot: string | null = null;
type CloudProviderMarker = (relativePath: string, status: CloudFileStatus) => Promise<void>;
let connectedProviderMarker: CloudProviderMarker | null = null;

type CloudFileStatus = "dirty" | "uploaded";
type CloudStatusScope = "path" | "root";

type CloudStatusRequest = {
  scope: CloudStatusScope;
  syncFolder: string;
  relativePath: string;
  status: CloudFileStatus;
  attempt: number;
};

export function resolveSyncCorePath() {
  const envPath = process.env.GYENBOX_SYNC_CORE_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const resourcePath = join(process.resourcesPath, "bin", "gyenbox-sync.exe");
  if (existsSync(resourcePath)) return resourcePath;

  const devPath = join(
    app.getAppPath(),
    "..",
    "..",
    "target",
    "release",
    "gyenbox-sync.exe",
  );
  if (existsSync(devPath)) return devPath;

  const cwdPath = join(process.cwd(), "target", "release", "gyenbox-sync.exe");
  if (existsSync(cwdPath)) return cwdPath;

  return null;
}

export function setCloudProviderConnected(
  syncFolder: string | null,
  marker: CloudProviderMarker | null = null,
) {
  connectedProviderRoot = syncFolder;
  connectedProviderMarker = marker;
  if (syncFolder) void drainStatusMarksSoon();
}

export function cleanupCloudSyncRoots(syncFolder: string) {
  if (process.platform !== "win32") return Promise.resolve();
  return runCloudCommand(["cloud-cleanup-roots", syncFolder]).catch((error) => {
    console.warn(`[gyenbox-cloud-files] cleanup roots skipped: ${error.message}`);
  });
}
export function registerCloudSyncRoot(syncFolder: string) {
  if (process.platform !== "win32") return Promise.resolve();
  return runCloudCommand(["cloud-register", syncFolder, app.getVersion()]).catch(
    (error) => {
      console.warn(`[gyenbox-cloud-files] register failed: ${error.message}`);
      throw error;
    },
  );
}

export function unregisterCloudSyncRoot(syncFolder: string) {
  if (process.platform !== "win32") return Promise.resolve();
  return runCloudCommand(["cloud-unregister", syncFolder]).catch((error) => {
    console.warn(`[gyenbox-cloud-files] unregister skipped: ${error.message}`);
  });
}

export function markCloudSyncRootStatus(
  syncFolder: string,
  status: FileStatus | CloudFileStatus,
) {
  if (process.platform !== "win32") return;
  enqueueStatusMark("root", syncFolder, "", status);
}

export function markCloudFileStatus(
  syncFolder: string,
  relativePath: string,
  status: FileStatus,
) {
  if (process.platform !== "win32") return;
  if (!relativePath || status === "deleted" || status === "skipped") return;
  enqueueStatusMark("path", syncFolder, relativePath, status);
}

export async function flushCloudFileStatusMarks() {
  while (pendingStatusMarks.size > 0 || statusDrainPromise) {
    await drainStatusMarksSoon();
  }
}

export function setCloudPathPinState(
  targetPath: string,
  state: "pinned" | "online-only",
) {
  if (process.platform !== "win32") return Promise.resolve();
  return runCloudCommand(["cloud-pin", targetPath, state]);
}

function enqueueStatusMark(
  scope: CloudStatusScope,
  syncFolder: string,
  relativePath: string,
  status: FileStatus | CloudFileStatus,
) {
  const key = markKey(scope, syncFolder, relativePath);
  pendingStatusMarks.set(key, {
    scope,
    syncFolder,
    relativePath,
    status: status === "uploaded" ? "uploaded" : "dirty",
    attempt: 0,
  });
  void drainStatusMarksSoon();
}

function drainStatusMarksSoon() {
  if (!statusDrainPromise) {
    statusDrainPromise = drainStatusMarks().finally(() => {
      statusDrainPromise = null;
      if (pendingStatusMarks.size > 0) void drainStatusMarksSoon();
    });
  }
  return statusDrainPromise;
}

async function drainStatusMarks() {
  while (pendingStatusMarks.size > 0) {
    const entry = pendingStatusMarks.entries().next().value;
    if (!entry) break;

    const [key, request] = entry;
    pendingStatusMarks.delete(key);

    try {
      const providerMarker = cloudProviderMarkerFor(request);
      if (providerMarker) await providerMarker(request.relativePath, request.status);
      else await runCloudCommand(cloudMarkArgs(request));
    } catch (error) {
      if (pendingStatusMarks.has(key)) continue;
      if (request.attempt < 2) {
        pendingStatusMarks.set(key, {
          ...request,
          attempt: request.attempt + 1,
        });
        await delay(200 * (request.attempt + 1));
        continue;
      }
      console.warn(
        `[gyenbox-cloud-files] mark ${request.relativePath || "<root>"} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

function cloudProviderMarkerFor(request: CloudStatusRequest) {
  if (connectedProviderRoot !== request.syncFolder) return null;
  if (!connectedProviderMarker) return null;
  if (request.scope === "root") return connectedProviderMarker;
  return connectedProviderMarker;
}

function cloudMarkArgs(request: CloudStatusRequest) {
  if (request.scope === "root") {
    return ["cloud-mark-root", request.syncFolder, request.status];
  }

  return ["cloud-mark", request.syncFolder, request.relativePath, request.status];
}

function markKey(
  scope: CloudStatusScope,
  syncFolder: string,
  relativePath: string,
) {
  return `${scope}\u0000${syncFolder}\u0000${relativePath}`;
}

function runCloudCommand(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const shouldLog = shouldLogCloudCommand(args);
    const binaryPath = resolveSyncCorePath();
    if (!binaryPath) {
      if (!warnedMissingHelper) {
        warnedMissingHelper = true;
        console.warn(
          "[gyenbox-cloud-files] gyenbox-sync.exe helper was not found.",
        );
        logWarn("cloud-files", "helper missing", { args });
      }
      resolve();
      return;
    }

    if (shouldLog) logInfo("cloud-files", "helper start", { binaryPath, args });
    const child = spawn(binaryPath, args, {
      env: { ...process.env, GYENBOX_SHELL_ICON: process.execPath },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      logError("cloud-files", "helper spawn error", { args, error });
      reject(error);
    });
    child.on("exit", (code) => {
      const details = {
        args,
        code,
        durationMs: Date.now() - startedAt,
        stdout: stdout.trim().slice(0, 4000),
        stderr: stderr.trim().slice(0, 4000),
      };
      if (code === 0) {
        if (shouldLog) logInfo("cloud-files", "helper ok", details);
        resolve();
      } else {
        logError("cloud-files", "helper failed", details);
        reject(new Error(stderr.trim() || `gyenbox-sync exited with ${code}`));
      }
    });
  });
}

function shouldLogCloudCommand(args: string[]) {
  const command = args[0] ?? "";
  return command !== "cloud-mark" && command !== "cloud-mark-connected";
}
