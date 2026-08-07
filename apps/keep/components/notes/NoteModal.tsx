"use client";

import React, { useState, useEffect } from 'react';
import { Note, NoteColor, Label, ChecklistItem } from '@/types';
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
  Trash2,
  CheckSquare,
  Plus,
  X,
  Type,
  GripVertical,
} from 'lucide-react';

interface NoteModalProps {
  note: Note | null;
  isOpen: boolean;
  allLabels: Label[];
  onClose: () => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onCreateLabel: (name: string) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  note,
  isOpen,
  allLabels,
  onClose,
  onUpdateNote,
  onDeleteNote,
  onCreateLabel,
}) => {
  // Hooks must run unconditionally (even while the modal is closed) so React
  // doesn't see a different hook count between renders — the note/isOpen
  // guard happens after, in what gets returned.
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [type, setType] = useState<'text' | 'checklist'>(note?.type ?? 'text');
  const [items, setItems] = useState<ChecklistItem[]>(note?.items || []);
  const [color, setColor] = useState<NoteColor>(note?.color ?? 'default');
  const [isPinned, setIsPinned] = useState(note?.isPinned ?? false);
  const [isArchived, setIsArchived] = useState(note?.isArchived ?? false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(note?.labels ?? []);
  const [reminder, setReminder] = useState<string | null>(note?.reminder || null);

  const [activePopover, setActivePopover] = useState<'color' | 'reminder' | 'label' | null>(null);

  // Sync state when note prop changes
  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content);
    setType(note.type);
    setItems(note.items || []);
    setColor(note.color);
    setIsPinned(note.isPinned);
    setIsArchived(note.isArchived);
    setSelectedLabels(note.labels);
    setReminder(note.reminder || null);
  }, [note]);

  if (!isOpen || !note) return null;

  const handleSave = () => {
    onUpdateNote({
      ...note,
      title: title.trim(),
      content: content.trim(),
      type,
      items: type === 'checklist' ? items.filter((i) => i.text.trim() !== '') : [],
      color,
      isPinned,
      isArchived,
      labels: selectedLabels,
      reminder,
      updatedAt: Date.now(),
    });
    onClose();
  };

  const handleAddChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: '',
      completed: false,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateChecklistItem = (id: string, text: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleToggleChecklistItem = (id: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)));
  };

  const handleDeleteChecklistItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleToggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const currentColorStyle = NOTE_COLORS[color] || NOTE_COLORS.default;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleSave}
    >
      <div
        className={`w-full max-w-xl rounded-3xl shadow-2xl border p-5 sm:p-6 transition-colors duration-200 flex flex-col max-h-[90vh] ${currentColorStyle.bgClass} ${currentColorStyle.borderClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Title Bar */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent font-semibold text-lg sm:text-xl focus:outline-none placeholder-zinc-400"
          />
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              isPinned
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title={isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className={`w-5 h-5 ${isPinned ? 'fill-amber-500' : ''}`} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
          {type === 'text' ? (
            <textarea
              placeholder="Note text..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full bg-transparent text-sm sm:text-base focus:outline-none resize-none placeholder-zinc-400 leading-relaxed"
            />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <GripVertical className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 cursor-grab" />
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(item.id)}
                    className="w-4 h-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="List item"
                    value={item.text}
                    onChange={(e) => handleUpdateChecklistItem(item.id, e.target.value)}
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${
                      item.completed ? 'line-through text-zinc-400' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="p-1 text-zinc-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 py-1"
              >
                <Plus className="w-4 h-4" /> Add item
              </button>
            </div>
          )}

          {/* Chips section */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {reminder && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200">
                <Bell className="w-3 h-3 text-amber-500" />
                {new Date(reminder).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                <button
                  type="button"
                  onClick={() => setReminder(null)}
                  className="hover:text-red-500 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedLabels.map((labelId) => {
              const labelObj = allLabels.find((l) => l.id === labelId);
              if (!labelObj) return null;
              return (
                <span
                  key={labelId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200"
                >
                  <Tag className="w-3 h-3 text-zinc-400" />
                  {labelObj.name}
                  <button
                    type="button"
                    onClick={() => handleToggleLabel(labelId)}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom Toolbar */}
        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/10 relative">
          <div className="flex items-center gap-1">
            {/* Color */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(activePopover === 'color' ? null : 'color')
                }
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
                title="Change color"
              >
                <Palette className="w-4 h-4" />
              </button>
              {activePopover === 'color' && (
                <div className="absolute left-0 bottom-10">
                  <ColorPicker
                    selectedColor={color}
                    onSelectColor={(c) => {
                      setColor(c);
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                </div>
              )}
            </div>

            {/* Reminder */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(activePopover === 'reminder' ? null : 'reminder')
                }
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
                title="Remind me"
              >
                <Bell className="w-4 h-4" />
              </button>
              {activePopover === 'reminder' && (
                <div className="absolute left-0 bottom-10">
                  <ReminderPicker
                    currentReminder={reminder}
                    onSelectReminder={(r) => {
                      setReminder(r);
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                </div>
              )}
            </div>

            {/* Label */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(activePopover === 'label' ? null : 'label')
                }
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
                title="Change labels"
              >
                <Tag className="w-4 h-4" />
              </button>
              {activePopover === 'label' && (
                <div className="absolute left-0 bottom-10">
                  <LabelSelector
                    allLabels={allLabels}
                    selectedLabelIds={selectedLabels}
                    onToggleLabel={handleToggleLabel}
                    onCreateLabel={onCreateLabel}
                    onClose={() => setActivePopover(null)}
                  />
                </div>
              )}
            </div>

            {/* Archive Toggle */}
            <button
              type="button"
              onClick={() => setIsArchived(!isArchived)}
              className={`p-2 rounded-full transition-colors ${
                isArchived
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={isArchived ? 'Unarchive' : 'Archive'}
            >
              <Archive className="w-4 h-4" />
            </button>

            {/* Type Toggle */}
            <button
              type="button"
              onClick={() => {
                if (type === 'text') {
                  setType('checklist');
                  if (items.length === 0) {
                    setItems([{ id: 'init-1', text: content, completed: false }]);
                  }
                } else {
                  setType('text');
                  if (!content) {
                    setContent(items.map((i) => i.text).join('\n'));
                  }
                }
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300"
              title={type === 'text' ? 'Convert to checklist' : 'Convert to text'}
            >
              {type === 'text' ? <CheckSquare className="w-4 h-4" /> : <Type className="w-4 h-4" />}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                onDeleteNote(note.id);
                onClose();
              }}
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-600 dark:text-zinc-300 hover:text-red-500"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
