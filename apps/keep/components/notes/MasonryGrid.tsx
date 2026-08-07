"use client";

import React, { useState } from 'react';
import { Note, LayoutMode, Label } from '@/types';
import { NoteCard } from './NoteCard';
import { StickyNote } from 'lucide-react';

interface MasonryGridProps {
  pinnedNotes: Note[];
  unpinnedNotes: Note[];
  allLabels: Label[];
  layoutMode: LayoutMode;
  emptyTitle: string;
  emptySubtitle: string;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onCreateLabel: (name: string) => void;
  onOpenModal: (note: Note) => void;
  onReorderNotes?: (draggedId: string, targetId: string) => void;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  pinnedNotes,
  unpinnedNotes,
  allLabels,
  layoutMode,
  emptyTitle,
  emptySubtitle,
  onUpdateNote,
  onDeleteNote,
  onRestoreNote,
  onPermanentDelete,
  onDuplicateNote,
  onCreateLabel,
  onOpenModal,
  onReorderNotes,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId && onReorderNotes) {
      onReorderNotes(draggedId, targetId);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const hasNotes = pinnedNotes.length > 0 || unpinnedNotes.length > 0;

  if (!hasNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-zinc-400 dark:text-zinc-500">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
          <StickyNote className="w-10 h-10" />
        </div>
        <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          {emptyTitle}
        </h3>
        <p className="text-xs max-w-sm">{emptySubtitle}</p>
      </div>
    );
  }

  const renderGridSection = (notes: Note[]) => {
    const gridClass =
      layoutMode === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start'
        : 'flex flex-col gap-3 max-w-2xl mx-auto';

    return (
      <div className={gridClass}>
        {notes.map((note) => (
          <div
            key={note.id}
            className={`transition-all duration-150 ${
              dragOverId === note.id ? 'ring-2 ring-amber-500 rounded-2xl scale-[1.02]' : ''
            }`}
          >
            <NoteCard
              note={note}
              allLabels={allLabels}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onRestoreNote={onRestoreNote}
              onPermanentDelete={onPermanentDelete}
              onDuplicateNote={onDuplicateNote}
              onCreateLabel={onCreateLabel}
              onOpenModal={onOpenModal}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            Pinned ({pinnedNotes.length})
          </h2>
          {renderGridSection(pinnedNotes)}
        </div>
      )}

      {/* Others / Unpinned Section */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1 pt-4">
              Others
            </h2>
          )}
          {renderGridSection(unpinnedNotes)}
        </div>
      )}
    </div>
  );
};
