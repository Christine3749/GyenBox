"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Note, NoteColor, Label, ChecklistItem } from '@/types';
import { NOTE_COLORS } from '@/constants/colors';
import { ColorPicker } from './ColorPicker';
import { ReminderPicker } from './ReminderPicker';
import { LabelSelector } from './LabelSelector';
import {
  Pin,
  CheckSquare,
  Palette,
  Bell,
  Tag,
  Plus,
  X,
  Type,
  GripVertical,
} from 'lucide-react';
import { motion } from 'motion/react';

interface NoteComposerProps {
  allLabels: Label[];
  onAddNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void;
  onCreateLabel: (name: string) => void;
}

export const NoteComposer: React.FC<NoteComposerProps> = ({
  allLabels,
  onAddNote,
  onCreateLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'checklist'>('text');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [color, setColor] = useState<NoteColor>('default');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [reminder, setReminder] = useState<string | null>(null);

  // Popover states
  const [activePopover, setActivePopover] = useState<'color' | 'reminder' | 'label' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close composer on click outside if empty, or auto-save if filled
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (isExpanded) {
          handleSaveAndClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, title, content, items, color, isPinned, selectedLabels, reminder, type]);

  const handleSaveAndClose = () => {
    const hasTextContent = content.trim() !== '';
    const hasChecklistItems = items.some((item) => item.text.trim() !== '');
    const hasTitle = title.trim() !== '';

    if (hasTitle || hasTextContent || hasChecklistItems) {
      onAddNote({
        title: title.trim(),
        content: content.trim(),
        type,
        items: type === 'checklist' ? items.filter((i) => i.text.trim() !== '') : [],
        color,
        isPinned,
        isArchived: false,
        isTrashed: false,
        labels: selectedLabels,
        reminder,
      });
    }

    // Reset composer state
    setTitle('');
    setContent('');
    setType('text');
    setItems([]);
    setColor('default');
    setIsPinned(false);
    setSelectedLabels([]);
    setReminder(null);
    setActivePopover(null);
    setIsExpanded(false);
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

  const currentColorStyle = NOTE_COLORS[color];

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 px-4" ref={containerRef}>
      <motion.div
        layout
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`rounded-2xl border transition-shadow duration-200 shadow-md hover:shadow-lg relative overflow-hidden ${currentColorStyle.bgClass} ${currentColorStyle.borderClass}`}
      >
        {!isExpanded ? (
          /* Collapsed View */
          <div
            onClick={() => setIsExpanded(true)}
            className="flex items-center justify-between px-5 py-3 cursor-text text-zinc-500 dark:text-zinc-400 select-none"
          >
            <span className="text-sm font-medium">Take a note...</span>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setType('checklist');
                  setItems([{ id: 'init-1', text: '', completed: false }]);
                  setIsExpanded(true);
                }}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="New list"
              >
                <CheckSquare className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopover('color');
                  setIsExpanded(true);
                }}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Note color"
              >
                <Palette className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded View */
          <div className="p-4 space-y-3">
            {/* Title & Pin row */}
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent font-medium text-base md:text-lg focus:outline-none placeholder-zinc-400"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-2 rounded-full transition-colors ${
                  isPinned
                    ? 'text-amber-500 bg-amber-500/10'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title={isPinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className={`w-5 h-5 ${isPinned ? 'fill-amber-500' : ''}`} />
              </button>
            </div>

            {/* Note Content / Checklist */}
            {type === 'text' ? (
              <textarea
                placeholder="Take a note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-sm focus:outline-none resize-none placeholder-zinc-400 leading-relaxed"
              />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
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

            {/* Chips area (Labels & Reminder) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
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

            {/* Bottom Actions Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10 relative">
              <div className="flex items-center gap-1">
                {/* Color Picker Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopover(activePopover === 'color' ? null : 'color')
                    }
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
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

                {/* Reminder Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopover(activePopover === 'reminder' ? null : 'reminder')
                    }
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
                    title="Remind me"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  {activePopover === 'reminder' && (
                    <div className="absolute left-0 bottom-10">
                      <ReminderPicker
                        currentReminder={reminder}
                        onSelectReminder={(r) => setReminder(r)}
                        onClose={() => setActivePopover(null)}
                      />
                    </div>
                  )}
                </div>

                {/* Label Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopover(activePopover === 'label' ? null : 'label')
                    }
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
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

                {/* Toggle Type (Text vs Checklist) */}
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
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
                  title={type === 'text' ? 'Show checkboxes' : 'Hide checkboxes'}
                >
                  {type === 'text' ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Type className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Close/Save Button */}
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="px-4 py-1.5 text-xs md:text-sm font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
