import { z } from "zod";

export const fileListQuerySchema = z.object({
  folderId: z.string().optional(),
  sort: z.enum(["name", "size", "modified", "created"]).default("modified"),
  order: z.enum(["asc", "desc"]).default("desc"),
  type: z.enum(["image", "video", "document", "other"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const uploadReservationSchema = z.object({
  fileId: z.string().min(1).nullable().optional(),
  name: z.string().min(1).max(255),
  size: z.coerce.number().int().nonnegative(),
  mimeType: z.string().min(1).max(255),
  checksum: z.string().min(32).max(128),
  folderId: z.string().nullable().optional(),
  encrypted: z.boolean().default(false),
  clientSource: z.enum(["desktop-sync"]).optional(),
});

export const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().nullable().optional(),
  isStarred: z.boolean().optional(),
  isTrashed: z.boolean().optional(),
});

export const folderCreateSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().nullable().optional(),
  clientSource: z.enum(["desktop-sync"]).optional(),
});

export const shareCreateSchema = z.object({
  resourceType: z.enum(["file", "folder"]),
  resourceId: z.string().min(1),
  permission: z.enum(["VIEW", "COMMENT", "EDIT"]),
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(8).max(128).optional(),
});

export const uploadCompleteSchema = z.object({
  fileId: z.string().min(1).nullable().optional(),
  storageKey: z.string().min(1).max(1024),
  name: z.string().min(1).max(255),
  size: z.coerce.number().int().nonnegative(),
  mimeType: z.string().min(1).max(255),
  checksum: z.string().min(32).max(128),
  folderId: z.string().nullable().optional(),
  clientSource: z.enum(["desktop-sync"]).optional(),
});
