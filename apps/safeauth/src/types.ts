export type CategoryId = "all" | "work" | "cloud" | "finance" | "dev" | "personal" | "favorites" | "hidden";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  iconName: string;
  // Low-saturation background color strictly for the account's top-left icon container
  bgLight: string; // e.g. "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
  badgeTint: string; // hex or tailwind class for icon box
}

export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export interface Account {
  id: string;
  issuer: string;
  accountName: string; // e.g. email or username
  secret: string; // Base32 TOTP secret key
  categoryId: CategoryId;
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number; // usually 30s
  isFavorite: boolean;
  isHidden: boolean;
  lastUsedTimestamp?: number; // epoch ms when code was copied/viewed
  createdAt: number; // epoch ms
  notes?: string;
  iconBrand?: string; // e.g. "google", "github", "aws", "stripe", "binance", "vercel", "discord", "notion", "cloudflare", "apple", "microsoft", "steam"
}

export interface BackupRecord {
  id: string;
  timestamp: number;
  accountCount: number;
  fileName: string;
  checksum: string;
}

export interface SecurityRecommendation {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  actionType: "backup" | "review_unused" | "check_hidden" | "general";
}

export interface SecurityAuditResult {
  healthScore: number;
  summary: string;
  recommendations: SecurityRecommendation[];
  lastAuditTimestamp?: number;
}

export type ViewMode = "compact_list" | "grid";
export type ThemeMode = "dark" | "light";

export interface EncryptedBackupPayload {
  version: string;
  algorithm: "AES-256-GCM";
  kdf: "PBKDF2";
  iterations?: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  metadata: {
    exportedAt: number;
    accountCount: number;
  };
}

export interface VaultData {
  accounts: Account[];
  backups: BackupRecord[];
}

export interface EncryptedVaultPayload {
  version: "2.0.0";
  algorithm: "AES-256-GCM";
  kdf: "PBKDF2-HMAC-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: number;
}
