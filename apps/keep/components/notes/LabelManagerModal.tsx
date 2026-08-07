"use client";

import React, { useState } from 'react';
import { Label } from '@/types';
import { Tag, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface LabelManagerModalProps {
  labels: Label[];
  isOpen: boolean;
  onClose: () => void;
  onCreateLabel: (name: string) => void;
  onRenameLabel: (id: string, newName: string) => void;
  onDeleteLabel: (id: string) => void;
}

export const LabelManagerModal: React.FC<LabelManagerModalProps> = ({
  labels,
  isOpen,
  onClose,
  onCreateLabel,
  onRenameLabel,
  onDeleteLabel,
}) => {
  const [newLabelName, setNewLabelName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLabelName.trim()) {
      onCreateLabel(newLabelName.trim());
      setNewLabelName('');
    }
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      onRenameLabel(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-3xl shadow-2xl w-full max-w-sm p-5 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <Tag className="w-5 h-5 text-amber-500" />
          Edit labels
        </h3>

        {/* Create new label input */}
        <form onSubmit={handleCreate} className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Create new label"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={!newLabelName.trim()}
            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl disabled:opacity-40"
            title="Add label"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        {/* Labels list */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 group"
            >
              {editingId === label.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    className="flex-1 px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-amber-500 rounded-lg focus:outline-none text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    onClick={() => handleSaveRename(label.id)}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    <Tag className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="truncate">{label.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(label.id);
                        setEditingName(label.name);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600"
                      title="Rename label"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteLabel(label.id)}
                      className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete label"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {labels.length === 0 && (
            <p className="text-xs text-center text-zinc-400 py-4">
              No labels created yet.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4 mt-2 border-t border-zinc-100 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
