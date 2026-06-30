import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

import { resolveSyncCorePath } from "./cloud-files.js";

type SyncCoreEvent = {
  type?: string;
  path?: string;
  message?: string;
};

export type SyncCoreHandle = {
  stop: () => void;
};

export function startSyncCore(
  syncFolder: string,
  stateFolder: string,
  onEvent: (event: SyncCoreEvent) => void,
): SyncCoreHandle | null {
  const binaryPath = resolveSyncCorePath();
  if (!binaryPath) return null;

  const child = spawnCore(binaryPath, syncFolder, stateFolder);
  const stdout = createInterface({ input: child.stdout });
  const stderr = createInterface({ input: child.stderr });

  stdout.on("line", (line) => {
    const event = parseEvent(line);
    if (event) onEvent(event);
  });
  stderr.on("line", (line) => console.warn(`[gyenbox-sync] ${line}`));
  child.on("error", (error) => console.warn(`[gyenbox-sync] ${error.message}`));

  return {
    stop: () => {
      stdout.close();
      stderr.close();
      child.kill();
    },
  };
}

function spawnCore(
  binaryPath: string,
  syncFolder: string,
  stateFolder: string,
): ChildProcessWithoutNullStreams {
  return spawn(binaryPath, [], {
    env: {
      ...process.env,
      GYENBOX_SYNC_FOLDER: syncFolder,
      GYENBOX_STATE_FOLDER: stateFolder,
    },
    windowsHide: true,
  });
}

function parseEvent(line: string): SyncCoreEvent | null {
  try {
    return JSON.parse(line) as SyncCoreEvent;
  } catch {
    return null;
  }
}
