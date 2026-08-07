"use client";

import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';

interface TrashBannerProps {
  trashCount: number;
  onEmptyTrash: () => void;
}

export const TrashBanner: React.FC<TrashBannerProps> = ({
  trashCount,
  onEmptyTrash,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-4">
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-200 shadow-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 hidden sm:block" />
          <span>
            Notes in Trash are automatically deleted after 7 days.{' '}
            {trashCount > 0 ? `${trashCount} note${trashCount > 1 ? 's' : ''} in trash.` : 'Trash is empty.'}
          </span>
        </div>
        {trashCount > 0 && (
          <button
            onClick={onEmptyTrash}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Empty Trash now
          </button>
        )}
      </div>
    </div>
  );
};
