'use client';

import { useState, useEffect, useMemo, useCallback, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { Note, Label, ViewMode, LayoutMode, ThemeMode } from '@/types';
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  setSupabaseBrowserConfig,
  type SupabaseBrowserConfig,
} from '@/lib/supabase-client';

const THEME_STORAGE_KEY = 'keep_notes_theme_v1';
const NOTES_PREVIEW_CACHE_PREFIX = 'keep_notes_preview_v1:';
const NOTES_PREVIEW_CACHE_LIMIT = 100;

export type AuthStatus = 'loading' | 'ready' | 'unauthenticated' | 'unconfigured';
type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { message?: string } };
const NOTES_REQUEST_TIMEOUT_MS = 15_000;
const NOTES_BACKGROUND_REFRESH_MS = 60_000;
// A tab-scoped preview keeps the last successful first page ready for the next
// reload. Match that preview size so the background response replaces it
// smoothly instead of shrinking the visible grid during refresh.
const NOTES_INITIAL_PAGE_SIZE = NOTES_PREVIEW_CACHE_LIMIT;
const NOTES_HYDRATION_PAGE_SIZE = 120;
type NotesPage = { notes: Note[]; labels: Label[]; nextOffset: number | null };
type NotesPreview = Pick<NotesPage, 'notes' | 'labels'>;

// Avoid serialising an entire library on each background refresh.  For notes,
// updatedAt is the server's change marker; labels have a stable id/name pair.
function sameNotes(current: Note[], next: Note[]) {
  return current.length === next.length && current.every((note, index) => note.id === next[index]?.id && note.updatedAt === next[index]?.updatedAt);
}

function sameLabels(current: Label[], next: Label[]) {
  return current.length === next.length && current.every((label, index) => label.id === next[index]?.id && label.name === next[index]?.name);
}

function mergeNotes(current: Note[], incoming: Note[]) {
  const merged = new Map(current.map((note) => [note.id, note]));
  for (const note of incoming) {
    const local = merged.get(note.id);
    // Keep an in-flight local edit rather than letting an earlier background
    // page overwrite it. The next conditional refresh reconciles the server.
    if (!local || local.updatedAt <= note.updatedAt) merged.set(note.id, note);
  }
  return [...merged.values()].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

async function readApi<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.ok || payload.data === undefined) {
    throw new Error(payload?.error?.message ?? 'Request failed');
  }
  return payload.data;
}

function tempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function notesPreviewKey(userId: string) {
  return `${NOTES_PREVIEW_CACHE_PREFIX}${userId}`;
}

function readNotesPreview(userId: string): NotesPreview | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(notesPreviewKey(userId)) ?? 'null') as Partial<NotesPreview> | null;
    if (!parsed || !Array.isArray(parsed.notes) || !Array.isArray(parsed.labels)) return null;
    return { notes: parsed.notes.slice(0, NOTES_PREVIEW_CACHE_LIMIT) as Note[], labels: parsed.labels as Label[] };
  } catch {
    return null;
  }
}

function writeNotesPreview(userId: string, notes: Note[], labels: Label[]) {
  try {
    sessionStorage.setItem(notesPreviewKey(userId), JSON.stringify({ notes: notes.slice(0, NOTES_PREVIEW_CACHE_LIMIT), labels }));
  } catch {
    // A full sessionStorage quota should never prevent note synchronization.
  }
}

export function useNotes(supabaseConfig?: SupabaseBrowserConfig | null) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notesEtagRef = useRef<string | null>(null);
  const notesRequestRef = useRef<Promise<void> | null>(null);
  const notesHydrationRef = useRef<Promise<void> | null>(null);
  const previewLoadedForUserRef = useRef<string | null>(null);

  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [activeView, setActiveView] = useState<ViewMode>('notes');
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');

  const authHeaders = useCallback((): HeadersInit | undefined => {
    if (!session) return undefined;
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  }, [session]);

  // Resolve/track the Supabase session (device-independent identity).
  useEffect(() => {
    setSupabaseBrowserConfig(supabaseConfig ?? null);

    if (!hasSupabaseBrowserConfig()) {
      setAuthStatus('unconfigured');
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession()
      .then(({ data }) => {
        notesEtagRef.current = null;
        setSession(data.session);
        setAuthStatus(data.session ? 'ready' : 'unauthenticated');
      })
      .catch(() => {
        setSession(null);
        setAuthStatus('unauthenticated');
        setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      notesEtagRef.current = null;
      setSession(nextSession);
      setAuthStatus(nextSession ? 'ready' : 'unauthenticated');
    });

    return () => listener.subscription.unsubscribe();
  }, [supabaseConfig]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.replace('/login');
  }, [authStatus, router]);

  // Theme preference is device-local UI state, not synced note data.
  useEffect(() => {
    let initial: ThemeMode = 'light';
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') initial = saved as ThemeMode;
      else initial = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      // ignore
    }
    setThemeModeState(initial);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // ignore
    }
  }, [themeMode]);

  const hydrateRemainingPages = useCallback(async (initialOffset: number | null) => {
    if (!session || initialOffset === null || notesHydrationRef.current) return notesHydrationRef.current;

    const request = (async () => {
      let offset: number | null = initialOffset;
      while (offset !== null) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), NOTES_REQUEST_TIMEOUT_MS);
        try {
          const response: Response = await fetch(`/api/notes?offset=${offset}&limit=${NOTES_HYDRATION_PAGE_SIZE}`, {
            headers: authHeaders(),
            signal: controller.signal,
          });
          const page: NotesPage = await readApi<NotesPage>(response);
          const etag = response.headers.get('ETag');
          if (etag) notesEtagRef.current = etag;
          setNotes((current) => mergeNotes(current, page.notes));
          offset = page.nextOffset;
        } finally {
          window.clearTimeout(timeout);
        }
      }
    })();
    notesHydrationRef.current = request;
    try {
      await request;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish loading notes');
    } finally {
      if (notesHydrationRef.current === request) notesHydrationRef.current = null;
    }
  }, [authHeaders, session]);

  const loadNotes = useCallback(async (silent = false) => {
    if (!session) return;
    // A focus event and the scheduled refresh can fire together.  Never make
    // two identical full-library requests for one account at the same time.
    if (notesRequestRef.current) return notesRequestRef.current;

    const request = (async () => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
        if (previewLoadedForUserRef.current !== session.user.id) {
          previewLoadedForUserRef.current = session.user.id;
          const preview = readNotesPreview(session.user.id);
          setNotes(preview?.notes ?? []);
          setLabels(preview?.labels ?? []);
          // The preview is already a complete, previous-success frame. Keep
          // it visible while the network quietly validates fresh data.
          if (preview) setIsLoading(false);
        }
      }
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), NOTES_REQUEST_TIMEOUT_MS);
        try {
          const headers = new Headers(authHeaders());
          const shouldRefreshFullLibrary = Boolean(notesEtagRef.current);
          if (notesEtagRef.current) headers.set('If-None-Match', notesEtagRef.current);
          const url = shouldRefreshFullLibrary
            ? '/api/notes'
            : `/api/notes?offset=0&limit=${NOTES_INITIAL_PAGE_SIZE}`;
          const response = await fetch(url, { headers, signal: controller.signal });
          if (response.status === 304) return;
          const data = await readApi<{ notes: Note[]; labels: Label[] } | NotesPage>(response);
          notesEtagRef.current = response.headers.get('ETag') ?? null;
          setNotes((current) => sameNotes(current, data.notes) ? current : data.notes);
          setLabels((current) => sameLabels(current, data.labels) ? current : data.labels);
          writeNotesPreview(session.user.id, data.notes, data.labels);
          if ('nextOffset' in data && data.nextOffset !== null) void hydrateRemainingPages(data.nextOffset);
        } finally {
          window.clearTimeout(timeout);
        }
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Could not load notes');
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    })();
    notesRequestRef.current = request;
    try {
      await request;
    } finally {
      if (notesRequestRef.current === request) notesRequestRef.current = null;
    }
  }, [authHeaders, hydrateRemainingPages, session]);

  useEffect(() => {
    if (session) void loadNotes();
  }, [session, loadNotes]);

  // A full note library can be hundreds of KB. Refresh it only while the tab
  // is visible and at a humane cadence; focus still gets a fresh view quickly.
  useEffect(() => {
    if (!session) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadNotes(true);
    };
    const timer = window.setInterval(refreshWhenVisible, NOTES_BACKGROUND_REFRESH_MS);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [session, loadNotes]);

  // CRUD actions
  const addNote = useCallback(
    async (newNoteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
      const optimistic: Note = {
        ...newNoteData,
        id: tempId('note'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: notes.length,
      };
      setNotes((prev) => [optimistic, ...prev]);

      try {
        const created = await readApi<Note>(
          await fetch('/api/notes', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(newNoteData),
          }),
        );
        setNotes((prev) => prev.map((n) => (n.id === optimistic.id ? created : n)));
      } catch (err) {
        setNotes((prev) => prev.filter((n) => n.id !== optimistic.id));
        setError(err instanceof Error ? err.message : 'Could not create note');
      }
    },
    [authHeaders, notes.length],
  );

  const updateNote = useCallback(
    async (updatedNote: Note) => {
      const previous = updatedNote;
      const withTimestamp = { ...updatedNote, updatedAt: Date.now() };
      setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? withTimestamp : n)));

      try {
        const saved = await readApi<Note>(await fetch(`/api/notes/${updatedNote.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ ...updatedNote, baseUpdatedAt: updatedNote.updatedAt }),
        }));
        setNotes((prev) => prev.map((note) => (note.id === saved.id ? saved : note)));
        return true;
      } catch (err) {
        setNotes((prev) => prev.map((note) => (
          note.id === previous.id && note.updatedAt === withTimestamp.updatedAt ? previous : note
        )));
        const message = err instanceof Error ? err.message : 'Could not save note';
        setError(message);
        if (message.includes('changed on another device')) void loadNotes(true);
        return false;
      }
    },
    [authHeaders, loadNotes],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      void updateNote({ ...note, isTrashed: true, isPinned: false, trashedAt: Date.now() });
    },
    [notes, updateNote],
  );

  const restoreNote = useCallback(
    (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      void updateNote({ ...note, isTrashed: false, trashedAt: undefined });
    },
    [notes, updateNote],
  );

  const permanentDeleteNote = useCallback(
    async (id: string) => {
      const removed = notes.find((note) => note.id === id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      try {
        await readApi<{ id: string }>(await fetch(`/api/notes/${id}`, { method: 'DELETE', headers: authHeaders() }));
      } catch (err) {
        if (removed) setNotes((prev) => [...prev, removed].sort((a, b) => a.order - b.order));
        setError(err instanceof Error ? err.message : 'Could not delete note');
      }
    },
    [authHeaders, notes],
  );

  const emptyTrash = useCallback(async () => {
    const removed = notes.filter((note) => note.isTrashed);
    setNotes((prev) => prev.filter((n) => !n.isTrashed));
    try {
      await readApi<unknown>(await fetch('/api/notes/trash', { method: 'DELETE', headers: authHeaders() }));
    } catch (err) {
      if (removed.length) setNotes((prev) => [...prev, ...removed].sort((a, b) => a.order - b.order));
      setError(err instanceof Error ? err.message : 'Could not empty trash');
    }
  }, [authHeaders, notes]);

  const duplicateNote = useCallback(
    (note: Note) => {
      void addNote({
        title: `${note.title} (Copy)`,
        content: note.content,
        type: note.type,
        items: note.items,
        color: note.color,
        isPinned: note.isPinned,
        isArchived: note.isArchived,
        isTrashed: false,
        labels: note.labels,
        reminder: note.reminder,
      });
    },
    [addNote],
  );

  // Label management
  const createLabel = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const exists = labels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) return;

      const optimistic: Label = { id: tempId('label'), name: trimmed };
      setLabels((prev) => [...prev, optimistic]);

      try {
        const created = await readApi<Label>(
          await fetch('/api/labels', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ name: trimmed }),
          }),
        );
        setLabels((prev) => prev.map((l) => (l.id === optimistic.id ? created : l)));
      } catch (err) {
        setLabels((prev) => prev.filter((l) => l.id !== optimistic.id));
        setError(err instanceof Error ? err.message : 'Could not create label');
      }
    },
    [authHeaders, labels],
  );

  const renameLabel = useCallback(
    async (id: string, newName: string) => {
      const previous = labels.find((label) => label.id === id);
      setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, name: newName } : l)));
      try {
        const saved = await readApi<Label>(await fetch(`/api/labels/${id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ name: newName }),
        }));
        setLabels((prev) => prev.map((label) => label.id === saved.id ? saved : label));
      } catch (err) {
        if (previous) setLabels((prev) => prev.map((label) => label.id === id ? previous : label));
        setError(err instanceof Error ? err.message : 'Could not rename label');
      }
    },
    [authHeaders, labels],
  );

  const deleteLabel = useCallback(
    async (id: string) => {
      const previousLabel = labels.find((label) => label.id === id);
      const previousNotes = notes;
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setNotes((prev) => prev.map((n) => ({ ...n, labels: n.labels.filter((lblId) => lblId !== id) })));
      if (selectedLabelId === id) {
        setSelectedLabelId(null);
        setActiveView('notes');
      }
      try {
        await readApi<unknown>(await fetch(`/api/labels/${id}`, { method: 'DELETE', headers: authHeaders() }));
      } catch (err) {
        if (previousLabel) setLabels((prev) => [...prev, previousLabel]);
        setNotes(previousNotes);
        setError(err instanceof Error ? err.message : 'Could not delete label');
      }
    },
    [authHeaders, labels, notes, selectedLabelId],
  );

  // Drag & drop reordering
  const reorderNotes = useCallback(
    (draggedId: string, targetId: string) => {
      setNotes((prev) => {
        const copy = [...prev];
        const draggedIdx = copy.findIndex((n) => n.id === draggedId);
        const targetIdx = copy.findIndex((n) => n.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1) return prev;

        const [removed] = copy.splice(draggedIdx, 1);
        copy.splice(targetIdx, 0, removed);

        const reordered = copy.map((item, index) => ({ ...item, order: index }));
        void fetch('/api/notes/reorder', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ ids: reordered.map((n) => n.id) }),
        }).then((response) => readApi<unknown>(response)).catch((err) => {
          setError(err instanceof Error ? err.message : 'Could not reorder notes');
          void loadNotes(true);
        });

        return reordered;
      });
    },
    [authHeaders, loadNotes],
  );

  // Export / Import
  const exportNotes = useCallback(() => {
    const dataStr = JSON.stringify({ notes, labels }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keep-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [notes, labels]);

  const importNotes = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const data = await readApi<{ notes: Note[]; labels: Label[] }>(
            await fetch('/api/notes/import', {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({
                notes: Array.isArray(parsed.notes) ? parsed.notes : [],
                labels: Array.isArray(parsed.labels) ? parsed.labels : [],
              }),
            }),
          );
          setNotes(data.notes);
          setLabels(data.labels);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid backup file format.');
        }
      };
      reader.readAsText(file);
    },
    [authHeaders],
  );

  const signOut = useCallback(async () => {
    if (hasSupabaseBrowserConfig()) {
      await getSupabaseBrowserClient().auth.signOut();
    }
    router.replace('/login');
  }, [router]);

  // Filter & Search Logic
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (activeView === 'notes') {
        if (note.isTrashed || note.isArchived) return false;
      } else if (activeView === 'reminders') {
        if (note.isTrashed || note.isArchived || !note.reminder) return false;
      } else if (activeView === 'archive') {
        if (note.isTrashed || !note.isArchived) return false;
      } else if (activeView === 'trash') {
        if (!note.isTrashed) return false;
      } else if (activeView === 'label') {
        if (note.isTrashed || note.isArchived) return false;
        if (selectedLabelId && !note.labels.includes(selectedLabelId)) return false;
      }

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(query);
        const matchesContent = note.content.toLowerCase().includes(query);
        const matchesChecklist = note.items?.some((i) => i.text.toLowerCase().includes(query));
        const matchesLabel = note.labels.some((lId) => {
          const lObj = labels.find((lbl) => lbl.id === lId);
          return lObj?.name.toLowerCase().includes(query);
        });

        if (!matchesTitle && !matchesContent && !matchesChecklist && !matchesLabel) {
          return false;
        }
      }

      return true;
    });
  }, [notes, activeView, selectedLabelId, searchQuery, labels]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => {
    const copied = filteredNotes
      .filter((n) => !n.isPinned && n.source === 'gy-clipboard')
      .sort((a, b) => {
        const left = a.syncSequence ?? '';
        const right = b.syncSequence ?? '';
        if (left || right) {
          if (left.length !== right.length) return right.length - left.length;
          if (left !== right) return right.localeCompare(left);
        }
        return (b.capturedAt ?? b.createdAt) - (a.capturedAt ?? a.createdAt);
      });
    const other = filteredNotes.filter((n) => !n.isPinned && n.source !== 'gy-clipboard');
    return [...copied, ...other];
  }, [filteredNotes]);

  const notesCount = notes.filter((n) => !n.isTrashed && !n.isArchived).length;
  const remindersCount = notes.filter((n) => !n.isTrashed && !n.isArchived && n.reminder).length;
  const archiveCount = notes.filter((n) => !n.isTrashed && n.isArchived).length;
  const trashCount = notes.filter((n) => n.isTrashed).length;

  return {
    authStatus,
    userEmail: session?.user.email ?? null,
    isLoading,
    error,
    notes,
    labels,
    themeMode,
    activeView,
    selectedLabelId,
    searchQuery,
    layoutMode,
    pinnedNotes,
    unpinnedNotes,
    notesCount,
    remindersCount,
    archiveCount,
    trashCount,
    setActiveView,
    setSelectedLabelId,
    setSearchQuery,
    setLayoutMode,
    setThemeMode: setThemeModeState,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    permanentDeleteNote,
    emptyTrash,
    duplicateNote,
    createLabel,
    renameLabel,
    deleteLabel,
    reorderNotes,
    exportNotes,
    importNotes,
    refreshNotes: () => loadNotes(false),
    signOut,
  };
}
