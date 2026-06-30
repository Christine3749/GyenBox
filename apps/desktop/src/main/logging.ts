import { app } from "electron";
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_LOG_BYTES = 2 * 1024 * 1024;

type LogLevel = "INFO" | "WARN" | "ERROR";
type LogDetails = Record<string, unknown>;

export function logInfo(scope: string, message: string, details?: LogDetails) {
  writeLog("gyenbox.log", "INFO", scope, message, details);
}

export function logWarn(scope: string, message: string, details?: LogDetails) {
  writeLog("gyenbox.log", "WARN", scope, message, details);
}

export function logError(scope: string, message: string, details?: LogDetails) {
  writeLog("gyenbox.log", "ERROR", scope, message, details);
}

export function logSetup(scope: string, message: string, details?: LogDetails) {
  writeLog("setup.log", "INFO", scope, message, details);
}

export function logSetupWarn(scope: string, message: string, details?: LogDetails) {
  writeLog("setup.log", "WARN", scope, message, details);
}

export function logSetupError(scope: string, message: string, details?: LogDetails) {
  writeLog("setup.log", "ERROR", scope, message, details);
}

export function logDirectory() {
  const explicit = process.env.GYENBOX_LOG_DIR?.trim();
  if (explicit) return explicit;

  const localAppData = process.env.LOCALAPPDATA?.trim();
  if (localAppData) return join(localAppData, "GyenBox", "logs");

  return join(app.getPath("userData"), "logs");
}

function writeLog(
  fileName: string,
  level: LogLevel,
  scope: string,
  message: string,
  details?: LogDetails,
) {
  try {
    const dir = logDirectory();
    mkdirSync(dir, { recursive: true });
    const path = join(dir, fileName);
    rotateIfNeeded(path);
    const suffix = details && Object.keys(details).length > 0 ? ` ${safeJson(details)}` : "";
    appendFileSync(path, `${new Date().toISOString()} ${level} [${scope}] ${message}${suffix}\n`, "utf8");
  } catch {
    // Logging must never break setup or sync.
  }
}

function rotateIfNeeded(path: string) {
  try {
    if (!existsSync(path)) return;
    if (statSync(path).size < MAX_LOG_BYTES) return;
    const rotated = `${path}.1`;
    if (existsSync(rotated)) {
      try {
        renameSync(rotated, `${rotated}.old`);
      } catch {}
    }
    renameSync(path, rotated);
  } catch {}
}

function safeJson(value: unknown) {
  return JSON.stringify(value, (_key, item) => {
    if (item instanceof Error) {
      return { name: item.name, message: item.message, stack: item.stack };
    }
    if (typeof item === "bigint") return item.toString();
    return item;
  });
}