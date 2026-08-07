"use client";

import React from 'react';
import { NOTE_COLORS } from '@/constants/colors';
import { NoteColor } from '@/types';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: NoteColor;
  onSelectColor: (color: NoteColor) => void;
  onClose?: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelectColor,
  onClose,
}) => {
  const colorsList = Object.values(NOTE_COLORS);

  return (
    <div
      className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 flex flex-wrap gap-1.5 max-w-[270px]"
      onClick={(e) => e.stopPropagation()}
    >
      {colorsList.map((color) => {
        const isSelected = selectedColor === color.id;
        return (
          <button
            key={color.id}
            type="button"
            title={color.name}
            onClick={() => {
              onSelectColor(color.id);
              if (onClose) onClose();
            }}
            style={{
              backgroundColor: color.hexLight,
            }}
            className={`w-7 h-7 rounded-full border border-black/15 dark:border-white/20 relative transition-transform hover:scale-110 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500`}
          >
            {isSelected && (
              <Check className="w-4 h-4 text-zinc-900 drop-shadow-sm stroke-[3]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
