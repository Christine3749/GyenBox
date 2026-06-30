import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

import { resolveSyncCorePath } from "./cloud-files.js";

export type CloudProviderEvent = {
  event?: string;
  id?: string;
  root?: string;
  relative_path?: string;
  status?: string;
  message?: string;
};

export type CloudProviderHandle = {
  stop: () => void;
  isConnected: () => boolean;
  markPath: (relativePath: string, status: string) => Promise<void>;
};

type PendingMark = {
  resolve: () => void;
  reject: (error: Error) => void;
};

export function startCloudProvider(
  syncFolder: string,
  onEvent: (event: CloudProviderEvent) => void,
): CloudProviderHandle | null {
  const binaryPath = resolveSyncCorePath();
  if (!binaryPath) return null;

  let stopped = false;
  let connected = false;
  const pendingMarks = new Map<string, PendingMark>();
  const child = spawnProvider(binaryPath, syncFolder);
  const stdout = createInterface({ input: child.stdout });
  const stderr = createInterface({ input: child.stderr });

  stdout.on("line", (line) => {
    const event = parseEvent(line);
    if (!event) return;
    if (event.event === "provider_connected") connected = true;
    if (event.event === "mark_applied" && event.id) {
      const pending = pendingMarks.get(event.id);
      pendingMarks.delete(event.id);
      pending?.resolve();
    }
    if (event.event === "mark_failed" && event.id) {
      const pending = pendingMarks.get(event.id);
      pendingMarks.delete(event.id);
      pending?.reject(new Error(event.message ?? "Provider mark failed."));
    }
    onEvent(event);
  });
  stderr.on("line", (line) => console.warn(`[gyenbox-provider] ${line}`));
  child.on("error", (error) => {
    rejectPendingMarks(pendingMarks, error);
    console.warn(`[gyenbox-provider] ${error.message}`);
  });
  child.on("exit", (code, signal) => {
    connected = false;
    rejectPendingMarks(
      pendingMarks,
      new Error(
        `Provider exited${code === null ? "" : ` with ${code}`}${signal ? ` (${signal})` : ""}.`,
      ),
    );
    stdout.close();
    stderr.close();
    if (!stopped) {
      onEvent({
        event: "provider_disconnected",
        message: `Provider exited${code === null ? "" : ` with ${code}`}${signal ? ` (${signal})` : ""}.`,
      });
    }
  });

  return {
    stop: () => {
      stopped = true;
      connected = false;
      rejectPendingMarks(pendingMarks, new Error("Provider stopped."));
      stdout.close();
      stderr.close();
      child.kill();
    },
    isConnected: () => connected,
    markPath: (relativePath: string, status: string) =>
      writeMarkCommand(child, pendingMarks, relativePath, status),
  };
}

function spawnProvider(
  binaryPath: string,
  syncFolder: string,
): ChildProcessWithoutNullStreams {
  return spawn(binaryPath, ["cloud-provider-run", syncFolder], {
    env: { ...process.env, GYENBOX_SHELL_ICON: process.execPath },
    windowsHide: true,
  });
}

function writeMarkCommand(
  child: ChildProcessWithoutNullStreams,
  pendingMarks: Map<string, PendingMark>,
  relativePath: string,
  status: string,
) {
  return new Promise<void>((resolve, reject) => {
    if (!child.stdin.writable) {
      reject(new Error("Provider command pipe is closed."));
      return;
    }

    const id = randomUUID();
    pendingMarks.set(id, { resolve, reject });
    const safeRelativePath = relativePath.replace(/[\r\n\t]/g, " ");
    child.stdin.write(`MARK\t${id}\t${status}\t${safeRelativePath}\n`, (error) => {
      if (!error) return;
      pendingMarks.delete(id);
      reject(error);
    });
  });
}

function rejectPendingMarks(pendingMarks: Map<string, PendingMark>, error: Error) {
  for (const pending of pendingMarks.values()) pending.reject(error);
  pendingMarks.clear();
}

function parseEvent(line: string): CloudProviderEvent | null {
  try {
    return JSON.parse(line) as CloudProviderEvent;
  } catch {
    return null;
  }
}

