export type NoteColorId =
  | "default"
  | "rose"
  | "apricot"
  | "amber"
  | "sage"
  | "mint"
  | "slate"
  | "lavender"
  | "sand"
  | "blush";

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: "text" | "list";
  items: ChecklistItem[];
  color: NoteColorId;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  labels: string[];
  reminder?: {
    date: string; // ISO or YYYY-MM-DD THH:mm
    location?: string;
  };
  imageUrl?: string;
  collaborators?: string[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  // AI metadata
  suggestedTags?: string[];
  relatedNoteIds?: { id: string; reason: string }[];
  matchedExplanation?: string; // from semantic search
}

export type ViewMode = "grid" | "list";

export type NavFilter = "notes" | "reminders" | "archive" | "trash" | string; // string = specific label name

export interface MorandiColor {
  id: NoteColorId;
  name: string;
  bgLight: string;
  borderLight: string;
  bgDark: string;
  borderDark: string;
  dotBg: string;
}

export interface SemanticSearchResult {
  id: string;
  score: number;
  whyMatch: string;
}

export interface MergeRecommendation {
  noteIdA: string;
  noteIdB: string;
  reason: string;
  mergedTitle: string;
  mergedContent: string;
}

export interface StaleRecommendation {
  id: string;
  reason: string;
}


