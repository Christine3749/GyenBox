import { app } from "electron";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import type { FileStatus } from "./sync-types.js";

let warnedMissingHelper = false;

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

export function markCloudFileStatus(
  syncFolder: string,
  relativePath: string,
  status: FileStatus,
) {
  if (process.platform !== "win32") return;
  if (!relativePath || status === "deleted" || status === "skipped") return;

  const cloudStatus = status === "uploaded" ? "uploaded" : "dirty";
  void runCloudCommand([
    "cloud-mark",
    syncFolder,
    relativePath,
    cloudStatus,
  ]).catch((error) => {
    console.warn(
      `[gyenbox-cloud-files] mark ${relativePath} failed: ${error.message}`,
    );
  });
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
