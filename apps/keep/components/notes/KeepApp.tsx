'use client';

import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import type { SupabaseBrowserConfig } from '@/lib/supabase-client';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { NoteComposer } from './NoteComposer';
import { MasonryGrid } from './MasonryGrid';
import { NoteModal } from './NoteModal';
import { LabelManagerModal } from './LabelManagerModal';
import { TrashBanner } from './TrashBanner';
import { Note } from '@/types';

export default function KeepApp({ supabaseConfig }: { supabaseConfig: SupabaseBrowserConfig | null }) {
  const {
    authStatus,
    userEmail,
    isLoading,
    error,
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
    setThemeMode,
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
  } = useNotes(supabaseConfig);

  // Navigation sidebar responsive drawer states
  const [isSidebarExpandedDesktop, setIsSidebarExpandedDesktop] = useState(true);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Active note modal state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Label manager modal state
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);

  const handleSelectView = (view: typeof activeView, labelId: string | null = null) => {
    setActiveView(view);
    setSelectedLabelId(labelId);
  };

  const selectedLabelObj = labels.find((l) => l.id === selectedLabelId) ?? null;

  const emptyCopy =
    activeView === 'archive'
      ? { title: 'No archived notes', subtitle: 'Notes you archive show up here.' }
      : activeView === 'trash'
        ? { title: 'Trash is empty', subtitle: 'No notes in trash.' }
        : activeView === 'reminders'
          ? { title: 'No reminders', subtitle: 'Notes with reminders show up here.' }
          : { title: 'Notes you add appear here', subtitle: 'Click "Take a note..." to get started.' };

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500 dark:text-zinc-400">
        Loading Keep...
      </div>
    );
  }

  if (authStatus === 'unconfigured') {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500 dark:text-zinc-400">
        Supabase is not configured yet.
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500 dark:text-zinc-400">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        layoutMode={layoutMode}
        onToggleLayout={() => setLayoutMode(layoutMode === 'grid' ? 'list' : 'grid')}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
        onToggleSidebar={() => {
          setIsSidebarExpandedDesktop(!isSidebarExpandedDesktop);
          setIsSidebarOpenMobile(!isSidebarOpenMobile);
        }}
        onExportNotes={exportNotes}
        onImportNotes={importNotes}
        userEmail={userEmail}
        onSignOut={signOut}
      />

      {error && (
        <div className="max-w-7xl mx-auto mt-2 px-4">
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-4 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex w-full">
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          selectedLabelId={selectedLabelId}
          labels={labels}
          notesCount={notesCount}
          remindersCount={remindersCount}
          archiveCount={archiveCount}
          trashCount={trashCount}
          onSelectView={handleSelectView}
          onOpenLabelManager={() => setIsLabelManagerOpen(true)}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
          isExpandedDesktop={isSidebarExpandedDesktop}
        />

        {/* Notes View Area */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden min-w-0">
          {/* Section Header Title if viewing a specific Label or Archive/Trash */}
          {activeView === 'label' && selectedLabelObj && (
            <div className="max-w-7xl mx-auto mb-6 flex items-center gap-2">
              <span className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
                {selectedLabelObj.name}
              </span>
            </div>
          )}

          {activeView === 'trash' && (
            <TrashBanner trashCount={trashCount} onEmptyTrash={emptyTrash} />
          )}

          {/* Note Composer (Only in Notes or Label view) */}
          {activeView !== 'archive' && activeView !== 'trash' && (
            <NoteComposer allLabels={labels} onAddNote={addNote} onCreateLabel={createLabel} />
          )}

          {/* Masonry Note Grid */}
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="flex justify-center py-24 text-sm text-zinc-400">Loading notes...</div>
            ) : (
              <MasonryGrid
                pinnedNotes={pinnedNotes}
                unpinnedNotes={unpinnedNotes}
                allLabels={labels}
                layoutMode={layoutMode}
                emptyTitle={emptyCopy.title}
                emptySubtitle={emptyCopy.subtitle}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
                onRestoreNote={restoreNote}
                onPermanentDelete={permanentDeleteNote}
                onDuplicateNote={duplicateNote}
                onCreateLabel={createLabel}
                onOpenModal={(note) => setSelectedNote(note)}
                onReorderNotes={reorderNotes}
              />
            )}
          </div>
        </main>
      </div>

      {/* Note Detail / Edit Modal */}
      <NoteModal
        note={selectedNote}
        isOpen={!!selectedNote}
        allLabels={labels}
        onClose={() => setSelectedNote(null)}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        onCreateLabel={createLabel}
      />

      {/* Label Manager Modal */}
      <LabelManagerModal
        labels={labels}
        isOpen={isLabelManagerOpen}
        onClose={() => setIsLabelManagerOpen(false)}
        onCreateLabel={createLabel}
        onRenameLabel={renameLabel}
        onDeleteLabel={deleteLabel}
      />
    </div>
  );
}
