import { createHash } from "node:crypto"
import { EventEmitter } from "node:events"
import { mkdir, readFile, stat } from "node:fs/promises"
import { relative } from "node:path"
import { setTimeout as delay } from "node:timers/promises"

import chokidar, { type FSWatcher } from "chokidar"
import { DatabaseSync } from "node:sqlite"

import { guessMime } from "./mime.js"
import { initializeSyncDatabase } from "./sync-schema.js"
import type { FileStatus, LocalRecord, QueueReason, UploadResponse } from "./sync-types.js"

import type { SettingsStore } from "./settings-store.js"
import type { DesktopSettings, DesktopSnapshot, SyncActivity, SyncSummary } from "./types.js"

export class SyncEngine extends EventEmitter {
  private watcher: FSWatcher | null = null
  private readonly queue = new Map<string, QueueReason>()
  private processing = false
  private started = false
  private lastMessage = "GyenBox sync is starting."

  constructor(
    private readonly db: DatabaseSync,
    private readonly settingsStore: SettingsStore,
  ) {
    super()
  }

  async start() {
    if (this.started) return
    this.started = true
    this.initializeDatabase()
    await this.ensureSyncFolder()
    await this.startWatcher()
    this.addActivity("info", "", `Watching ${this.displayFolder()} folder.`)
    this.emitSnapshot()
  }

  async stop() {
    await this.watcher?.close()
    this.watcher = null
    this.started = false
  }

  async updateSettings(input: Partial<DesktopSettings>) {
    const previous = this.settingsStore.get()
    const next = await this.settingsStore.update(input)
    if (previous.syncFolder !== next.syncFolder) {
      await this.stop()
      this.started = false
      await this.start()
    }
    this.emitSnapshot()
    this.processQueueSoon()
    return this.snapshot()
  }

  async setPaused(paused: boolean) {
    await this.settingsStore.update({ paused })
    this.addActivity("info", "", paused ? "Sync paused." : "Sync resumed.")
    this.emitSnapshot()
    if (!paused) this.processQueueSoon()
    return this.snapshot()
  }

  async rescan() {
    await this.watcher?.close()
    this.watcher = null
    await this.startWatcher()
    this.addActivity("info", "", `Rescanning ${this.displayFolder()}.`)
    this.emitSnapshot()
    return this.snapshot()
  }

  async retryFailed() {
    const rows = this.db.prepare("SELECT relative_path FROM local_files WHERE status = 'failed'").all()
    for (const row of rows) {
      const relativePath = String(row.relative_path ?? "")
      const absolutePath = this.absolutePath(relativePath)
      this.queue.set(absolutePath, "retry")
      this.upsertLocal({ relativePath, status: "queued" })
    }
    this.addActivity("queued", "", `Queued ${rows.length} failed item${rows.length === 1 ? "" : "s"} for retry.`)
    this.emitSnapshot()
    this.processQueueSoon()
    return this.snapshot()
  }

  snapshot(): DesktopSnapshot {
    return {
      settings: this.settingsStore.get(),
      summary: this.summary(),
      activity: this.recentActivity(),
    }
  }

  private initializeDatabase() {
    initializeSyncDatabase(this.db)
  }

  private async ensureSyncFolder() {
    await mkdir(this.settingsStore.get().syncFolder, { recursive: true })
  }

  private async startWatcher() {
    const folder = this.settingsStore.get().syncFolder
    await mkdir(folder, { recursive: true })

    this.watcher = chokidar.watch(folder, {
      awaitWriteFinish: { stabilityThreshold: 1200, pollInterval: 150 },
      ignored: [/node_modules/, /(^|[\\/])\.gyenbox([\\/]|$)/, /\.tmp$/, /\.crdownload$/, /(^|[\\/])~\$/],
      ignoreInitial: false,
      persistent: true,
    })

    this.watcher.on("add", (path) => this.enqueue(path, "created"))
    this.watcher.on("change", (path) => this.enqueue(path, "changed"))
    this.watcher.on("unlink", (path) => this.markDeleted(path))
    this.watcher.on("error", (error) => {
      this.lastMessage = error instanceof Error ? error.message : String(error)
      this.addActivity("failed", "", this.lastMessage)
      this.emitSnapshot()
    })
  }

  private enqueue(filePath: string, reason: QueueReason) {
    this.queue.set(filePath, reason)
    const relativePath = this.relativePath(filePath)
    this.upsertLocal({ relativePath, status: "queued" })
    this.addActivity("queued", relativePath, reason === "changed" ? "Change detected." : "File queued.")
    this.emitSnapshot()
    this.processQueueSoon()
  }

  private markDeleted(filePath: string) {
    const relativePath = this.relativePath(filePath)
    this.upsertLocal({ relativePath, status: "deleted", lastError: null })
    this.addActivity("deleted", relativePath, "Removed locally. Cloud delete comes next.")
    this.emitSnapshot()
  }

  private processQueueSoon() {
    void this.processQueue()
  }

  private async processQueue() {
    if (this.processing) return
    this.processing = true

    try {
      while (this.queue.size > 0) {
        const settings = this.settingsStore.get()
        if (settings.paused) break
        if (!settings.accessToken.trim()) {
          this.lastMessage = "Sign in to start uploading."
          break
        }

        const [filePath] = this.queue.keys()
        this.queue.delete(filePath)
        await this.uploadPath(filePath, settings)
        await delay(50)
      }
    } finally {
      this.processing = false
      this.emitSnapshot()
    }
  }

  private async uploadPath(filePath: string, settings: DesktopSettings) {
    const relativePath = this.relativePath(filePath)

    try {
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) return

      const buffer = await readFile(filePath)
      const hash = createHash("sha256").update(buffer).digest("hex")
      const existing = this.getLocal(relativePath)
      if (existing?.hash === hash && existing.remoteId) {
        this.upsertLocal({ relativePath, size: fileStat.size, mtimeMs: fileStat.mtimeMs, hash, status: "uploaded", lastError: null })
        this.lastMessage = "Your files are up to date."
        return
      }

      this.upsertLocal({ relativePath, size: fileStat.size, mtimeMs: fileStat.mtimeMs, hash, status: "syncing", lastError: null })
      this.addActivity("syncing", relativePath, "Uploading.")
      this.emitSnapshot()

      const form = new FormData()
      if (existing?.remoteId) form.set("fileId", existing.remoteId)
      form.set("file", new Blob([buffer], { type: guessMime(filePath) }), relativePath)

      const response = await fetch(`${settings.apiBaseUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.accessToken.trim()}` },
        body: form,
      })
      const payload = (await response.json().catch(() => null)) as UploadResponse | null

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? `Upload failed with HTTP ${response.status}`)
      }

      this.upsertLocal({ relativePath, status: "uploaded", remoteId: payload.data?.file?.id ?? null, lastError: null })
      this.addActivity("uploaded", relativePath, "Uploaded.")
      this.lastMessage = "Your files are up to date."
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.upsertLocal({ relativePath, status: "failed", lastError: message })
      this.addActivity("failed", relativePath, message)
      this.lastMessage = message
    }
  }

  private summary(): SyncSummary {
    const settings = this.settingsStore.get()
    const counts = this.db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN status = 'syncing' THEN 1 ELSE 0 END) AS syncing,
        SUM(CASE WHEN status = 'uploaded' THEN 1 ELSE 0 END) AS uploaded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
        COALESCE(SUM(size), 0) AS totalBytes
      FROM local_files
    `).get() ?? {}

    const queued = Number(counts.queued ?? 0) + this.queue.size
    const syncing = Number(counts.syncing ?? 0) + (this.processing ? 1 : 0)
    const failed = Number(counts.failed ?? 0)
    const state = settings.paused
      ? "paused"
      : !settings.accessToken.trim()
        ? "needs-auth"
        : syncing > 0 || queued > 0
          ? "syncing"
          : failed > 0
            ? "error"
            : "idle"

    return {
      state,
      syncFolder: settings.syncFolder,
      apiBaseUrl: settings.apiBaseUrl,
      accessTokenConfigured: Boolean(settings.accessToken.trim()),
      paused: settings.paused,
      queued,
      syncing,
      uploaded: Number(counts.uploaded ?? 0),
      failed,
      skipped: Number(counts.skipped ?? 0),
      totalBytes: Number(counts.totalBytes ?? 0),
      lastMessage: state === "idle" ? "Your files are up to date." : this.lastMessage,
      updatedAt: new Date().toISOString(),
    }
  }

  private recentActivity(): SyncActivity[] {
    return this.db.prepare(`
      SELECT id, type, path, message, created_at AS createdAt
      FROM sync_activity
      ORDER BY id DESC
      LIMIT 30
    `).all().map((row) => ({
      id: Number(row.id),
      type: String(row.type) as SyncActivity["type"],
      path: String(row.path ?? ""),
      message: String(row.message ?? ""),
      createdAt: String(row.createdAt ?? ""),
    }))
  }

  private getLocal(relativePath: string): LocalRecord | null {
    const row = this.db.prepare("SELECT * FROM local_files WHERE relative_path = ?").get(relativePath)
    if (!row) return null
    return {
      relativePath: String(row.relative_path),
      size: Number(row.size ?? 0),
      mtimeMs: Number(row.mtime_ms ?? 0),
      hash: row.hash ? String(row.hash) : null,
      status: String(row.status) as FileStatus,
      remoteId: row.remote_id ? String(row.remote_id) : null,
      lastError: row.last_error ? String(row.last_error) : null,
    }
  }

  private upsertLocal(input: Partial<LocalRecord> & { relativePath: string }) {
    const current = this.getLocal(input.relativePath)
    const next = {
      size: input.size ?? current?.size ?? 0,
      mtimeMs: input.mtimeMs ?? current?.mtimeMs ?? 0,
      hash: input.hash ?? current?.hash ?? null,
      status: input.status ?? current?.status ?? "queued",
      remoteId: input.remoteId ?? current?.remoteId ?? null,
      lastError: input.lastError ?? null,
    }

    this.db.prepare(`
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
    `).run(input.relativePath, next.size, next.mtimeMs, next.hash, next.status, next.remoteId, next.lastError)
  }

  private addActivity(type: SyncActivity["type"], path: string, message: string) {
    this.lastMessage = message
    this.db.prepare("INSERT INTO sync_activity (type, path, message) VALUES (?, ?, ?)").run(type, path, message)
  }

  private emitSnapshot() {
    this.emit("snapshot", this.snapshot())
  }

  private displayFolder() {
    const folder = this.settingsStore.get().syncFolder.replace(/\\/g, "/")
    const parts = folder.split("/").filter(Boolean)
    return parts.at(-1) ?? "GyenBox"
  }
  private relativePath(filePath: string) {
    return relative(this.settingsStore.get().syncFolder, filePath).replace(/\\/g, "/")
  }

  private absolutePath(relativePath: string) {
    return `${this.settingsStore.get().syncFolder}/${relativePath}`
  }
}
