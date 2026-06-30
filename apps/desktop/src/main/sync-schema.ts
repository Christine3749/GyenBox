import { DatabaseSync } from "node:sqlite"

export function initializeSyncDatabase(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_files (
      relative_path TEXT PRIMARY KEY,
      size INTEGER NOT NULL DEFAULT 0,
      mtime_ms REAL NOT NULL DEFAULT 0,
      hash TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      remote_id TEXT,
      last_error TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Persisted folder aggregate counters (0.1.16). Maintained incrementally
    -- so a leaf status change only touches its ancestor chain, never a full
    -- table rescan. Rebuilt from local_files on startup / repair.
    CREATE TABLE IF NOT EXISTS folder_rollup (
      path TEXT PRIMARY KEY,
      total INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0,
      syncing INTEGER NOT NULL DEFAULT 0,
      queued INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_local_files_status ON local_files(status);
    CREATE INDEX IF NOT EXISTS idx_sync_activity_created ON sync_activity(created_at);
  `)
}
