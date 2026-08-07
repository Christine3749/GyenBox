'use client';

import { useState, useEffect, useMemo, useCallback, ChangeEvent } from 'react';
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

export type AuthStatus = 'loading' | 'ready' | 'unauthenticated' | 'unconfigured';
type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { message?: string } };

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

export function useNotes(supabaseConfig?: SupabaseBrowserConfig | null) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      return;
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthStatus(data.session ? 'ready' : 'unauthenticated');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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

  const loadNotes = useCallback(async (silent = false) => {
    if (!session) return;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await readApi<{ notes: Note[]; labels: Label[] }>(
        await fetch('/api/notes', { headers: authHeaders() }),
      );
      setNotes(data.notes);
      setLabels(data.labels);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Could not load notes');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [authHeaders, session]);

  useEffect(() => {
    if (session) void loadNotes();
  }, [session, loadNotes]);

  // GY Input can create a note without this browser being open.  A short
  // refresh makes a copied item appear in the main Keep stream promptly while
  // keeping the transport intentionally simple for the first cross-device cut.
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => void loadNotes(true), 5000);
    return () => window.clearInterval(timer);
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
      const withTimestamp = { ...updatedNote, updatedAt: Date.now() };
      setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? withTimestamp : n)));

      try {
        await fetch(`/api/notes/${updatedNote.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(withTimestamp),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save note');
      }
    },
    [authHeaders],
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
      setNotes((prev) => prev.filter((n) => n.id !== id));
      try {
        await fetch(`/api/notes/${id}`, { method: 'DELETE', headers: authHeaders() });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete note');
      }
    },
    [authHeaders],
  );

  const emptyTrash = useCallback(async () => {
    setNotes((prev) => prev.filter((n) => !n.isTrashed));
    try {
      await fetch('/api/notes/trash', { method: 'DELETE', headers: authHeaders() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not empty trash');
    }
  }, [authHeaders]);

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
      setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, name: newName } : l)));
      try {
        await fetch(`/api/labels/${id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ name: newName }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not rename label');
      }
    },
    [authHeaders],
  );

  const deleteLabel = useCallback(
    async (id: string) => {
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setNotes((prev) => prev.map((n) => ({ ...n, labels: n.labels.filter((lblId) => lblId !== id) })));
      if (selectedLabelId === id) {
        setSelectedLabelId(null);
        setActiveView('notes');
      }
      try {
        await fetch(`/api/labels/${id}`, { method: 'DELETE', headers: authHeaders() });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete label');
      }
    },
    [authHeaders, selectedLabelId],
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
        }).catch((err) => setError(err instanceof Error ? err.message : 'Could not reorder notes'));

        return reordered;
      });
    },
    [authHeaders],
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
      .sort((a, b) => (b.capturedAt ?? b.createdAt) - (a.capturedAt ?? a.createdAt));
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
    signOut,
  };
}
