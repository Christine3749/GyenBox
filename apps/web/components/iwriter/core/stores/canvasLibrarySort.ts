import type { FileEntry } from '../hooks/useFileSystem';

export const SORT_KEY = 'gyenbox_iwriter_library_sort';

export interface SortSettings {
  foldersOnTop: boolean;
  sortBy: 'date' | 'name';
  newestOnTop: boolean;
}

const DEFAULT_SORT: SortSettings = { foldersOnTop: true, sortBy: 'date', newestOnTop: true };

export function loadSort(): SortSettings {
  try { return { ...DEFAULT_SORT, ...JSON.parse(localStorage.getItem(SORT_KEY) ?? '{}') }; }
  catch { return DEFAULT_SORT; }
}

export function sortFiles(files: FileEntry[], s: SortSettings): FileEntry[] {
  const sortFn = (a: FileEntry, b: FileEntry): number => {
    if (s.sortBy === 'name') {
      const na = a.name.replace(/\.[^.]+$/, '');
      const nb = b.name.replace(/\.[^.]+$/, '');
      const cmp = na.localeCompare(nb);
      return s.newestOnTop ? -cmp : cmp;
    }
    const diff = (b.lastModified ?? 0) - (a.lastModified ?? 0);
    return s.newestOnTop ? diff : -diff;
  };
  if (s.foldersOnTop) {
    const dirs = files.filter(f => f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
    const docs = files.filter(f => !f.isDirectory).sort(sortFn);
    return [...dirs, ...docs];
  }
  return [...files].sort(sortFn);
}
