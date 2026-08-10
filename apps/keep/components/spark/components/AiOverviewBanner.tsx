import React, { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Archive,
  GitMerge,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Note, MergeRecommendation, StaleRecommendation } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { useAi } from "../context/AiContext";

interface AiOverviewBannerProps {
  notes: Note[];
  onOpenMergeModal: (rec: MergeRecommendation) => void;
  onArchiveStaleNotes: (ids: string[]) => void;
  onCloseBanner: () => void;
}

export const AiOverviewBanner: React.FC<AiOverviewBannerProps> = ({
  notes,
  onOpenMergeModal,
  onArchiveStaleNotes,
  onCloseBanner,
}) => {
  const { language, t } = useLanguage();
  const ai = useAi();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [overviewSummary, setOverviewSummary] = useState<string>(
    t.aiAnalyzingSummaryDefault
  );
  const [duplicates, setDuplicates] = useState<MergeRecommendation[]>([]);
  const [staleNotes, setStaleNotes] = useState<StaleRecommendation[]>([]);

  // Find due today notes
  const todayStr = new Date().toISOString().split("T")[0];
  const dueTodayNotes = notes.filter(
    (n) =>
      !n.isArchived &&
      !n.isTrashed &&
      n.reminder?.date &&
      n.reminder.date.startsWith(todayStr)
  );

  // Deterministic on-device suggestions: no note content is sent to a third party.
  const fetchAiAnalysis = async () => {
    setIsLoading(true);
    if (ai.configured) {
      try {
        const result = await ai.request<{ summary?: string; duplicatesToMerge?: MergeRecommendation[]; staleNotesToArchive?: StaleRecommendation[] }>('overview', { notes, language });
        if (result.summary) setOverviewSummary(result.summary);
        setDuplicates(Array.isArray(result.duplicatesToMerge) ? result.duplicatesToMerge : []);
        setStaleNotes(Array.isArray(result.staleNotesToArchive) ? result.staleNotesToArchive : []);
        return;
      } catch {
        // Fall through to local recommendations if the user's provider rejects a request.
      } finally {
        setIsLoading(false);
      }
    }
    const active = notes.filter((note) => !note.isArchived && !note.isTrashed);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    setStaleNotes(active.filter((note) => new Date(note.updatedAt).getTime() < thirtyDaysAgo).slice(0, 8).map((note) => ({ id: note.id, reason: language === "en" ? "No recent changes" : "超过 30 天未更新" })));
    const seen = new Map<string, Note>();
    const found: MergeRecommendation[] = [];
    active.forEach((note) => {
      const key = `${note.title}\n${note.content}`.trim().toLowerCase();
      const other = key ? seen.get(key) : undefined;
      if (other) found.push({ noteIdA: other.id, noteIdB: note.id, reason: language === "en" ? "Same title and content" : "标题与正文完全相同", mergedTitle: other.title || note.title, mergedContent: other.content || note.content });
      else if (key) seen.set(key, note);
    });
    setDuplicates(found.slice(0, 3));
    setOverviewSummary(language === "en" ? "Your synced notes are organized locally and ready to use." : "你的同步便签已整理完成，所有建议都在本地生成。");
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchAiAnalysis();
  }, [language, notes, ai]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mb-6">
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all">
        {/* Sleek Top Banner Bar */}
        <div className="px-6 py-3.5 bg-indigo-600 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-200 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                {t.aiOverviewHeader}
                {isLoading && (
                  <span className="text-xs text-indigo-200 font-normal animate-pulse">
                    {t.analyzingState}
                  </span>
                )}
              </h4>
              <p className="text-xs text-indigo-100/90 leading-tight">
                {overviewSummary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title={isCollapsed ? t.expandDetails : t.collapsePanel}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onCloseBanner}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Box 1: Due Today Reminders */}
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-amber-200/60 dark:border-zinc-700/80 space-y-2">
              <div className="flex items-center justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-500" />
                  {t.dueTodayHeading}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                  {dueTodayNotes.length} {t.itemsUnit}
                </span>
              </div>

              {dueTodayNotes.length > 0 ? (
                <div className="space-y-1.5">
                  {dueTodayNotes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/50 flex items-center justify-between"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {n.title || t.untitledNote}
                      </span>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400">
                        {n.reminder?.date?.split("T")[1] || t.allDay}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-[11px]">{t.noDueToday}</p>
              )}
            </div>

            {/* Box 2: Duplicate Note Merges */}
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-amber-200/60 dark:border-zinc-700/80 space-y-2">
              <div className="flex items-center justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="flex items-center gap-1.5">
                  <GitMerge className="w-4 h-4 text-amber-500" />
                  {t.duplicateMergeHeading}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold">
                  {duplicates.length} {t.groupsUnit}
                </span>
              </div>

              {duplicates.length > 0 ? (
                <div className="space-y-1.5">
                  {duplicates.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/50 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 block truncate">
                          {dup.mergedTitle}
                        </span>
                        <span className="text-[10px] text-zinc-500 block truncate">
                          {dup.reason}
                        </span>
                      </div>

                      <button
                        onClick={() => onOpenMergeModal(dup)}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shrink-0"
                      >
                        {t.previewMergeBtn}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-[11px]">{t.noDuplicates}</p>
              )}
            </div>

            {/* Box 3: Stale Notes Cleanup */}
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-amber-200/60 dark:border-zinc-700/80 space-y-2">
              <div className="flex items-center justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-indigo-500" />
                  {t.staleNotesHeading}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold">
                  {staleNotes.length} {t.itemsUnit}
                </span>
              </div>

              {staleNotes.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-500">
                    {t.staleNotesDetectedText.replace("{count}", String(staleNotes.length))}
                  </p>

                  <button
                    onClick={() =>
                      onArchiveStaleNotes(staleNotes.map((s) => s.id))
                    }
                    className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {t.batchArchiveStaleBtn}
                  </button>
                </div>
              ) : (
                <p className="text-zinc-400 text-[11px]">{t.notebookClean}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
