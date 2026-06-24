export type FileType = 'folder' | 'png' | 'pdf' | 'docx' | 'xlsx' | 'mp4' | 'zip' | 'txt';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  parentId: string | null; // null represents the root ("My Files" / "Design Work")
  size: string; // e.g., "2.1 MB", "142 KB"
  sizeBytes: number; // for storage math
  modifiedText: string; // e.g., "2h ago", "Yesterday"
  createdDate: string; // e.g., "Jun 24, 2025"
  itemCount?: number; // only for folders
  isStarred?: boolean;
  isTrash?: boolean;
  sharedWithMe?: boolean;
  isRecent?: boolean;
  badge?: string;
  tags?: string[];
  ownerName?: string;
  ownerAvatar?: string;
}

export interface UploadProgress {
  id: string;
  name: string;
  type: FileType;
  progress: number; // 0 to 100
  status: 'uploading' | 'done' | 'failed';
}

export interface ToastMessage {
  id: string;
  title: string;
  body: string;
  type: 'success' | 'error' | 'info' | 'warning';
  progress: number; // For progress bar depletion
}
