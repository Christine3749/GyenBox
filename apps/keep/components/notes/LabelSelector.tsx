"use client";

import React, { useState } from 'react';
import { Label } from '@/types';
import { Check, Plus, Tag, X } from 'lucide-react';

interface LabelSelectorProps {
  allLabels: Label[];
  selectedLabelIds: string[];
  onToggleLabel: (labelId: string) => void;
  onCreateLabel?: (name: string) => void;
  onClose: () => void;
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({
  allLabels,
  selectedLabelIds,
  onToggleLabel,
  onCreateLabel,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  const filteredLabels = allLabels.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (search.trim() && onCreateLabel) {
      onCreateLabel(search.trim());
      setSearch('');
    }
  };

  return (
    <div
      className="p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 text-sm w-56 text-zinc-800 dark:text-zinc-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-700">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Label note
        </span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative mb-2">
        <input
          type="text"
          placeholder="Enter label name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredLabels.map((label) => {
          const isSelected = selectedLabelIds.includes(label.id);
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onToggleLabel(label.id)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{label.name}</span>
              </span>
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-zinc-400 dark:border-zinc-600'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}

        {filteredLabels.length === 0 && search.trim() !== '' && (
          <button
            type="button"
            onClick={handleCreate}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Create &quot;{search.trim()}&quot;
          </button>
        )}
      </div>
    </div>
  );
};
