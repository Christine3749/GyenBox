export type EntryLevel = 'ONCE' | 'MEMORY' | 'HIGH' | 'FIXED';
export type LibraryCategory = 'PUBLIC_BASE' | 'PERSONAL' | 'TECH' | 'NAMES_PLACES' | 'PRO' | 'PENDING';
export type InputScheme = 'ALL' | 'PINYIN' | 'WUBI' | 'SHUANGPIN' | 'CANGJIE';
export type AppTheme = 'dark' | 'light';
export type AppLang = 'zh' | 'en';

export interface CikuEntry {
  id: string;
  word: string;
  pinyin: string;
  wubi?: string; // 五笔编码 (老三样)
  shuangpin?: string; // 双拼编码 (老三样)
  cangjie?: string; // 仓颉/简拼 (老三样)
  english?: string; // 英文释义 / English translation
  pos: string; // 词性: n. v. adj. idiom. tech. etc.
  definition: string;
  etymology?: string; // 词源
  exampleSentences: string[];
  relatedTerms: string[];
  usageCount: number;
  lastUsedTime: string; // ISO String or relative date
  category: LibraryCategory;
  sourceLibrary: string; // e.g. "公共基础词库", "技术词库", "我的个人词库"
  level: EntryLevel;
  isFavorited: boolean;
  isPinned: boolean; // 固定词
  isSynced: boolean;
  tags: string[];
  trend7d: number; // e.g. +14% or -5%
  trend30d: number;
  autoUpgradeReason?: string;
  personalNotes?: string;
  isIgnored?: boolean;
}

export interface LibraryItem {
  id: string;
  name: string;
  code: LibraryCategory;
  count: number;
  description: string;
  version: string;
  updatedAt: string;
  source: 'SYSTEM' | 'COMMUNITY' | 'USER';
  reviewStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface PendingSubmission {
  id: string;
  word: string;
  pinyin: string;
  pos: string;
  definition: string;
  category: LibraryCategory;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface ImportPreviewResult {
  fileName: string;
  format: 'TXT' | 'CSV' | 'JSON' | 'SOUGOU' | 'RIME';
  totalParsed: number;
  newCount: number;
  duplicateCount: number;
  conflictCount: number;
  invalidCount: number;
  sampleEntries: Partial<CikuEntry>[];
}

export interface SyncDevice {
  id: string;
  name: string;
  os: string;
  ip: string;
  lastSyncAt: string;
  isCurrent: boolean;
  pendingCount: number;
}

export interface SyncStatus {
  account: string;
  accountEmail: string;
  syncEnabled: boolean;
  lastSyncTime: string;
  queueSize: number;
  conflictCount: number;
  revision: string;
  devices: SyncDevice[];
}

export interface KeepCard {
  id: string;
  entryId: string;
  word: string;
  pinyin: string;
  definition: string;
  createdAt: string;
  nextReviewAt: string;
}

export interface FrequencyStats {
  onceCount: number;
  memoryCount: number;
  highCount: number;
  fixedCount: number;
  totalCount: number;
}
