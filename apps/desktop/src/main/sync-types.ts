export type QueueReason = "created" | "changed" | "rescan" | "retry";
export type FileStatus =
  | "queued"
  | "syncing"
  | "uploaded"
  | "failed"
  | "deleted"
  | "skipped";

export type LocalRecord = {
  relativePath: string;
  size: number;
  mtimeMs: number;
  hash: string | null;
  status: FileStatus;
  remoteId: string | null;
  lastError: string | null;
};

export type UploadReservationResponse = {
  ok?: boolean;
  data?: {
    uploadId?: string;
    fileId?: string | null;
    bucket?: string;
    storageKey?: string;
    uploadUrl?: string;
    method?: "PUT";
    headers?: Record<string, string>;
    expiresIn?: number;
  };
  error?: { message?: string };
};

export type UploadCompleteResponse = {
  ok?: boolean;
  data?: { file?: { id?: string; name?: string } };
  error?: { message?: string };
};

export type RemoteFolderItem = {
  id?: string;
  name?: string;
  parentFolderId?: string | null;
};

export type FolderListResponse = {
  ok?: boolean;
  data?: { folders?: RemoteFolderItem[] };
  error?: { message?: string };
};

export type FolderCreateResponse = {
  ok?: boolean;
  data?: { file?: RemoteFolderItem };
  error?: { message?: string };
};

export type DesktopSessionRefreshResponse = {
  ok?: boolean;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string | null;
    user?: {
      id?: string | null;
      email?: string | null;
    };
  };
  error?: { message?: string };
};
