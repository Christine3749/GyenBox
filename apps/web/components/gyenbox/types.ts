export type FileType = 'folder' | 'png' | 'jpg' | 'pdf' | 'docx' | 'xlsx' | 'mp4' | 'zip' | 'txt';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  itemCount?: number; // for folders
  size?: string; // formatted e.g. "2.1 MB"
  sizeBytes?: number; // in bytes
  modifiedAt: string;
  createdAt: string;
  starred: boolean;
  shared: boolean;
  parentFolderId: string | null;
  isTrash: boolean;
  owner: {
    name: string;
    avatar: string;
    email: string;
  };
}

// Server-rendered first-paint data passed from the workspace page (SSR) into
// the client component, so the file list is present in the initial HTML.
export interface WorkspaceInitialData {
  files: FileItem[];
  storageUsedBytes: number;
  storageQuotaBytes: number;
}

export interface UploadingFile {
  id: string;
  name: string;
  type: FileType;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
}

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
}

export interface CommentItem {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
}

export type SortField = 'name' | 'size' | 'modified';
export type SortOrder = 'asc' | 'desc';
