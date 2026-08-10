export type NoteColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'gray';

// Source is internal transport metadata.  GY clipboard entries deliberately
// stay in the normal Notes view rather than becoming a separate product area.
export type NoteSource = 'manual' | 'gy-clipboard';

export type MemoryCardKind = 'word_origin' | 'example' | 'related_words' | 'correction' | 'preference';
export type MemoryCardSource = 'user' | 'local-learning' | 'ai' | 'keep';
export type MemoryCardPrivacy = 'local-only' | 'account';

// Long-term learning memory is intentionally not a NoteSource. Clipboard
// entries remain in the clipboard protocol; only user-approved cards enter
// this contract.
export interface MemoryCard {
  id: string;
  clientId?: string;
  kind: MemoryCardKind;
  surface: string;
  pinyin: string;
  meaning?: string;
  origin?: string;
  relatedWords: string[];
  examples: string[];
  mnemonic?: string;
  source: MemoryCardSource;
  confidence?: number;
  approved: boolean;
  privacy: MemoryCardPrivacy;
  nextReviewAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'checklist';
  items?: ChecklistItem[];
  color: NoteColor;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  trashedAt?: number; // timestamp in ms
  labels: string[]; // label IDs
  reminder?: string | null; // ISO string or datetime description
  source?: NoteSource;
  sourceId?: string;
  capturedAt?: number;
  syncSequence?: string;
  originDeviceId?: string;
  image?: {
    mimeType: string;
    sizeBytes: number;
    url: string;
  };
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface Label {
  id: string;
  name: string;
}

export type ViewMode = 'notes' | 'reminders' | 'label' | 'archive' | 'trash';
export type LayoutMode = 'grid' | 'list';
export type ThemeMode = 'light' | 'dark' | 'system';
