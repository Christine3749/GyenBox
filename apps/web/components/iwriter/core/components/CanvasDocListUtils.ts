import { fsAdapter } from '../hooks/useFileSystem';
import type { FileEntry } from '../hooks/useFileSystem';
import { DocIcon, DrawIcon, NodeIcon, ImageIcon } from '../gsyen-designer';

export const SKEL_WIDTHS = ['72%', '58%', '80%', '64%', '50%'];

const MAX_CACHE = 40;
export const prefetchCache = new Map<string, string>();
export const MEDIA_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg|docx|xlsx|pptx|pdf)$/i;
const IMG_RE   = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

export function prefetchFile(file: FileEntry) {
  if (!file.path || prefetchCache.has(file.path) || MEDIA_RE.test(file.name)) return;
  if (prefetchCache.size >= MAX_CACHE) prefetchCache.delete(prefetchCache.keys().next().value!);
  fsAdapter.readFile(file).then(text => prefetchCache.set(file.path!, text)).catch(() => {});
}

export function invalidatePrefetch(path: string) { prefetchCache.delete(path); }

export function relativeDate(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  return diff < 86_400_000 ? 'Today' : diff < 172_800_000 ? 'Yesterday'
    : new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fileIcon(name: string) {
  if (/\.excalidraw$/i.test(name)) return DrawIcon;
  if (/\.canvas$/i.test(name))     return NodeIcon;
  return IMG_RE.test(name) ? ImageIcon : DocIcon;
}
