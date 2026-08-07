"use client";

import React, { useState } from 'react';
import { Note, NoteColor, Label } from '@/types';
import { NOTE_COLORS } from '@/constants/colors';
import { ColorPicker } from './ColorPicker';
import { ReminderPicker } from './ReminderPicker';
import { LabelSelector } from './LabelSelector';
import {
  Pin,
  Palette,
  Bell,
  Tag,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  MoreVertical,
  CheckSquare,
  Square,
  Copy,
  GripVertical,
  X,
  Type,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  allLabels: Label[];
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onCreateLabel: (name: string) => void;
  onOpenModal: (note: Note) => void;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  allLabels,
  onUpdateNote,
  onDeleteNote,
  onRestoreNote,
  onPermanentDelete,
  onDuplicateNote,
  onCreateLabel,
  onOpenModal,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [activePopover, setActivePopover] = useState<'color' | 'reminder' | 'label' | 'more' | null>(null);

  const currentColorStyle = NOTE_COLORS[note.color] || NOTE_COLORS.default;

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({ ...note, isPinned: !note.isPinned, updatedAt: Date.now() });
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({ ...note, isArchived: !note.isArchived, updatedAt: Date.now() });
  };

  const handleTrash = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.isTrashed) {
      onPermanentDelete(note.id);
    } else {
      onDeleteNote(note.id);
    }
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestoreNote(note.id);
  };

  const handleToggleChecklistItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!note.items) return;
    const updatedItems = note.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateNote({ ...note, items: updatedItems, updatedAt: Date.now() });
  };

  const handleRemoveLabel = (e: React.MouseEvent, labelId: string) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      labels: note.labels.filter((id) => id !== labelId),
      updatedAt: Date.now(),
    });
  };

  const handleRemoveReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({ ...note, reminder: null, updatedAt: Date.now() });
  };

  const handleToggleLabel = (labelId: string) => {
    const updated = note.labels.includes(labelId)
      ? note.labels.filter((id) => id !== labelId)
      : [...note.labels, labelId];
    onUpdateNote({ ...note, labels: updated, updatedAt: Date.now() });
  };

  const formatReminderDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Today, ${timeStr}`;
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  const uncompletedItems = note.items?.filter((i) => !i.completed) || [];
  const completedItems = note.items?.filter((i) => i.completed) || [];

  return (
    <div
      draggable={!note.isTrashed}
      onDragStart={(e) => onDragStart && onDragStart(e, note.id)}
      onDragOver={(e) => onDragOver && onDragOver(e, note.id)}
      onDrop={(e) => onDrop && onDrop(e, note.id)}
      onClick={() => onOpenModal(note)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${currentColorStyle.bgClass} ${currentColorStyle.borderClass}`}
    >
      {/* Top Card Header */}
      <div className="p-4 space-y-2">
        {note.source === 'gy-clipboard' && (
          <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cyan-800 dark:text-cyan-100">
            GY · 自动复制
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          {note.title ? (
            <h3 className="font-semibold text-base leading-tight break-words pr-6">
              {note.title}
            </h3>
          ) : (
            <div className="h-4" />
          )}

          {/* Pin Button */}
          {!note.isTrashed && (
            <button
              type="button"
              onClick={handleTogglePin}
              className={`absolute top-3 right-3 p-1.5 rounded-full transition-opacity duration-200 ${
                note.isPinned
                  ? 'opacity-100 text-amber-600 dark:text-amber-400 bg-black/5 dark:bg-white/10'
                  : 'opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={note.isPinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-amber-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Note Body Text */}
        {note.image && (
          <img
            src={note.image.url}
            alt="GY clipboard image"
            className="max-h-[420px] w-full rounded-xl border border-black/10 object-contain dark:border-white/10"
            loading="lazy"
          />
        )}
        {note.type === 'text' && note.content && (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-zinc-700 dark:text-zinc-200 opacity-90">
            {note.content}
          </p>
        )}

        {/* Checklist View */}
        {note.type === 'checklist' && (
          <div className="space-y-1 text-sm">
            {uncompletedItems.slice(0, 8).map((item) => (
              <div
                key={item.id}
                onClick={(e) => handleToggleChecklistItem(e, item.id)}
                className="flex items-start gap-2 group/item hover:opacity-100 cursor-pointer"
              >
                <Square className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                <span className="break-words line-clamp-2 text-zinc-800 dark:text-zinc-100">
                  {item.text}
                </span>
              </div>
            ))}

            {completedItems.length > 0 && (
              <div className="pt-2 border-t border-black/5 dark:border-white/10 space-y-1">
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                  {completedItems.length} completed item{completedItems.length > 1 ? 's' : ''}
                </span>
                {completedItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => handleToggleChecklistItem(e, item.id)}
                    className="flex items-start gap-2 cursor-pointer text-zinc-400 dark:text-zinc-400"
                  >
                    <CheckSquare className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                    <span className="line-through break-words line-clamp-1">{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chips (Reminder & Labels) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          {note.reminder && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/10">
              <Bell className="w-3 h-3 text-amber-500" />
              {formatReminderDate(note.reminder)}
              {!note.isTrashed && (
                <button
                  type="button"
                  onClick={handleRemoveReminder}
                  className="hover:text-red-500 rounded-full ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {note.labels.map((labelId) => {
            const labelObj = allLabels.find((l) => l.id === labelId);
            if (!labelObj) return null;
            return (
              <span
                key={labelId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/10"
              >
                <Tag className="w-3 h-3 text-zinc-400" />
                {labelObj.name}
                {!note.isTrashed && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveLabel(e, labelId)}
                    className="hover:text-red-500 rounded-full ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar (visible on hover or active popover) */}
      <div
        className={`px-3 py-2 flex items-center justify-between border-t border-black/5 dark:border-white/10 transition-opacity duration-200 ${
          activePopover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {!note.isTrashed ? (
          <div className="flex items-center gap-1">
            {/* Color Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(activePopover === 'color' ? null : 'color')
                }
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
                title="Change color"
              >
                <Palette className="w-4 h-4" />
              </button>
              {activePopover === 'color' && (
                <div className="absolute left-0 bottom-8">
                  <ColorPicker
                    selectedColor={note.color}
                    onSelectColor={(c) => {
                      onUpdateNote({ ...note, color: c, updatedAt: Date.now() });
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                </div>
              )}
            </div>

            {/* Reminder Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(activePopover === 'reminder' ? null : 'reminder')
                }
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
                title="Remind me"
              >
                <Bell className="w-4 h-4" />
              </button>
              {activePopover === 'reminder' && (
                <div className="absolute left-0 bottom-8">
                  <ReminderPicker
                    currentReminder={note.reminder}
                    onSelectReminder={(r) => {
                      onUpdateNote({ ...note, reminder: r, updatedAt: Date.now() });
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                </div>
              )}
            </div>

            {/* Label Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(activePopover === 'label' ? null : 'label')
                }
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
                title="Change labels"
              >
                <Tag className="w-4 h-4" />
              </button>
              {activePopover === 'label' && (
                <div className="absolute left-0 bottom-8">
                  <LabelSelector
                    allLabels={allLabels}
                    selectedLabelIds={note.labels}
                    onToggleLabel={handleToggleLabel}
                    onCreateLabel={onCreateLabel}
                    onClose={() => setActivePopover(null)}
                  />
                </div>
              )}
            </div>

            {/* Archive / Unarchive */}
            <button
              type="button"
              onClick={handleToggleArchive}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
              title={note.isArchived ? 'Unarchive' : 'Archive'}
            >
              {note.isArchived ? (
                <ArchiveRestore className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>

            {/* Trash */}
            <button
              type="button"
              onClick={handleTrash}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-red-500"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Trashed Card Quick Actions */
          <div className="flex items-center gap-1 w-full justify-between">
            <button
              type="button"
              onClick={handleRestore}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
              title="Restore note"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </button>
            <button
              type="button"
              onClick={handleTrash}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
              title="Delete forever"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete forever
            </button>
          </div>
        )}

        {/* More Options Dropdown */}
        {!note.isTrashed && (
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActivePopover(activePopover === 'more' ? null : 'more')
              }
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {activePopover === 'more' && (
              <div className="absolute right-0 bottom-8 w-44 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 text-xs py-1 text-zinc-800 dark:text-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    onDuplicateNote(note);
                    setActivePopover(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                >
                  <Copy className="w-3.5 h-3.5" /> Make a copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextType = note.type === 'text' ? 'checklist' : 'text';
                    if (nextType === 'checklist') {
                      const items = note.content
                        .split('\n')
                        .filter(Boolean)
                        .map((t, idx) => ({ id: `c-${idx}`, text: t, completed: false }));
                      onUpdateNote({ ...note, type: 'checklist', items, updatedAt: Date.now() });
                    } else {
                      const text = note.items?.map((i) => i.text).join('\n') || '';
                      onUpdateNote({ ...note, type: 'text', content: text, updatedAt: Date.now() });
                    }
                    setActivePopover(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                >
                  {note.type === 'text' ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> Convert to checkboxes
                    </>
                  ) : (
                    <>
                      <Type className="w-3.5 h-3.5" /> Convert to text
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
