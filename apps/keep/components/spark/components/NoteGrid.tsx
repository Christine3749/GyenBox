import React from "react";
import { Note, ViewMode } from "../types";
import { NoteCard } from "./NoteCard";
import { Pin, Inbox } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface NoteGridProps {
  notes: Note[];
  viewMode: ViewMode;
  onSelectNote: (note: Note) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onToggleArchive: (id: string, e: React.MouseEvent) => void;
  onTrashNote: (id: string, e: React.MouseEvent) => void;
  onRestoreNote?: (id: string, e: React.MouseEvent) => void;
  onDeleteForever?: (id: string, e: React.MouseEvent) => void;
  onToggleCheckItem: (
    noteId: string,
    itemId: string,
    completed: boolean,
    e: React.MouseEvent
  ) => void;
  searchQuery?: string;
  navTitle?: string;
}

const NoteGridView: React.FC<NoteGridProps> = ({
  notes,
  viewMode,
  onSelectNote,
  onTogglePin,
  onToggleArchive,
  onTrashNote,
  onRestoreNote,
  onDeleteForever,
  onToggleCheckItem,
  searchQuery,
  navTitle,
}) => {
  const { t } = useLanguage();
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const otherNotes = notes.filter((n) => !n.isPinned);

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
          {t.noNotesHere}
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-sm">
          {searchQuery
            ? t.noNotesSearchMatch
            : t.noNotesInstruction}
        </p>
      </div>
    );
  }

  const gridLayoutClasses =
    viewMode === "grid"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      : "flex flex-col gap-3 max-w-3xl mx-auto";

  return (
    <div className="space-y-8 pb-16">
      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
            <Pin className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.pinnedSectionHeader.replace("{count}", String(pinnedNotes.length))}</span>
          </div>

          <div className={gridLayoutClasses}>
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                viewMode={viewMode}
                onSelectNote={onSelectNote}
                onTogglePin={onTogglePin}
                onToggleArchive={onToggleArchive}
                onTrashNote={onTrashNote}
                onRestoreNote={onRestoreNote}
                onDeleteForever={onDeleteForever}
                onToggleCheckItem={onToggleCheckItem}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Notes Section */}
      {otherNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
              <span>{t.otherNotesSectionHeader.replace("{count}", String(otherNotes.length))}</span>
            </div>
          )}

          <div className={gridLayoutClasses}>
            {otherNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                viewMode={viewMode}
                onSelectNote={onSelectNote}
                onTogglePin={onTogglePin}
                onToggleArchive={onToggleArchive}
                onTrashNote={onTrashNote}
                onRestoreNote={onRestoreNote}
                onDeleteForever={onDeleteForever}
                onToggleCheckItem={onToggleCheckItem}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Opening a modal, changing a header setting, or receiving unrelated UI state
// must not remap the visible card collection. The cards already have their own
// comparator; memoizing the grid keeps the parent shell equally quiet.
export const NoteGrid = React.memo(NoteGridView);

