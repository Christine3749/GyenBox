'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle } from 'lucide-react';
import type { Note as KeepNote, NoteColor as KeepColor } from '@/types';
import type { SupabaseBrowserConfig } from '@/lib/supabase-client';
import { useNotes } from '@/hooks/useNotes';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import type { MergeRecommendation, NavFilter, Note as SparkNote, NoteColorId, ViewMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { QuickCreateBar } from './components/QuickCreateBar';
import { NoteGrid } from './components/NoteGrid';
import { AiOverviewBanner } from './components/AiOverviewBanner';
import { AiProvider, useAi } from './context/AiContext';
import { colorForCategory } from './category-colors';

// These are only opened after the workspace is interactive. Splitting them
// keeps their editors, icon sets, and AI/media UI off the initial JS payload.
const NoteEditorModal = dynamic(() => import('./components/NoteEditorModal').then((module) => module.NoteEditorModal), { ssr: false });
const EditLabelsModal = dynamic(() => import('./components/EditLabelsModal').then((module) => module.EditLabelsModal), { ssr: false });
const MergeModal = dynamic(() => import('./components/MergeModal').then((module) => module.MergeModal), { ssr: false });
const VoiceModal = dynamic(() => import('./components/VoiceModal').then((module) => module.VoiceModal), { ssr: false });
const OcrModal = dynamic(() => import('./components/OcrModal').then((module) => module.OcrModal), { ssr: false });
const AiSettingsModal = dynamic(() => import('./components/AiSettingsModal').then((module) => module.AiSettingsModal), { ssr: false });

const keepToSparkColor: Record<KeepColor, NoteColorId> = {
  default: 'default', red: 'rose', orange: 'apricot', yellow: 'amber', green: 'sage',
  teal: 'mint', blue: 'slate', purple: 'lavender', pink: 'blush', brown: 'sand', gray: 'default',
};

const sparkToKeepColor: Record<NoteColorId, KeepColor> = {
  default: 'default', rose: 'pink', apricot: 'orange', amber: 'yellow', sage: 'green',
  mint: 'teal', slate: 'blue', lavender: 'purple', sand: 'brown', blush: 'pink',
};

// The cache may hold a hundred notes, but mounting one hundred interactive
// cards (and their image decoders) makes the first frame feel heavy.
const INITIAL_RENDERED_NOTES = 24;
const RENDERED_NOTE_CHUNK = 24;

function NotePreviewFrame({ language, viewMode }: { language: 'zh' | 'en'; viewMode: ViewMode }) {
  const cards = viewMode === 'grid' ? ["h-40", "h-52", "h-44", "h-48"] : ["h-28", "h-32", "h-24"];
  const layout = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    : 'flex flex-col gap-3 max-w-3xl mx-auto';

  return (
    <section aria-busy="true" aria-live="polite" className="space-y-4 pb-16">
      <div role="status" className="flex items-center gap-2 px-1 text-xs font-medium text-slate-400 dark:text-zinc-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        {language === 'zh' ? '正在同步便签…' : 'Syncing notes…'}
      </div>
      <div className={layout} aria-hidden="true">
        {cards.map((height, index) => (
          <div key={index} className={`${height} animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900`}>
            <div className={`h-3 rounded-full bg-slate-100 dark:bg-zinc-800 ${index % 2 === 0 ? 'w-3/5' : 'w-2/5'}`} />
            <div className="mt-4 space-y-2">
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800" />
              <div className="h-2.5 w-5/6 rounded-full bg-slate-100 dark:bg-zinc-800" />
              <div className="h-2.5 w-2/3 rounded-full bg-slate-100 dark:bg-zinc-800" />
            </div>
            <div className="mt-auto flex gap-2 pt-8">
              <div className="h-5 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/50" />
              <div className="h-5 w-10 rounded-full bg-slate-100 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function toSparkNote(note: KeepNote, labelsById: Map<string, string>): SparkNote {
  const labels = note.labels.map((id) => labelsById.get(id)).filter((name): name is string => Boolean(name));
  const hasUncategorisedSyncColour = note.source === 'gy-clipboard' && ['default', 'blue', 'gray'].includes(note.color);
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    type: note.type === 'checklist' ? 'list' : 'text',
    items: note.items ?? [],
    color: hasUncategorisedSyncColour ? colorForCategory({ id: note.id, title: note.title, content: note.content, labels }) : keepToSparkColor[note.color],
    isPinned: note.isPinned,
    isArchived: note.isArchived,
    isTrashed: note.isTrashed,
    labels,
    reminder: note.reminder ? { date: note.reminder } : undefined,
    imageUrl: note.image?.url,
    createdAt: new Date(note.createdAt).toISOString(),
    updatedAt: new Date(note.updatedAt).toISOString(),
  };
}

function SparkKeepWorkspace({ supabaseConfig }: { supabaseConfig?: SupabaseBrowserConfig | null }) {
  const keep = useNotes(supabaseConfig);
  const ai = useAi();
  const { language, t } = useLanguage();
  const [navFilter, setNavFilter] = useState<NavFilter>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSemanticSearch, setIsSemanticSearch] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  // AI cleanup can inspect the whole library. Keep that non-essential work off
  // the initial notes frame; the header control opens it when the user asks.
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SparkNote | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showEditLabelsModal, setShowEditLabelsModal] = useState(false);
  const [activeMergeRec, setActiveMergeRec] = useState<MergeRecommendation | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [semanticMatches, setSemanticMatches] = useState<Map<string, string>>(new Map());
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isRestoringDefaultLabels, setIsRestoringDefaultLabels] = useState(false);
  const [renderedNoteLimit, setRenderedNoteLimit] = useState(INITIAL_RENDERED_NOTES);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const labelsById = useMemo(() => new Map(keep.labels.map((label) => [label.id, label.name])), [keep.labels]);
  const labelIdsByName = useMemo(() => new Map(keep.labels.map((label) => [label.name, label.id])), [keep.labels]);
  const sparkNotes = useMemo(() => keep.notes.map((note) => toSparkNote(note, labelsById)), [keep.notes, labelsById]);
  const labelNames = useMemo(() => keep.labels.map((label) => label.name), [keep.labels]);

  const restoreDefaultLabels = async () => {
    if (isRestoringDefaultLabels || keep.labels.length > 0) return;
    setIsRestoringDefaultLabels(true);
    try {
      await keep.restoreDefaultLabels(t.defaultLabels);
    } finally {
      setIsRestoringDefaultLabels(false);
    }
  };

  const visibleNotes = useMemo(() => {
    let result = sparkNotes;
    if (navFilter === 'notes') result = result.filter((note) => !note.isArchived && !note.isTrashed);
    else if (navFilter === 'reminders') result = result.filter((note) => !note.isTrashed && Boolean(note.reminder?.date));
    else if (navFilter === 'archive') result = result.filter((note) => note.isArchived && !note.isTrashed);
    else if (navFilter === 'trash') result = result.filter((note) => note.isTrashed);
    else result = result.filter((note) => !note.isArchived && !note.isTrashed && note.labels.includes(navFilter));

    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;
    if (isSemanticSearch && semanticMatches.size > 0) return result.filter((note) => semanticMatches.has(note.id)).map((note) => ({ ...note, matchedExplanation: semanticMatches.get(note.id) }));
    return result.filter((note) => [note.title, note.content, ...note.labels, ...note.items.map((item) => item.text)]
      .join(' ').toLowerCase().includes(query));
  }, [sparkNotes, navFilter, searchQuery, isSemanticSearch, semanticMatches]);

  // Rendering hundreds of full interactive cards at once makes an otherwise
  // quick API response feel frozen. All data stays loaded for search/sync;
  // the screen grows in deliberate chunks.
  useEffect(() => {
    setRenderedNoteLimit(INITIAL_RENDERED_NOTES);
  }, [navFilter, searchQuery]);

  const renderedNotes = useMemo(
    () => visibleNotes.slice(0, renderedNoteLimit),
    [visibleNotes, renderedNoteLimit],
  );

  // Grow the DOM only as the reader approaches the end of the visible cards.
  // New cards arrive below the viewport, so the current page never jumps.
  useEffect(() => {
    if (visibleNotes.length <= renderedNoteLimit) return;
    const target = loadMoreSentinelRef.current;
    if (!target || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setRenderedNoteLimit((current) => Math.min(current + RENDERED_NOTE_CHUNK, visibleNotes.length));
      }
    }, { rootMargin: '700px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [renderedNoteLimit, visibleNotes.length]);

  const runSemanticSearch = async () => {
    if (!searchQuery.trim() || !ai.configured) return;
    setIsAiSearching(true);
    try {
      const response = await ai.request<{ results?: Array<{ id: string; whyMatch: string }> }>('semantic-search', { query: searchQuery, notes: sparkNotes, language });
      setSemanticMatches(new Map((response.results ?? []).filter((item) => item.id && item.whyMatch).map((item) => [item.id, item.whyMatch])));
    } catch {
      setSemanticMatches(new Map());
    } finally {
      setIsAiSearching(false);
    }
  };

  const notesCount = useMemo(() => keep.notes.filter((note) => !note.isArchived && !note.isTrashed).length, [keep.notes]);
  const remindersCount = useMemo(() => keep.notes.filter((note) => !note.isTrashed && Boolean(note.reminder)).length, [keep.notes]);
  const archiveCount = useMemo(() => keep.notes.filter((note) => note.isArchived && !note.isTrashed).length, [keep.notes]);
  const trashCount = useMemo(() => keep.notes.filter((note) => note.isTrashed).length, [keep.notes]);

  const addSparkNote = (draft: Pick<SparkNote, 'title' | 'content' | 'type' | 'items' | 'color' | 'isPinned' | 'labels' | 'reminder'>) => {
    void keep.addNote({
      title: draft.title,
      content: draft.content,
      type: draft.type === 'list' ? 'checklist' : 'text',
      items: draft.items,
      color: sparkToKeepColor[draft.color],
      isPinned: draft.isPinned,
      isArchived: false,
      isTrashed: false,
      labels: draft.labels.map((name) => labelIdsByName.get(name)).filter((id): id is string => Boolean(id)),
      reminder: draft.reminder?.date ?? null,
    });
  };

  const saveSparkNote = async (note: SparkNote) => {
    const current = keep.notes.find((item) => item.id === note.id);
    if (!current) return false;
    return keep.updateNote({
      ...current,
      title: note.title,
      content: note.content,
      type: note.type === 'list' ? 'checklist' : 'text',
      items: note.items,
      color: sparkToKeepColor[note.color],
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      labels: note.labels.map((name) => labelIdsByName.get(name)).filter((id): id is string => Boolean(id)),
      reminder: note.reminder?.date ?? null,
    });
  };

  const updateOne = (id: string, update: (note: SparkNote) => SparkNote) => {
    const target = sparkNotes.find((note) => note.id === id);
    if (target) saveSparkNote(update(target));
  };

  const toggleChecklist = (noteId: string, itemId: string, completed: boolean) => {
    updateOne(noteId, (note) => ({ ...note, items: note.items.map((item) => item.id === itemId ? { ...item, completed } : item) }));
  };

  const handleMerge = (noteIdA: string, noteIdB: string, title: string, content: string) => {
    const source = sparkNotes.find((note) => note.id === noteIdA);
    addSparkNote({ title, content, type: 'text', items: [], color: source?.color ?? 'amber', isPinned: false, labels: source?.labels ?? [], reminder: undefined });
    keep.deleteNote(noteIdA);
    keep.deleteNote(noteIdB);
    setActiveMergeRec(null);
  };

  if (keep.authStatus === 'loading') {
    return <div className="min-h-screen bg-[#F4F4F5] dark:bg-zinc-950 grid place-items-center text-sm text-zinc-500">Signing in…</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/20">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSemanticSearch={isSemanticSearch}
        setIsSemanticSearch={setIsSemanticSearch}
        isSearching={isAiSearching}
        onTriggerSemanticSearch={runSemanticSearch}
        viewMode={viewMode}
        setViewMode={setViewMode}
        darkMode={keep.themeMode === 'dark'}
        setDarkMode={(darkMode) => keep.setThemeMode(darkMode ? 'dark' : 'light')}
        showAiBanner={showAiBanner}
        setShowAiBanner={setShowAiBanner}
        aiRecommendationCount={0}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onOpenAiSettings={() => setShowAiSettings(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          navFilter={navFilter}
          setNavFilter={setNavFilter}
          labels={labelNames}
          onOpenEditLabels={() => setShowEditLabelsModal(true)}
          onRestoreDefaultLabels={() => { void restoreDefaultLabels(); }}
          isRestoringDefaultLabels={isRestoringDefaultLabels}
          notesCount={notesCount}
          remindersCount={remindersCount}
          archiveCount={archiveCount}
          trashCount={trashCount}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6">
          {keep.error && <div className="max-w-3xl mx-auto mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-3"><span>{keep.error}</span><button type="button" onClick={keep.refreshNotes} className="shrink-0 font-semibold underline">Retry</button></div>}
          {showAiBanner && navFilter === 'notes' && !searchQuery && (
            <AiOverviewBanner
              notes={sparkNotes}
              onOpenMergeModal={setActiveMergeRec}
              onArchiveStaleNotes={(ids) => ids.forEach((id) => updateOne(id, (note) => ({ ...note, isArchived: true, isPinned: false })))}
              onCloseBanner={() => setShowAiBanner(false)}
            />
          )}
          {navFilter === 'notes' && !searchQuery && (
            <QuickCreateBar
              onAddNote={addSparkNote}
              onOpenVoiceModal={() => setShowVoiceModal(true)}
              onOpenOcrModal={() => setShowOcrModal(true)}
              existingLabels={labelNames}
            />
          )}
          {navFilter === 'trash' && (
            <div className="max-w-2xl mx-auto my-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /><span>{t.trashNotice}</span></div>
              {trashCount > 0 && <button onClick={keep.emptyTrash} className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700">{t.emptyTrashBtn}</button>}
            </div>
          )}
          {searchQuery && <div className="max-w-7xl mx-auto my-2 px-2 flex items-center justify-between text-xs text-zinc-500"><span>{t.searchConditionPrefix} <strong className="text-zinc-800 dark:text-zinc-200">“{searchQuery}”</strong> ({isSemanticSearch ? t.semanticSearchModeSuffix : t.keywordSearchModeSuffix})</span><button onClick={() => setSearchQuery('')} className="hover:underline text-indigo-600 dark:text-indigo-400 font-medium">{t.clearSearchBtn}</button></div>}
          <div className="max-w-7xl mx-auto mt-4">
            {keep.isLoading ? (
              <NotePreviewFrame language={language} viewMode={viewMode} />
            ) : (
              <NoteGrid
                notes={renderedNotes}
                viewMode={viewMode}
                onSelectNote={setEditingNote}
                onTogglePin={(id) => updateOne(id, (note) => ({ ...note, isPinned: !note.isPinned }))}
                onToggleArchive={(id) => updateOne(id, (note) => ({ ...note, isArchived: !note.isArchived, isPinned: false }))}
                onTrashNote={(id) => keep.deleteNote(id)}
                onRestoreNote={(id) => keep.restoreNote(id)}
                onDeleteForever={(id) => keep.permanentDeleteNote(id)}
                onToggleCheckItem={(noteId, itemId, completed) => toggleChecklist(noteId, itemId, completed)}
                searchQuery={searchQuery}
              />
            )}
            {visibleNotes.length > renderedNotes.length && !keep.isLoading && (
              <div ref={loadMoreSentinelRef} className="h-px" aria-hidden="true" />
            )}
          </div>
        </main>
      </div>

      {editingNote && <NoteEditorModal note={editingNote} onSave={saveSparkNote} onClose={() => setEditingNote(null)} onTrash={(id) => { keep.deleteNote(id); setEditingNote(null); }} allNotes={sparkNotes} allLabels={labelNames} onSelectRelatedNote={setEditingNote} />}
      {showVoiceModal && <VoiceModal onAddNote={addSparkNote} onClose={() => setShowVoiceModal(false)} />}
      {showOcrModal && <OcrModal onAddNote={addSparkNote} onClose={() => setShowOcrModal(false)} />}
      {showEditLabelsModal && <EditLabelsModal labels={labelNames} onAddLabel={(name) => { void keep.createLabel(name); }} onDeleteLabel={(name) => { const id = labelIdsByName.get(name); if (id) void keep.deleteLabel(id); }} onClose={() => setShowEditLabelsModal(false)} />}
      {activeMergeRec && <MergeModal recommendation={activeMergeRec} allNotes={sparkNotes} onConfirmMerge={handleMerge} onClose={() => setActiveMergeRec(null)} />}
      {showAiSettings && <AiSettingsModal onClose={() => setShowAiSettings(false)} />}
    </div>
  );
}

export default function SparkKeepApp({ supabaseConfig }: { supabaseConfig?: SupabaseBrowserConfig | null }) {
  return <LanguageProvider><AiProvider><SparkKeepWorkspace supabaseConfig={supabaseConfig} /></AiProvider></LanguageProvider>;
}
