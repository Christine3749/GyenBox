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
