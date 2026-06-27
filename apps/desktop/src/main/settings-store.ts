import { safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { DesktopSettings } from "./types.js";

type SettingsInput = Partial<DesktopSettings>;
type PersistedDesktopSettings = Partial<DesktopSettings> & {
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
};

const ENCRYPTED_TOKEN_PLACEHOLDER = "__encrypted__";

export class SettingsStore {
  private current: DesktopSettings | null = null;

  constructor(
    private readonly filePath: string,
    private readonly defaults: DesktopSettings,
  ) {}

  async load() {
    if (this.current) return this.current;

    try {
      const raw = await readFile(this.filePath, "utf8");
      const persisted = JSON.parse(raw) as PersistedDesktopSettings;
      this.current = this.hydrate(persisted);
      if (shouldRewriteEncrypted(persisted)) await this.save();
    } catch {
      this.current = this.defaults;
      await this.save();
    }

    return this.current;
  }

  get() {
    if (!this.current) return this.defaults;
    return this.current;
  }

  async update(input: SettingsInput) {
    const current = this.get();
    this.current = {
      ...current,
      ...input,
      apiBaseUrl: normalizeBaseUrl(input.apiBaseUrl ?? current.apiBaseUrl),
    };
    await this.save();
    return this.current;
  }

  async save() {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(this.persisted(), null, 2)}\n`,
      "utf8",
    );
  }

  private hydrate(input: PersistedDesktopSettings): DesktopSettings {
    return {
      apiBaseUrl: normalizeBaseUrl(
        input.apiBaseUrl ?? this.defaults.apiBaseUrl,
      ),
      accessToken: tokenFrom(
        input.accessTokenEncrypted,
        input.accessToken,
        this.defaults.accessToken,
      ),
      refreshToken: tokenFrom(
        input.refreshTokenEncrypted,
        input.refreshToken,
        this.defaults.refreshToken,
      ),
      tokenExpiresAt:
        typeof input.tokenExpiresAt === "string"
          ? input.tokenExpiresAt
          : this.defaults.tokenExpiresAt,
      accountEmail:
        typeof input.accountEmail === "string"
          ? input.accountEmail
          : this.defaults.accountEmail,
      syncFolder:
        typeof input.syncFolder === "string"
          ? input.syncFolder
          : this.defaults.syncFolder,
      paused:
        typeof input.paused === "boolean" ? input.paused : this.defaults.paused,
    };
  }

  private persisted(): PersistedDesktopSettings {
    const current = this.get();
    const accessTokenEncrypted = encryptToken(current.accessToken);
    const refreshTokenEncrypted = encryptToken(current.refreshToken);

    if (accessTokenEncrypted !== null || refreshTokenEncrypted !== null) {
      return {
        ...current,
        accessToken: current.accessToken ? ENCRYPTED_TOKEN_PLACEHOLDER : "",
        refreshToken: current.refreshToken ? ENCRYPTED_TOKEN_PLACEHOLDER : "",
        accessTokenEncrypted: accessTokenEncrypted ?? undefined,
        refreshTokenEncrypted: refreshTokenEncrypted ?? undefined,
      };
    }

    return current;
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "") || "https://gyenbox.com";
}

function tokenFrom(
  encryptedValue: string | undefined,
  plainValue: string | undefined,
  fallback: string,
) {
  const decrypted = encryptedValue ? decryptToken(encryptedValue) : null;
  if (decrypted !== null) return decrypted;
  if (plainValue && plainValue !== ENCRYPTED_TOKEN_PLACEHOLDER)
    return plainValue;
  return fallback;
}

function encryptToken(value: string) {
  if (!value) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.encryptString(value).toString("base64");
}

function decryptToken(value: string) {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(value, "base64"));
  } catch {
    return null;
  }
}

function shouldRewriteEncrypted(input: PersistedDesktopSettings) {
  if (!safeStorage.isEncryptionAvailable()) return false;
  return Boolean(
    (input.accessToken && input.accessToken !== ENCRYPTED_TOKEN_PLACEHOLDER) ||
    (input.refreshToken && input.refreshToken !== ENCRYPTED_TOKEN_PLACEHOLDER),
  );
}
