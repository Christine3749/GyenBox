/**
 * Client-only vault cryptography. Password material and decrypted TOTP secrets
 * are never sent to a server or stored in browser storage in plaintext.
 */
import {
  Account,
  EncryptedBackupPayload,
  EncryptedVaultPayload,
  VaultData,
} from "../types";

export const VAULT_STORAGE_KEY = "safeauth_encrypted_vault_v2";
export const VAULT_KDF_ITERATIONS = 600_000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = VAULT_KDF_ITERATIONS,
): Promise<CryptoKey> {
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptData(
  data: VaultData,
  key: CryptoKey,
  salt: Uint8Array,
): Promise<EncryptedVaultPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );

  return {
    version: "2.0.0",
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-HMAC-SHA-256",
    iterations: VAULT_KDF_ITERATIONS,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext),
    updatedAt: Date.now(),
  };
}

function parseVaultData(value: unknown): VaultData {
  if (!value || typeof value !== "object") throw new Error("保险箱数据格式无效");
  const data = value as Partial<VaultData>;
  if (!Array.isArray(data.accounts) || !Array.isArray(data.backups)) {
    throw new Error("保险箱数据格式无效");
  }
  return { accounts: data.accounts, backups: data.backups };
}

export async function createEncryptedVault(
  data: VaultData,
  passphrase: string,
): Promise<{ vault: EncryptedVaultPayload; key: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  return { vault: await encryptData(data, key, salt), key };
}

export async function unlockEncryptedVault(
  vault: EncryptedVaultPayload,
  passphrase: string,
): Promise<{ data: VaultData; key: CryptoKey }> {
  try {
    const salt = new Uint8Array(base64ToArrayBuffer(vault.salt));
    const iv = new Uint8Array(base64ToArrayBuffer(vault.iv));
    const ciphertext = base64ToArrayBuffer(vault.ciphertext);
    const key = await deriveKey(passphrase, salt, vault.iterations);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return { data: parseVaultData(JSON.parse(new TextDecoder().decode(decrypted))), key };
  } catch {
    throw new Error("主密码错误，或本地保险箱数据已损坏。");
  }
}

export async function reencryptVault(
  data: VaultData,
  key: CryptoKey,
  currentVault: EncryptedVaultPayload,
): Promise<EncryptedVaultPayload> {
  return encryptData(data, key, new Uint8Array(base64ToArrayBuffer(currentVault.salt)));
}

export async function encryptAccountsBackup(
  accounts: Account[],
  passphrase: string,
): Promise<EncryptedBackupPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify({ accounts, exportedAt: Date.now(), appVersion: "2.0.0-vault" })),
  );

  return {
    version: "1.0.0",
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2",
    iterations: VAULT_KDF_ITERATIONS,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext),
    metadata: { exportedAt: Date.now(), accountCount: accounts.length },
  };
}

export async function decryptAccountsBackup(
  payload: EncryptedBackupPayload,
  passphrase: string,
): Promise<Account[]> {
  try {
    const key = await deriveKey(
      passphrase,
      new Uint8Array(base64ToArrayBuffer(payload.salt)),
      payload.iterations ?? 100_000,
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(payload.iv)) },
      key,
      base64ToArrayBuffer(payload.ciphertext),
    );
    const parsed = JSON.parse(new TextDecoder().decode(decrypted));
    if (!Array.isArray(parsed.accounts)) throw new Error("Invalid backup structure");
    return parsed.accounts as Account[];
  } catch {
    throw new Error("解密失败：密码错误或备份文件已被损坏。");
  }
}
