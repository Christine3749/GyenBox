import type { DatabaseSync } from "node:sqlite";

import type { FileStatus } from "./sync-types.js";

// A folder's displayed status is the aggregate of its descendants:
//   any failed  -> failed
//   any syncing -> syncing
//   any queued  -> queued
//   all synced  -> uploaded (✅)
// Maintained incrementally in the folder_rollup counters table so a single
// leaf transition only walks its ancestor chain (O(depth)), never the whole
// tree. Rebuilt from local_files on startup / repair to self-heal drift.
export type FolderAggregate = "uploaded" | "syncing" | "queued" | "failed";

type CountColumn = "synced" | "syncing" | "queued" | "failed";

type RollupRow = {
  total: number;
  synced: number;
  syncing: number;
  queued: number;
  failed: number;
};

const COUNTED_STATUSES: ReadonlySet<FileStatus> = new Set<FileStatus>([
  "queued",
  "syncing",
  "uploaded",
  "failed",
]);

function emptyRow(): RollupRow {
  return { total: 0, synced: 0, syncing: 0, queued: 0, failed: 0 };
}

function columnFor(status: FileStatus | null): CountColumn | null {
  switch (status) {
    case "uploaded":
      return "synced";
    case "syncing":
      return "syncing";
    case "queued":
      return "queued";
    case "failed":
      return "failed";
    default:
      return null; // deleted / skipped / null -> not counted
  }
}

export function normalizeRelativePath(relativePath: string) {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

// Ancestor folders of a leaf, nearest-first is irrelevant; excludes the leaf.
export function ancestorFolders(relativePath: string): string[] {
  const parts = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  const folders: string[] = [];
  for (let index = 1; index < parts.length; index += 1) {
    folders.push(parts.slice(0, index).join("/"));
  }
  return folders;
}

export function aggregateFromCounts(row: RollupRow): FolderAggregate | null {
  if (row.total <= 0) return null;
  if (row.failed > 0) return "failed";
  if (row.syncing > 0) return "syncing";
  if (row.queued > 0) return "queued";
  return "uploaded";
}

function readRollup(db: DatabaseSync, path: string): RollupRow {
  const row = db
    .prepare(
      "SELECT total, synced, syncing, queued, failed FROM folder_rollup WHERE path = ?",
    )
    .get(path);
  if (!row) return emptyRow();
  return {
    total: Number(row.total ?? 0),
    synced: Number(row.synced ?? 0),
    syncing: Number(row.syncing ?? 0),
    queued: Number(row.queued ?? 0),
    failed: Number(row.failed ?? 0),
  };
}

function writeRollup(db: DatabaseSync, path: string, row: RollupRow) {
  const clamp = (value: number) => (value > 0 ? value : 0);
  const next: RollupRow = {
    total: clamp(row.total),
    synced: clamp(row.synced),
    syncing: clamp(row.syncing),
    queued: clamp(row.queued),
    failed: clamp(row.failed),
  };

  if (next.total === 0) {
    db.prepare("DELETE FROM folder_rollup WHERE path = ?").run(path);
    return;
  }

  db.prepare(
    `INSERT INTO folder_rollup (path, total, synced, syncing, queued, failed)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET
       total = excluded.total,
       synced = excluded.synced,
       syncing = excluded.syncing,
       queued = excluded.queued,
       failed = excluded.failed`,
  ).run(path, next.total, next.synced, next.syncing, next.queued, next.failed);
}

// Apply one leaf status transition to the persisted counters and return the
// ancestor folders whose aggregate status actually changed (so the caller only
// re-marks Explorer for folders that moved).
export function applyLeafTransition(
  db: DatabaseSync,
  relativePath: string,
  previousStatus: FileStatus | null,
  nextStatus: FileStatus,
): Array<{ path: string; status: FolderAggregate }> {
  const prevColumn = columnFor(previousStatus);
  const nextColumn = columnFor(nextStatus);
  if (prevColumn === nextColumn) return [];

  const changed: Array<{ path: string; status: FolderAggregate }> = [];
  for (const folder of ancestorFolders(relativePath)) {
    const row = readRollup(db, folder);
    const before = aggregateFromCounts(row);

    if (prevColumn) {
      row[prevColumn] -= 1;
      row.total -= 1;
    }
    if (nextColumn) {
      row[nextColumn] += 1;
      row.total += 1;
    }
    writeRollup(db, folder, row);

    const after = aggregateFromCounts(row);
    if (after && after !== before) changed.push({ path: folder, status: after });
  }
  return changed;
}

// Rebuild every folder counter from local_files. Used on startup and on the
// "Repair Explorer status" action so transient drift self-corrects.
export function rebuildFolderRollup(db: DatabaseSync): void {
  const counts = new Map<string, RollupRow>();
  const rows = db.prepare("SELECT relative_path, status FROM local_files").all();

  for (const raw of rows) {
    const status = String(raw.status ?? "") as FileStatus;
    if (!COUNTED_STATUSES.has(status)) continue;
    const column = columnFor(status);
    if (!column) continue;
    const relativePath = normalizeRelativePath(String(raw.relative_path ?? ""));
    if (!relativePath) continue;

    for (const folder of ancestorFolders(relativePath)) {
      const row = counts.get(folder) ?? emptyRow();
      row[column] += 1;
      row.total += 1;
      counts.set(folder, row);
    }
  }

  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM folder_rollup");
    const insert = db.prepare(
      `INSERT INTO folder_rollup (path, total, synced, syncing, queued, failed)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const [path, row] of counts) {
      insert.run(path, row.total, row.synced, row.syncing, row.queued, row.failed);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// All folder aggregates, for the one-shot full mark on startup / repair.
export function allFolderAggregates(
  db: DatabaseSync,
): Array<{ path: string; status: FolderAggregate }> {
  return db
    .prepare(
      "SELECT path, total, synced, syncing, queued, failed FROM folder_rollup",
    )
    .all()
    .map((raw) => {
      const status = aggregateFromCounts({
        total: Number(raw.total ?? 0),
        synced: Number(raw.synced ?? 0),
        syncing: Number(raw.syncing ?? 0),
        queued: Number(raw.queued ?? 0),
        failed: Number(raw.failed ?? 0),
      });
      return {
        path: normalizeRelativePath(String(raw.path ?? "")),
        status: status ?? "uploaded",
      };
    })
    .filter((row) => row.path);
}
