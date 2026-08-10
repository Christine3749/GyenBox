import React, { useState } from "react";
import { X, Plus, Trash2, Tag, Check } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface EditLabelsModalProps {
  labels: string[];
  onAddLabel: (label: string) => void;
  onDeleteLabel: (label: string) => void;
  onClose: () => void;
}

export const EditLabelsModal: React.FC<EditLabelsModalProps> = ({
  labels,
  onAddLabel,
  onDeleteLabel,
  onClose,
}) => {
  const { t } = useLanguage();
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (trimmed && !labels.includes(trimmed)) {
      onAddLabel(trimmed);
      setNewLabel("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" />
            {t.manageLabelsHeader}
          </h3>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Add New Label Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder={t.createNewLabelPlaceholder}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />

            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Labels List */}
          <div className="space-y-1 pt-2">
            {labels.map((lbl) => (
              <div
                key={lbl}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-xs text-zinc-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-medium">{lbl}</span>
                </div>

                <button
                  onClick={() => onDeleteLabel(lbl)}
                  className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                  title={t.deleteLabelTooltip}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
          >
            {t.doneBtn}
          </button>
        </div>
      </div>
    </div>
  );
};


