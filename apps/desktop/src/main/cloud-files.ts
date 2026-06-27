import { app } from "electron";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import type { FileStatus } from "./sync-types.js";

let warnedMissingHelper = false;
let statusDrainPromise: Promise<void> | null = null;
const pendingStatusMarks = new Map<string, CloudStatusRequest>();

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

export function registerCloudSyncRoot(syncFolder: string) {
  if (process.platform !== "win32") return;
  void runCloudCommand(["cloud-register", syncFolder, app.getVersion()]).catch(
    (error) => {
      console.warn(`[gyenbox-cloud-files] register failed: ${error.message}`);
    },
  );
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
      const args =
        request.scope === "root"
          ? ["cloud-mark-root", request.syncFolder, request.status]
          : [
              "cloud-mark",
              request.syncFolder,
              request.relativePath,
              request.status,
            ];
      await runCloudCommand(args);
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

function markKey(
  scope: CloudStatusScope,
  syncFolder: string,
  relativePath: string,
) {
  return `${scope}\u0000${syncFolder}\u0000${relativePath}`;
}

function runCloudCommand(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const binaryPath = resolveSyncCorePath();
    if (!binaryPath) {
      if (!warnedMissingHelper) {
        warnedMissingHelper = true;
        console.warn(
          "[gyenbox-cloud-files] gyenbox-sync.exe helper was not found.",
        );
      }
      resolve();
      return;
    }

    const child = spawn(binaryPath, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(stderr.trim() || `gyenbox-sync exited with ${code}`));
    });
  });
}
