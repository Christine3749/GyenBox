export type ThemeType =
  | 'dark_minimal'
  | 'light_minimal'
  | 'light_paper'
  | 'classic_laosanyang'
  | 'english_clean'
  | 'acrylic_classic'
  | 'aurora_blue'
  | 'slate_dark'
  | 'pure_contrast';

export type NavSection = 'overview' | 'settings' | 'learning' | 'devices' | 'sync' | 'changelog';

export interface GYConfig {
  revision: number;
  lastSyncedAt: string;
  account: {
    username: string;
    email: string;
    avatar: string;
    gyenboxId: string;
    token: string;
  };
  appearance: {
    fontFamily: string;
    fontSize: number;
    theme: ThemeType;
    candidateCount: number;
    showLogo: boolean;
  };
  behavior: {
    shiftSwitch: 'toggle_cn_en' | 'none' | 'hold';
    chinesePunctuation: boolean;
    rawEnglishMode: boolean;
    inputScheme: 'quanpin' | 'shuangpin_microsoft' | 'wubi' | 'laosanyang_classic';
    defaultLanguage: 'chinese' | 'english' | 'traditional';
    englishAutoSpace: boolean;
    tabBehavior: 'break_character' | 'toggle_pinyin' | 'next_page' | 'indent';
    enterBehavior: 'commit_letters' | 'commit_first' | 'clear';
    spaceBehavior: 'commit_first' | 'space_char';
  };
  candidate: {
    sorting: 'smart_freq' | 'static_dict' | 'personal_habit';
    numberSelection: boolean;
    arrowSelection: boolean;
    association: boolean;
  };
  privacy: {
    syncWordFrequency: boolean;
    recordLearning: boolean;
  };
  quickPhrases: QuickPhrase[];
}

export interface QuickPhrase {
  id: string;
  shortcut: string;
  text: string;
  updatedAt: string;
}

export type WordCategory = 'single' | 'memorized' | 'high_freq' | 'fixed';

export interface LearnedWord {
  id: string;
  word: string;
  pinyin: string;
  count: number;
  lastUsedAt: string;
  category: WordCategory;
  synced: boolean;
}

export interface GYDevice {
  id: string;
  name: string;
  os: 'Windows' | 'macOS';
  osVersion: string;
  inputVersion: string;
  lastOnlineAt: string;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'conflict';
  revision: number;
  isCurrent: boolean;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  deviceName: string;
  action: string;
  revisionBefore: number;
  revisionAfter: number;
  status: 'success' | 'conflict' | 'failed';
  details: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  localFirst: boolean;
  serverTime: string;
  currentRevision: number;
  connectedDevices: number;
}
