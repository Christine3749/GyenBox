import React, { useState } from "react";
import { X, GitMerge, CheckCircle, ArrowRight } from "lucide-react";
import { Note, MergeRecommendation } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface MergeModalProps {
  recommendation: MergeRecommendation;
  allNotes: Note[];
  onConfirmMerge: (
    noteIdA: string,
    noteIdB: string,
    mergedTitle: string,
    mergedContent: string
  ) => void;
  onClose: () => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  recommendation,
  allNotes,
  onConfirmMerge,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const noteA = allNotes.find((n) => n.id === recommendation.noteIdA);
  const noteB = allNotes.find((n) => n.id === recommendation.noteIdB);

  const [mergedTitle, setMergedTitle] = useState(
    recommendation.mergedTitle || noteA?.title || noteB?.title || (language === "en" ? "Merged Note" : "合并后的便签")
  );
  const [mergedContent, setMergedContent] = useState(
    recommendation.mergedContent ||
      `${noteA?.content || ""}\n\n${noteB?.content || ""}`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {t.mergeModalHeader}
              </h3>
              <p className="text-xs text-zinc-500">
                💡 {t.mergeReasonPrefix} {recommendation.reason}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Side-by-Side Comparison */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Note A */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 uppercase">
              {t.noteAOriginal}
            </span>
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {noteA?.title || t.untitledNote}
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {noteA?.content || (noteA?.items ? noteA.items.map((i) => i.text).join("\n") : t.noContentText)}
            </p>
          </div>

          {/* Note B */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 uppercase">
              {t.noteBOriginal}
            </span>
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {noteB?.title || t.untitledNote}
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {noteB?.content || (noteB?.items ? noteB.items.map((i) => i.text).join("\n") : t.noContentText)}
            </p>
          </div>

          {/* Proposed Merged Result */}
          <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border-2 border-amber-500/40 space-y-3">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white uppercase">
              {t.proposedMergedResultLabel}
            </span>

            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                {t.mergedTitleLabel}
              </label>
              <input
                type="text"
                value={mergedTitle}
                onChange={(e) => setMergedTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                {t.mergedContentLabel}
              </label>
              <textarea
                value={mergedContent}
                onChange={(e) => setMergedContent(e.target.value)}
                rows={6}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-500">
            {t.mergeFooterNotice}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"
            >
              {t.cancelBtn}
            </button>

            <button
              onClick={() => {
                onConfirmMerge(
                  recommendation.noteIdA,
                  recommendation.noteIdB,
                  mergedTitle,
                  mergedContent
                );
                onClose();
              }}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{t.confirmMergeBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


