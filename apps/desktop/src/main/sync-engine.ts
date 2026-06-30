import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { createReadStream, existsSync, statfsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import chokidar, { type FSWatcher } from "chokidar";
import { DatabaseSync } from "node:sqlite";

import { guessMime } from "./mime.js";
import { initializeSyncDatabase } from "./sync-schema.js";
import type {
  DeleteResourceResponse,
  DesktopSessionRefreshResponse,
  FileStatus,
  FolderCreateResponse,
  FolderListResponse,
  LocalRecord,
  QueueReason,
  UploadCompleteResponse,
  UploadReservationResponse,
} from "./sync-types.js";

import type { SettingsStore } from "./settings-store.js";
import type {
  DesktopSettings,
  DesktopSnapshot,
  SyncActivity,
  SyncFileEntry,
  SyncSummary,
} from "./types.js";

type LocalStatusHandler = (
  relativePath: string,
  status: FileStatus,
  previousStatus: FileStatus | null,
) => void;

const SESSION_REFRESH_LEEWAY_MS = 2 * 60 * 1000;
const SESSION_REFRESH_TIMEOUT_MS = 15_000;
const API_REQUEST_TIMEOUT_MS = 30_000;
const OBJECT_UPLOAD_MIN_TIMEOUT_MS = 2 * 60 * 1000;
const OBJECT_UPLOAD_MAX_TIMEOUT_MS = 30 * 60 * 1000;
const OBJECT_UPLOAD_BYTES_PER_SECOND = 128 * 1024;
const LOCAL_CHANGE_RETRY_DELAY_MS = 1_500;
const TRANSIENT_RETRY_BASE_MS = 1_000;
const TRANSIENT_RETRY_MAX_MS = 60_000;
const MAX_TRANSIENT_RETRY_ATTEMPTS = 6;

type FileSnapshot = {
  size: number;
  mtimeMs: number;
};

type StreamingRequestInit = RequestInit & { duplex?: "half" };

function diskUsage(folder: string) {
  try {
    const stats = statfsSync(folder);
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    return {
      totalBytes,
      freeBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes),
    };
  } catch {
    return { totalBytes: 0, freeBytes: 0, usedBytes: 0 };
  }
}
class AuthExpiredError extends Error {
  constructor(message = "Desktop sign-in expired. Sign in again.") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

class TransientSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientSyncError";
  }
}

class LocalFileChangedError extends Error {
  constructor() {
    super("File changed while it was syncing.");
    this.name = "LocalFileChangedError";
  }
}

export class SyncEngine extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private readonly queue = new Map<string, QueueReason>();
  private readonly remoteFolderIds = new Map<string, string>();
  private readonly deleteTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly retryTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly retryAttempts = new Map<string, number>();
  private remoteFoldersLoaded = false;
  private processing = false;
  private started = false;
  private lastMessage = "GyenBox sync is starting.";

  constructor(
    private readonly db: DatabaseSync,
    private readonly settingsStore: SettingsStore,
    private readonly onLocalStatus?: LocalStatusHandler,
  ) {
    super();
  }

  async start() {
    if (this.started) return;
    this.started = true;
    this.initializeDatabase();
    await this.ensureSyncFolder();
    await this.startWatcher();
    const missingDeletes = this.markMissingLocalItemsDeleted();
    const pendingDeletes = this.queuePendingRemoteDeletes();
    if (missingDeletes > 0) {
      this.addActivity(
        "deleted",
        "",
        `Found ${missingDeletes} missing local item${missingDeletes === 1 ? "" : "s"}.`,
      );
    }
    if (pendingDeletes > 0) {
      this.addActivity(
        "queued",
        "",
        `Queued ${pendingDeletes} pending cloud delete${pendingDeletes === 1 ? "" : "s"}.`,
      );
      this.processQueueSoon();
    }
    this.lastMessage = `Watching ${this.displayFolder()} folder.`;
    this.emitSnapshot();
  }

  async stop() {
    await this.watcher?.close();
    this.watcher = null;
    for (const timer of this.deleteTimers.values()) clearTimeout(timer);
    for (const timer of this.retryTimers.values()) clearTimeout(timer);
    this.deleteTimers.clear();
    this.retryTimers.clear();
    this.retryAttempts.clear();
    this.queue.clear();
    this.started = false;
  }

  async updateSettings(input: Partial<DesktopSettings>) {
    const previous = this.settingsStore.get();
    const next = await this.settingsStore.update(input);
    const authChanged =
      previous.accessToken !== next.accessToken ||
      previous.refreshToken !== next.refreshToken;
    if (previous.apiBaseUrl !== next.apiBaseUrl || authChanged) {
      this.resetRemoteFolderCache();
    }
    if (previous.syncFolder !== next.syncFolder) {
      await this.stop();
      this.started = false;
      this.resetRemoteFolderCache();
      await this.start();
    }
    if (authChanged && next.accessToken.trim()) {
      const count = this.queueFailedItemsForRetry();
      if (count > 0) {
        this.addActivity(
          "queued",
          "",
          `Retrying ${count} item${count === 1 ? "" : "s"} after sign-in.`,
        );
      }
    }
    this.emitSnapshot();
    this.processQueueSoon();
    return this.snapshot();
  }

  async setPaused(paused: boolean) {
    await this.settingsStore.update({ paused });
    this.addActivity("info", "", paused ? "Sync paused." : "Sync resumed.");
    this.emitSnapshot();
    if (!paused) this.processQueueSoon();
    return this.snapshot();
  }

  async rescan() {
    await this.watcher?.close();
    this.watcher = null;
    await this.startWatcher();
    const missingDeletes = this.markMissingLocalItemsDeleted();
    const pendingDeletes = this.queuePendingRemoteDeletes();
    this.addActivity("info", "", `Rescanning ${this.displayFolder()}.`);
    if (missingDeletes > 0) {
      this.addActivity(
        "deleted",
        "",
        `Found ${missingDeletes} missing local item${missingDeletes === 1 ? "" : "s"}.`,
      );
    }
    if (pendingDeletes > 0) this.processQueueSoon();
    this.emitSnapshot();
    return this.snapshot();
  }

  async retryFailed() {
    const count = this.queueFailedItemsForRetry();
    this.addActivity(
      "queued",
      "",
      `Queued ${count} failed item${count === 1 ? "" : "s"} for retry.`,
    );
    this.emitSnapshot();
    this.processQueueSoon();
    return this.snapshot();
  }

  private queueFailedItemsForRetry() {
    const rows = this.db
      .prepare(
        "SELECT relative_path, remote_id FROM local_files WHERE status = 'failed'",
      )
      .all();
    for (const row of rows) {
      const relativePath = normalizeRelativePath(
        String(row.relative_path ?? ""),
      );
      if (!isSafeRelativePath(relativePath)) continue;
      const absolutePath = this.absolutePath(relativePath);
      const remoteId = row.remote_id ? String(row.remote_id) : null;
      const reason: QueueReason =
        remoteId && !existsSync(absolutePath) ? "deleted" : "retry";
      this.clearRetryState(relativePath);
      this.queue.set(relativePath, reason);
      this.upsertLocal({
        relativePath,
        status: reason === "deleted" ? "deleted" : "queued",
      });
    }
    return rows.length;
  }

  snapshot(): DesktopSnapshot {
    return {
      settings: this.settingsStore.get(),
      summary: this.summary(),
      files: this.localFiles(),
      activity: this.recentActivity(),
    };
  }

  private initializeDatabase() {
    initializeSyncDatabase(this.db);
  }

  private async ensureSyncFolder() {
    await mkdir(this.settingsStore.get().syncFolder, { recursive: true });
  }

  private async startWatcher() {
    const folder = this.settingsStore.get().syncFolder;
    await mkdir(folder, { recursive: true });

    this.watcher = chokidar.watch(folder, {
      awaitWriteFinish: { stabilityThreshold: 1200, pollInterval: 150 },
      ignored: [
        /node_modules/,
        /(^|[\\/])\.gyenbox([\\/]|$)/,
        /\.tmp$/,
        /\\.crdownload$/,
        /(^|[\\\\/])desktop\\.ini$/i,
        /(^|[\\/])~\$/,
      ],
      ignoreInitial: false,
      persistent: true,
    });

    this.watcher.on("add", (path) => void this.enqueue(path, "created"));
    this.watcher.on("addDir", (path) => void this.enqueue(path, "created"));
    this.watcher.on("change", (path) => void this.enqueue(path, "changed"));
    this.watcher.on("unlink", (path) => this.markDeleted(path));
    this.watcher.on("unlinkDir", (path) => this.markDeleted(path, true));
    this.watcher.on("error", (error) => {
      this.lastMessage = error instanceof Error ? error.message : String(error);
      this.addActivity("failed", "", this.lastMessage);
      this.emitSnapshot();
    });
  }

  private async enqueue(filePath: string, reason: QueueReason) {
    const relativePath = this.relativePath(filePath);
    if (!isSafeRelativePath(relativePath)) return;
    this.cancelPendingDelete(relativePath);
    this.cancelPendingRetry(relativePath);

    if (
      reason === "created" &&
      (await this.keepKnownUploadedIfUnchanged(filePath, relativePath))
    ) {
      return;
    }

    this.queue.set(relativePath, reason);
    this.upsertLocal({ relativePath, status: "queued" });
    this.addActivity(
      "queued",
      relativePath,
      reason === "changed" ? "Change detected." : "Item queued.",
    );
    this.emitSnapshot();
    this.processQueueSoon();
  }

  private async keepKnownUploadedIfUnchanged(
    filePath: string,
    relativePath: string,
  ) {
    const existing = this.getLocal(relativePath);
    if (existing?.status !== "uploaded" || !existing.remoteId) return false;

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        this.upsertLocal({
          relativePath,
          size: 0,
          mtimeMs: fileStat.mtimeMs,
          hash: null,
          status: "uploaded",
          lastError: null,
        });
        return true;
      }
      if (!fileStat.isFile()) return true;

      const sameSize = existing.size === fileStat.size;
      const sameMtime = Math.abs(existing.mtimeMs - fileStat.mtimeMs) < 2;
      if (!sameSize || !sameMtime) return false;

      this.upsertLocal({
        relativePath,
        size: fileStat.size,
        mtimeMs: fileStat.mtimeMs,
        status: "uploaded",
        lastError: null,
      });
      return true;
    } catch {
      return false;
    }
  }

  private markDeleted(filePath: string, includeKnownChildren = false) {
    const relativePath = this.relativePath(filePath);
    if (!isSafeRelativePath(relativePath)) return;
    this.markLocalDeletedTree(relativePath, {
      includeKnownChildren,
      preserveRootRemoteId: true,
    });
    this.addActivity(
      "deleted",
      relativePath,
      "Removed locally. Waiting briefly before cloud delete.",
    );
    this.scheduleRemoteDelete(relativePath);
    this.emitSnapshot();
  }

  private scheduleRemoteDelete(relativePath: string) {
    this.cancelPendingDelete(relativePath);
    const timer = setTimeout(() => {
      this.deleteTimers.delete(relativePath);
      const current = this.getLocal(relativePath);
      if (current?.status !== "deleted" || !current.remoteId) return;
      this.queue.set(relativePath, "deleted");
      this.emitSnapshot();
      this.processQueueSoon();
    }, 2000);
    this.deleteTimers.set(relativePath, timer);
  }

  private cancelPendingDelete(relativePath: string) {
    const timer = this.deleteTimers.get(relativePath);
    if (!timer) return;
    clearTimeout(timer);
    this.deleteTimers.delete(relativePath);
  }

  private scheduleLocalChangeRetry(relativePath: string) {
    this.cancelPendingRetry(relativePath);
    this.upsertLocal({ relativePath, status: "queued", lastError: null });
    this.addActivity(
      "queued",
      relativePath,
      "File changed while syncing. Queued the latest version.",
    );
    const timer = setTimeout(() => {
      this.retryTimers.delete(relativePath);
      this.queue.set(relativePath, "changed");
      this.emitSnapshot();
      this.processQueueSoon();
    }, LOCAL_CHANGE_RETRY_DELAY_MS);
    this.retryTimers.set(relativePath, timer);
    this.emitSnapshot();
  }

  private scheduleTransientRetry(
    relativePath: string,
    reason: QueueReason,
    message: string,
    pendingStatus: FileStatus = "queued",
  ) {
    this.cancelPendingRetry(relativePath);
    const attempt = (this.retryAttempts.get(relativePath) ?? 0) + 1;

    if (attempt > MAX_TRANSIENT_RETRY_ATTEMPTS) {
      this.retryAttempts.delete(relativePath);
      this.upsertLocal({ relativePath, status: "failed", lastError: message });
      this.addActivity("failed", relativePath, message);
      this.lastMessage = message;
      this.emitSnapshot();
      return;
    }

    this.retryAttempts.set(relativePath, attempt);
    this.upsertLocal({ relativePath, status: pendingStatus, lastError: null });
    const delayMs = retryDelayMs(attempt);
    this.addActivity(
      "queued",
      relativePath,
      `Temporary sync problem. Retrying in ${formatRetryDelay(delayMs)}. ${message}`,
    );

    const timer = setTimeout(() => {
      this.retryTimers.delete(relativePath);
      this.queue.set(relativePath, reason);
      this.emitSnapshot();
      this.processQueueSoon();
    }, delayMs);
    this.retryTimers.set(relativePath, timer);
    this.emitSnapshot();
  }

  private cancelPendingRetry(relativePath: string) {
    const timer = this.retryTimers.get(relativePath);
    if (!timer) return;
    clearTimeout(timer);
    this.retryTimers.delete(relativePath);
  }

  private clearRetryState(relativePath: string) {
    this.cancelPendingRetry(relativePath);
    this.retryAttempts.delete(relativePath);
  }

  private async assertFileUnchanged(filePath: string, snapshot: FileSnapshot) {
    const current = await stat(filePath);
    if (
      !current.isFile() ||
      !sameFileSnapshot(snapshot, snapshotFromStat(current))
    ) {
      throw new LocalFileChangedError();
    }
  }

  private errorForResponse(response: Response, message: string) {
    return isTransientHttpStatus(response.status)
      ? new TransientSyncError(message)
      : new Error(message);
  }

  private clearDeletedRemoteReference(relativePath: string, remoteId: string) {
    this.db
      .prepare(
        `
      UPDATE local_files
      SET remote_id = NULL,
          last_error = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE relative_path = ?
        AND remote_id = ?
        AND status = 'deleted'
    `,
      )
      .run(relativePath, remoteId);
  }

  private clearDeletedRemoteReferences(remoteId: string, activePath: string) {
    this.db
      .prepare(
        `
      UPDATE local_files
      SET remote_id = NULL,
          last_error = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE remote_id = ?
        AND relative_path <> ?
        AND status = 'deleted'
    `,
      )
      .run(remoteId, activePath);
  }

  private markLocalDeletedTree(
    relativePath: string,
    options: { includeKnownChildren: boolean; preserveRootRemoteId: boolean },
  ) {
    const paths = options.includeKnownChildren
      ? this.knownSubtreePaths(relativePath)
      : [];
    if (!paths.includes(relativePath)) paths.unshift(relativePath);

    const rootHasRemoteId = Boolean(this.getLocal(relativePath)?.remoteId);

    for (const path of paths) {
      this.clearRetryState(path);
      this.cancelPendingDelete(path);
      this.queue.delete(path);
      const isRoot = path === relativePath;
      const shouldPreserveRemoteId =
        (isRoot && options.preserveRootRemoteId) ||
        (!isRoot && !rootHasRemoteId);
      const next: Partial<LocalRecord> & { relativePath: string } = {
        relativePath: path,
        status: "deleted",
        lastError: null,
      };
      if (!shouldPreserveRemoteId) next.remoteId = null;
      this.upsertLocal(next);
    }
  }

  private knownSubtreePaths(relativePath: string) {
    return this.db
      .prepare(
        `
      SELECT relative_path
      FROM local_files
      WHERE relative_path = ?
         OR relative_path LIKE ?
      ORDER BY length(relative_path), relative_path
    `,
      )
      .all(relativePath, `${relativePath}/%`)
      .map((row) => normalizeRelativePath(String(row.relative_path ?? "")))
      .filter(isSafeRelativePath);
  }

  private markMissingLocalItemsDeleted() {
    const rows = this.db
      .prepare(
        `
      SELECT relative_path
      FROM local_files
      WHERE status NOT IN ('deleted', 'skipped')
        AND relative_path <> ''
    `,
      )
      .all()
      .map((row) => normalizeRelativePath(String(row.relative_path ?? "")))
      .filter((relativePath) => {
        if (!isSafeRelativePath(relativePath)) return false;
        return !existsSync(this.absolutePath(relativePath));
      })
      .sort((left, right) => {
        const depthDelta =
          pathSegments(left).length - pathSegments(right).length;
        return depthDelta || left.localeCompare(right);
      });

    const roots: string[] = [];
    for (const relativePath of rows) {
      if (
        roots.some((root) =>
          relativePath === root || relativePath.startsWith(`${root}/`),
        )
      ) {
        continue;
      }
      roots.push(relativePath);
    }

    for (const relativePath of roots) {
      this.markLocalDeletedTree(relativePath, {
        includeKnownChildren: true,
        preserveRootRemoteId: true,
      });
    }

    return roots.length;
  }

  private queuePendingRemoteDeletes() {
    const rows = this.db
      .prepare(
        "SELECT relative_path FROM local_files WHERE status = 'deleted' AND remote_id IS NOT NULL",
      )
      .all();
    for (const row of rows) {
      const relativePath = normalizeRelativePath(
        String(row.relative_path ?? ""),
      );
      if (!isSafeRelativePath(relativePath)) continue;
      this.queue.set(relativePath, "deleted");
    }
    return rows.length;
  }

  private processQueueSoon() {
    void this.processQueue();
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.size > 0) {
        let settings = this.settingsStore.get();
        if (settings.paused) break;
        if (!this.hasAuthSettings(settings)) {
          this.lastMessage = "Sign in to start uploading.";
          break;
        }

        settings = await this.ensureFreshSession(settings);
        if (!settings.accessToken.trim()) {
          this.lastMessage = "Sign in to start uploading.";
          break;
        }

        const next = this.queue.entries().next().value as
          | [string, QueueReason]
          | undefined;
        if (!next) break;

        const [relativePath, reason] = next;
        this.queue.delete(relativePath);
        if (reason === "deleted") {
          await this.deleteRemotePath(relativePath, settings);
        } else {
          await this.uploadPath(relativePath, settings);
        }
        await delay(50);
      }
    } finally {
      this.processing = false;
      this.emitSnapshot();
    }
  }

  private async ensureFreshSession(settings: DesktopSettings) {
    if (!settings.refreshToken.trim()) return settings;
    if (settings.accessToken.trim() && !this.shouldRefreshToken(settings))
      return settings;
    return this.refreshDesktopSession(settings);
  }

  private shouldRefreshToken(settings: DesktopSettings) {
    if (!settings.tokenExpiresAt) return true;
    const expiresAt = new Date(settings.tokenExpiresAt).getTime();
    if (Number.isNaN(expiresAt)) return true;
    return Date.now() + SESSION_REFRESH_LEEWAY_MS >= expiresAt;
  }

  private async refreshDesktopSession(settings: DesktopSettings) {
    try {
      this.lastMessage = "Refreshing desktop sign-in.";
      const response = await fetchWithTimeout(
        `${settings.apiBaseUrl}/api/desktop/session/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: settings.refreshToken }),
        },
        SESSION_REFRESH_TIMEOUT_MS,
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DesktopSessionRefreshResponse | null;

      if (response.status === 401) {
        return this.expireSession(
          payload?.error?.message ?? "Desktop sign-in expired. Sign in again.",
        );
      }

      if (!response.ok || !payload?.ok || !payload.data?.accessToken) {
        const message =
          payload?.error?.message ??
          `Session refresh failed with HTTP ${response.status}`;
        throw this.errorForResponse(response, message);
      }

      const next = await this.settingsStore.update({
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken ?? settings.refreshToken,
        tokenExpiresAt: payload.data.expiresAt ?? null,
        accountEmail: payload.data.user?.email ?? settings.accountEmail,
      });
      this.addActivity("info", "", "Desktop sign-in refreshed.");
      this.emitSnapshot();
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof TransientSyncError) {
        this.lastMessage = `Session refresh will retry. ${message}`;
        this.addActivity("queued", "", "Session refresh will retry.");
        this.emitSnapshot();
        return settings;
      }

      this.lastMessage = `Session refresh failed. Sign in again. ${message}`;
      this.addActivity("failed", "", "Session refresh failed. Sign in again.");
      this.emitSnapshot();
      return settings;
    }
  }

  private async deleteRemotePath(
    relativePath: string,
    settings: DesktopSettings,
  ) {
    if (!isSafeRelativePath(relativePath)) return;

    const local = this.getLocal(relativePath);
    if (!local?.remoteId) {
      this.markLocalSubtreeRemoteDeleted(relativePath);
      this.clearRetryState(relativePath);
      this.addActivity("deleted", relativePath, "Removed locally.");
      return;
    }

    if (this.remoteIdHasActiveLocalReference(local.remoteId, relativePath)) {
      this.clearDeletedRemoteReference(relativePath, local.remoteId);
      this.clearRetryState(relativePath);
      this.addActivity(
        "info",
        relativePath,
        "Cloud delete skipped; item moved locally.",
      );
      return;
    }

    try {
      this.upsertLocal({ relativePath, status: "syncing", lastError: null });
      this.addActivity("syncing", relativePath, "Deleting cloud item.");
      this.emitSnapshot();

      const response = await fetchWithTimeout(
        settings.apiBaseUrl +
          "/api/files/" +
          encodeURIComponent(local.remoteId),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${settings.accessToken.trim()}` },
        },
        API_REQUEST_TIMEOUT_MS,
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DeleteResourceResponse | null;

      this.throwIfAuthExpired(response, payload?.error?.message);

      if (!response.ok || !payload?.ok) {
        throw this.errorForResponse(
          response,
          payload?.error?.message ??
            `Cloud delete failed with HTTP ${response.status}`,
        );
      }

      this.markLocalSubtreeRemoteDeleted(relativePath);
      this.clearRetryState(relativePath);
      this.resetRemoteFolderCache();
      this.addActivity("deleted", relativePath, "Deleted from cloud.");
      this.lastMessage = "Your files are up to date.";
    } catch (error) {
      if (error instanceof AuthExpiredError) {
        await this.expireSession(error.message);
        this.queue.set(relativePath, "deleted");
        this.upsertLocal({ relativePath, status: "deleted", lastError: null });
        this.lastMessage = error.message;
        return;
      }

      if (error instanceof TransientSyncError) {
        this.scheduleTransientRetry(
          relativePath,
          "deleted",
          error.message,
          "deleted",
        );
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.clearRetryState(relativePath);
      this.upsertLocal({ relativePath, status: "failed", lastError: message });
      this.addActivity("failed", relativePath, message);
      this.lastMessage = message;
    }
  }

  private remoteIdHasActiveLocalReference(
    remoteId: string,
    relativePath: string,
  ) {
    const row = this.db
      .prepare(
        `
      SELECT 1
      FROM local_files
      WHERE remote_id = ?
        AND relative_path <> ?
        AND status NOT IN ('deleted', 'skipped')
      LIMIT 1
    `,
      )
      .get(remoteId, relativePath);
    return Boolean(row);
  }

  private markLocalSubtreeRemoteDeleted(relativePath: string) {
    const rows = this.db
      .prepare("SELECT relative_path, status FROM local_files")
      .all()
      .filter((row) => {
        const path = String(row.relative_path ?? "");
        return path === relativePath || path.startsWith(relativePath + "/");
      });

    const update = this.db.prepare(
      `
      UPDATE local_files
      SET status = 'deleted',
          remote_id = NULL,
          last_error = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE relative_path = ?
    `,
    );

    for (const row of rows) {
      const path = String(row.relative_path ?? "");
      const previousStatus = String(row.status ?? "deleted") as FileStatus;
      update.run(path);
      this.onLocalStatus?.(path, "deleted", previousStatus);
    }
  }
  private async uploadPath(relativePath: string, settings: DesktopSettings) {
    if (!isSafeRelativePath(relativePath)) return;

    const filePath = this.absolutePath(relativePath);

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        await this.syncDirectory(relativePath, fileStat.mtimeMs, settings);
        this.clearRetryState(relativePath);
        return;
      }
      if (!fileStat.isFile()) return;

      const fileSnapshot = snapshotFromStat(fileStat);
      const hash = await hashFile(filePath);
      await this.assertFileUnchanged(filePath, fileSnapshot);

      const existing = this.getLocal(relativePath);
      if (existing?.hash === hash && existing.remoteId) {
        this.upsertLocal({
          relativePath,
          size: fileSnapshot.size,
          mtimeMs: fileSnapshot.mtimeMs,
          hash,
          status: "uploaded",
          lastError: null,
        });
        this.clearRetryState(relativePath);
        this.lastMessage = "Your files are up to date.";
        return;
      }

      this.upsertLocal({
        relativePath,
        size: fileSnapshot.size,
        mtimeMs: fileSnapshot.mtimeMs,
        hash,
        status: "syncing",
        lastError: null,
      });
      this.addActivity("syncing", relativePath, "Reserving upload.");
      this.emitSnapshot();

      const mimeType = guessMime(filePath);
      const remoteFileId =
        existing?.remoteId ?? this.findRemoteIdForMovedFile(hash, relativePath);
      if (remoteFileId && remoteFileId !== existing?.remoteId) {
        this.upsertLocal({
          relativePath,
          remoteId: remoteFileId,
          status: "syncing",
          lastError: null,
        });
        this.clearDeletedRemoteReferences(remoteFileId, relativePath);
      }
      const token = settings.accessToken.trim();
      const parentFolderId = await this.ensureRemoteParentFolder(
        relativePath,
        settings,
      );
      const fileName = basename(relativePath);
      const reservationResponse = await fetchWithTimeout(
        `${settings.apiBaseUrl}/api/upload/presign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: remoteFileId ?? undefined,
            name: fileName,
            size: fileSnapshot.size,
            mimeType,
            checksum: hash,
            folderId: parentFolderId ?? undefined,
            clientSource: "desktop-sync",
          }),
        },
        API_REQUEST_TIMEOUT_MS,
      );
      const reservationPayload = (await reservationResponse
        .json()
        .catch(() => null)) as UploadReservationResponse | null;

      this.throwIfAuthExpired(
        reservationResponse,
        reservationPayload?.error?.message,
      );

      if (!reservationResponse.ok || !reservationPayload?.ok) {
        throw this.errorForResponse(
          reservationResponse,
          reservationPayload?.error?.message ??
            `Upload reservation failed with HTTP ${reservationResponse.status}`,
        );
      }

      const reservation = reservationPayload.data;
      if (!reservation?.uploadUrl || !reservation.storageKey) {
        throw new Error(
          "Upload reservation did not include a signed storage URL.",
        );
      }

      await this.assertFileUnchanged(filePath, fileSnapshot);
      this.addActivity("syncing", relativePath, "Uploading to object storage.");
      this.emitSnapshot();

      const uploadInit: StreamingRequestInit = {
        method: reservation.method ?? "PUT",
        headers: reservation.headers ?? { "Content-Type": mimeType },
        body: createReadStream(filePath) as unknown as BodyInit,
        duplex: "half",
      };
      const objectUploadResponse = await fetchWithTimeout(
        reservation.uploadUrl,
        uploadInit,
        objectUploadTimeoutMs(fileSnapshot.size),
      );

      if (!objectUploadResponse.ok) {
        const details = await objectUploadResponse.text().catch(() => "");
        const message = `Object upload failed with HTTP ${objectUploadResponse.status}${details ? `: ${details.slice(0, 180)}` : ""}`;
        throw this.errorForResponse(objectUploadResponse, message);
      }

      await this.assertFileUnchanged(filePath, fileSnapshot);
      this.addActivity("syncing", relativePath, "Completing upload.");
      this.emitSnapshot();

      const completeResponse = await fetchWithTimeout(
        `${settings.apiBaseUrl}/api/upload/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: remoteFileId ?? reservation.fileId ?? undefined,
            storageKey: reservation.storageKey,
            name: fileName,
            size: fileSnapshot.size,
            mimeType,
            checksum: hash,
            folderId: parentFolderId ?? undefined,
            clientSource: "desktop-sync",
          }),
        },
        API_REQUEST_TIMEOUT_MS,
      );
      const completePayload = (await completeResponse
        .json()
        .catch(() => null)) as UploadCompleteResponse | null;

      this.throwIfAuthExpired(
        completeResponse,
        completePayload?.error?.message,
      );

      if (!completeResponse.ok || !completePayload?.ok) {
        throw this.errorForResponse(
          completeResponse,
          completePayload?.error?.message ??
            `Upload completion failed with HTTP ${completeResponse.status}`,
        );
      }

      await this.assertFileUnchanged(filePath, fileSnapshot);
      const completedFileId =
        completePayload.data?.file?.id ??
        remoteFileId ??
        reservation.fileId ??
        null;
      this.upsertLocal({
        relativePath,
        size: fileSnapshot.size,
        mtimeMs: fileSnapshot.mtimeMs,
        hash,
        status: "uploaded",
        remoteId: completedFileId,
        lastError: null,
      });
      if (completedFileId) {
        this.clearDeletedRemoteReferences(completedFileId, relativePath);
      }
      this.clearRetryState(relativePath);
      this.addActivity("uploaded", relativePath, "Uploaded.");
      this.lastMessage = "Your files are up to date.";
    } catch (error) {
      if (isNotFoundError(error)) {
        this.markDeleted(filePath);
        return;
      }

      if (error instanceof LocalFileChangedError) {
        this.scheduleLocalChangeRetry(relativePath);
        return;
      }

      if (error instanceof AuthExpiredError) {
        await this.expireSession(error.message);
        this.queue.set(relativePath, "retry");
        this.upsertLocal({ relativePath, status: "queued", lastError: null });
        this.lastMessage = error.message;
        return;
      }

      if (error instanceof TransientSyncError) {
        this.scheduleTransientRetry(relativePath, "retry", error.message);
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.clearRetryState(relativePath);
      this.upsertLocal({ relativePath, status: "failed", lastError: message });
      this.addActivity("failed", relativePath, message);
      this.lastMessage = message;
    }
  }

  private findRemoteIdForMovedFile(hash: string, relativePath: string) {
    const row = this.db
      .prepare(
        `
      SELECT deleted.remote_id AS remoteId
      FROM local_files deleted
      WHERE deleted.hash = ?
        AND deleted.relative_path <> ?
        AND deleted.status = 'deleted'
        AND deleted.remote_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM local_files active
          WHERE active.remote_id = deleted.remote_id
            AND active.relative_path <> deleted.relative_path
            AND active.status NOT IN ('deleted', 'skipped')
        )
      ORDER BY deleted.updated_at DESC
      LIMIT 1
    `,
      )
      .get(hash, relativePath);
    return row?.remoteId ? String(row.remoteId) : null;
  }

  private async syncDirectory(
    relativePath: string,
    mtimeMs: number,
    settings: DesktopSettings,
  ) {
    this.upsertLocal({
      relativePath,
      size: 0,
      mtimeMs,
      hash: null,
      status: "syncing",
      lastError: null,
    });
    this.addActivity("syncing", relativePath, "Creating cloud folder.");
    this.emitSnapshot();

    const folderId = await this.ensureRemoteFolderPath(relativePath, settings);
    this.upsertLocal({
      relativePath,
      size: 0,
      mtimeMs,
      hash: null,
      status: "uploaded",
      remoteId: folderId,
      lastError: null,
    });
    this.addActivity("uploaded", relativePath, "Folder synced.");
    this.lastMessage = "Your files are up to date.";
  }

  private async ensureRemoteParentFolder(
    relativePath: string,
    settings: DesktopSettings,
  ) {
    const parentPath = parentRelativePath(relativePath);
    if (!parentPath) return null;
    return this.ensureRemoteFolderPath(parentPath, settings);
  }

  private async ensureRemoteFolderPath(
    relativePath: string,
    settings: DesktopSettings,
  ) {
    await this.loadRemoteFolders(settings);

    let parentId: string | null = null;
    for (const segment of pathSegments(relativePath)) {
      const key = folderCacheKey(parentId, segment);
      let folderId = this.remoteFolderIds.get(key) ?? null;
      if (!folderId) {
        folderId = await this.createRemoteFolder(segment, parentId, settings);
      }
      parentId = folderId;
    }

    if (!parentId)
      throw new Error("Folder path did not contain a folder name.");
    return parentId;
  }

  private async loadRemoteFolders(settings: DesktopSettings) {
    if (this.remoteFoldersLoaded) return;

    const response = await fetchWithTimeout(
      `${settings.apiBaseUrl}/api/folders`,
      {
        headers: { Authorization: `Bearer ${settings.accessToken.trim()}` },
      },
      API_REQUEST_TIMEOUT_MS,
    );
    const payload = (await response
      .json()
      .catch(() => null)) as FolderListResponse | null;

    this.throwIfAuthExpired(response, payload?.error?.message);

    if (!response.ok || !payload?.ok) {
      this.resetRemoteFolderCache();
      throw this.errorForResponse(
        response,
        payload?.error?.message ??
          `Folder list failed with HTTP ${response.status}`,
      );
    }

    this.remoteFolderIds.clear();
    for (const folder of payload.data?.folders ?? []) {
      if (!folder.id || !folder.name) continue;
      this.remoteFolderIds.set(
        folderCacheKey(folder.parentFolderId ?? null, folder.name),
        folder.id,
      );
    }
    this.remoteFoldersLoaded = true;
  }

  private async createRemoteFolder(
    name: string,
    parentId: string | null,
    settings: DesktopSettings,
  ) {
    const response = await fetchWithTimeout(
      `${settings.apiBaseUrl}/api/folders`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.accessToken.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          parentId: parentId ?? undefined,
          clientSource: "desktop-sync",
        }),
      },
      API_REQUEST_TIMEOUT_MS,
    );
    const payload = (await response
      .json()
      .catch(() => null)) as FolderCreateResponse | null;

    this.throwIfAuthExpired(response, payload?.error?.message);

    if (!response.ok || !payload?.ok || !payload.data?.file?.id) {
      this.resetRemoteFolderCache();
      throw this.errorForResponse(
        response,
        payload?.error?.message ??
          `Folder create failed with HTTP ${response.status}`,
      );
    }

    const folderId = payload.data.file.id;
    this.remoteFolderIds.set(folderCacheKey(parentId, name), folderId);
    this.remoteFoldersLoaded = true;
    return folderId;
  }

  private throwIfAuthExpired(response: Response, message?: string) {
    if (response.status === 401) {
      throw new AuthExpiredError(
        message ?? "Desktop sign-in expired. Sign in again.",
      );
    }
  }

  private async expireSession(message: string) {
    this.resetRemoteFolderCache();
    const next = await this.settingsStore.update({
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: null,
      accountEmail: null,
    });
    this.lastMessage = message;
    this.addActivity("failed", "", message);
    this.emitSnapshot();
    return next;
  }

  private resetRemoteFolderCache() {
    this.remoteFolderIds.clear();
    this.remoteFoldersLoaded = false;
  }

  private summary(): SyncSummary {
    const settings = this.settingsStore.get();
    const hasAuth = this.hasAuthSettings(settings);
    const counts =
      this.db
        .prepare(
          `
      SELECT
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN status = 'syncing' THEN 1 ELSE 0 END) AS syncing,
        SUM(CASE WHEN status = 'uploaded' THEN 1 ELSE 0 END) AS uploaded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
        COALESCE(SUM(size), 0) AS totalBytes
      FROM local_files
    `,
        )
        .get() ?? {};

    const queued = Number(counts.queued ?? 0) + this.memoryOnlyQueuedCount();
    const syncing = Number(counts.syncing ?? 0);
    const failed = Number(counts.failed ?? 0);
    const disk = diskUsage(settings.syncFolder);
    const state = settings.paused
      ? "paused"
      : !hasAuth
        ? "needs-auth"
        : syncing > 0 || queued > 0
          ? "syncing"
          : failed > 0
            ? "error"
            : "idle";

    return {
      state,
      syncFolder: settings.syncFolder,
      apiBaseUrl: settings.apiBaseUrl,
      accessTokenConfigured: hasAuth,
      accountEmail: settings.accountEmail,
      paused: settings.paused,
      queued,
      syncing,
      uploaded: Number(counts.uploaded ?? 0),
      failed,
      skipped: Number(counts.skipped ?? 0),
      totalBytes: Number(counts.totalBytes ?? 0),
      diskTotalBytes: disk.totalBytes,
      diskUsedBytes: disk.usedBytes,
      diskFreeBytes: disk.freeBytes,
      lastMessage:
        state === "idle" ? "Your files are up to date." : this.lastMessage,
      updatedAt: new Date().toISOString(),
    };
  }

  private memoryOnlyQueuedCount() {
    let count = 0;
    for (const relativePath of this.queue.keys()) {
      const status = this.getLocal(relativePath)?.status ?? null;
      if (status !== "queued" && status !== "syncing") count += 1;
    }
    return count;
  }

  private hasAuthSettings(settings: DesktopSettings) {
    return Boolean(settings.accessToken.trim() || settings.refreshToken.trim());
  }

  private recentActivity(): SyncActivity[] {
    return this.db
      .prepare(
        `
      SELECT id, type, path, message, created_at AS createdAt
      FROM sync_activity
      WHERE NOT (type = 'info' AND (message LIKE 'Watching % folder.' OR message LIKE 'Rescanning %.'))
      ORDER BY id DESC
      LIMIT 30
    `,
      )
      .all()
      .map((row) => ({
        id: Number(row.id),
        type: String(row.type) as SyncActivity["type"],
        path: String(row.path ?? ""),
        message: String(row.message ?? ""),
        createdAt: String(row.createdAt ?? ""),
      }));
  }

  private localFiles(): SyncFileEntry[] {
    return this.db
      .prepare(
        `
      SELECT relative_path AS path, status, size, updated_at AS updatedAt
      FROM local_files
      WHERE status <> 'deleted' AND relative_path <> ''
      ORDER BY datetime(updated_at) DESC, relative_path ASC
      LIMIT 80
    `,
      )
      .all()
      .map((row) => {
        const path = String(row.path ?? "");
        return {
          path,
          name: basename(path) || path || "GyenBox",
          status: String(row.status ?? "queued") as SyncFileEntry["status"],
          size: Number(row.size ?? 0),
          updatedAt: String(row.updatedAt ?? ""),
        };
      });
  }
  private getLocal(relativePath: string): LocalRecord | null {
    const row = this.db
      .prepare("SELECT * FROM local_files WHERE relative_path = ?")
      .get(relativePath);
    if (!row) return null;
    return {
      relativePath: String(row.relative_path),
      size: Number(row.size ?? 0),
      mtimeMs: Number(row.mtime_ms ?? 0),
      hash: row.hash ? String(row.hash) : null,
      status: String(row.status) as FileStatus,
      remoteId: row.remote_id ? String(row.remote_id) : null,
      lastError: row.last_error ? String(row.last_error) : null,
    };
  }

  private upsertLocal(input: Partial<LocalRecord> & { relativePath: string }) {
    const current = this.getLocal(input.relativePath);
    const next = {
      size: input.size ?? current?.size ?? 0,
      mtimeMs: input.mtimeMs ?? current?.mtimeMs ?? 0,
      hash: hasOwn(input, "hash")
        ? (input.hash ?? null)
        : (current?.hash ?? null),
      status: input.status ?? current?.status ?? "queued",
      remoteId: hasOwn(input, "remoteId")
        ? (input.remoteId ?? null)
        : (current?.remoteId ?? null),
      lastError: hasOwn(input, "lastError") ? (input.lastError ?? null) : null,
    };

    this.db
      .prepare(
        `
      INSERT INTO local_files (relative_path, size, mtime_ms, hash, status, remote_id, last_error, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(relative_path) DO UPDATE SET
        size = excluded.size,
        mtime_ms = excluded.mtime_ms,
        hash = excluded.hash,
        status = excluded.status,
        remote_id = excluded.remote_id,
        last_error = excluded.last_error,
        updated_at = CURRENT_TIMESTAMP
    `,
      )
      .run(
        input.relativePath,
        next.size,
        next.mtimeMs,
        next.hash,
        next.status,
        next.remoteId,
        next.lastError,
      );

    this.onLocalStatus?.(
      input.relativePath,
      next.status,
      current?.status ?? null,
    );
  }

  private addActivity(
    type: SyncActivity["type"],
    path: string,
    message: string,
  ) {
    this.lastMessage = message;
    this.db
      .prepare(
        "INSERT INTO sync_activity (type, path, message) VALUES (?, ?, ?)",
      )
      .run(type, path, message);
  }

  private emitSnapshot() {
    this.emit("snapshot", this.snapshot());
  }

  private displayFolder() {
    const folder = this.settingsStore.get().syncFolder.replace(/\\/g, "/");
    const parts = folder.split("/").filter(Boolean);
    return parts.at(-1) ?? "GyenBox";
  }
  private relativePath(filePath: string) {
    return normalizeRelativePath(
      relative(this.settingsStore.get().syncFolder, filePath),
    );
  }

  private absolutePath(relativePath: string) {
    return join(this.settingsStore.get().syncFolder, relativePath);
  }
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function snapshotFromStat(fileStat: {
  size: number;
  mtimeMs: number;
}): FileSnapshot {
  return { size: fileStat.size, mtimeMs: fileStat.mtimeMs };
}

function sameFileSnapshot(left: FileSnapshot, right: FileSnapshot) {
  return left.size === right.size && Math.abs(left.mtimeMs - right.mtimeMs) < 2;
}

async function hashFile(filePath: string) {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = API_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw new TransientSyncError(
        `Request timed out after ${formatRetryDelay(timeoutMs)}.`,
      );
    }
    throw new TransientSyncError(
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    clearTimeout(timer);
  }
}

function objectUploadTimeoutMs(size: number) {
  const estimatedMs = (size / OBJECT_UPLOAD_BYTES_PER_SECOND) * 1000;
  return Math.min(
    OBJECT_UPLOAD_MAX_TIMEOUT_MS,
    Math.max(OBJECT_UPLOAD_MIN_TIMEOUT_MS, estimatedMs),
  );
}

function retryDelayMs(attempt: number) {
  const exponential = TRANSIENT_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.round(exponential * 0.2 * Math.random());
  return Math.min(TRANSIENT_RETRY_MAX_MS, exponential + jitter);
}

function formatRetryDelay(ms: number) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function isTransientHttpStatus(status: number) {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

function normalizeRelativePath(relativePath: string) {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function isSafeRelativePath(relativePath: string) {
  if (!relativePath || relativePath.includes("\0")) return false;
  if (isAbsolute(relativePath)) return false;
  return relativePath !== ".." && !relativePath.startsWith("../");
}

function parentRelativePath(relativePath: string) {
  const parentPath = dirname(relativePath).replace(/\\/g, "/");
  return parentPath === "." ? null : parentPath;
}

function pathSegments(relativePath: string) {
  return relativePath.split("/").filter(Boolean);
}

function folderCacheKey(parentId: string | null, name: string) {
  return `${parentId ?? "root"}\u0000${name}`;
}
