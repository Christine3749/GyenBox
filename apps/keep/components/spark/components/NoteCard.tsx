import React from "react";
import {
  Pin,
  Bell,
  Archive,
  Trash2,
  CheckSquare,
  Sparkles,
  Link2,
  Clock,
  MapPin,
  RotateCcw,
  Tag,
  Users,
} from "lucide-react";
import { Note, ViewMode } from "../types";
import { getColorById } from "../constants/colors";
import { useLanguage } from "../context/LanguageContext";

interface NoteCardProps {
  note: Note;
  viewMode: ViewMode;
  onSelectNote: (note: Note) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onToggleArchive: (id: string, e: React.MouseEvent) => void;
  onTrashNote: (id: string, e: React.MouseEvent) => void;
  onRestoreNote?: (id: string, e: React.MouseEvent) => void;
  onDeleteForever?: (id: string, e: React.MouseEvent) => void;
  onToggleCheckItem: (noteId: string, itemId: string, completed: boolean, e: React.MouseEvent) => void;
  searchQuery?: string;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onSelectNote,
  onTogglePin,
  onToggleArchive,
  onTrashNote,
  onRestoreNote,
  onDeleteForever,
  onToggleCheckItem,
  searchQuery,
}) => {
  const { t } = useLanguage();
  const colorObj = getColorById(note.color);

  // Check if reminder is due today
  const isDueToday = React.useMemo(() => {
    if (!note.reminder?.date) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    return note.reminder.date.startsWith(todayStr);
  }, [note.reminder]);

  return (
    <div
      onClick={() => onSelectNote(note)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
        colorObj.bgLight
      } ${colorObj.borderLight} ${
        viewMode === "list" ? "w-full p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" : "p-4 space-y-3"
      }`}
    >
      {/* Top Bar: Pin + Title */}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          {note.title ? (
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
              {note.title}
            </h3>
          ) : (
            <span className="text-xs text-zinc-400 italic">{t.untitledNote}</span>
          )}

          {!note.isTrashed && (
            <button
              onClick={(e) => onTogglePin(note.id, e)}
              className={`p-1 rounded-full transition-opacity opacity-80 md:opacity-0 group-hover:opacity-100 ${
                note.isPinned
                  ? "text-amber-600 dark:text-amber-400 bg-amber-500/15 !opacity-100"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title={note.isPinned ? t.unpinTooltip : t.pinTooltip}
            >
              <Pin className={`w-4 h-4 ${note.isPinned ? "fill-amber-500" : ""}`} />
            </button>
          )}
        </div>

        {/* Content Body / Checklist */}
        {note.type === "list" ? (
          <div className="space-y-1.5 pt-1">
            {note.items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCheckItem(note.id, item.id, !item.completed, e);
                }}
                className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 group/item hover:opacity-80"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  readOnly
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 pointer-events-none"
                />
                <span className={item.completed ? "line-through text-zinc-400 dark:text-zinc-500" : ""}>
                  {item.text}
                </span>
              </div>
            ))}
            {note.items.length > 5 && (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium pt-0.5">
                {t.moreItemsNotShown.replace("{count}", String(note.items.length - 5))}
              </p>
            )}
          </div>
        ) : (
          note.content && (
            <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-4 leading-relaxed whitespace-pre-wrap">
              {note.content}
            </p>
          )
        )}

        {/* Image Attachment */}
        {note.imageUrl && (
          <div className="mt-2 aspect-[16/9] rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
            <img src={note.imageUrl} alt="attachment" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Metadata Badges: Reminders, Labels, AI Insights */}
      <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs">
        {/* Reminder Badge */}
        {note.reminder?.date && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
              isDueToday
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300/50"
                : "bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>{note.reminder.date.replace("T", " ")}</span>
            {note.reminder.location && (
              <span className="flex items-center gap-0.5 opacity-80">
                <MapPin className="w-3 h-3" />
                {note.reminder.location}
              </span>
            )}
          </div>
        )}

        {/* Semantic Search Explanation Pill */}
        {note.matchedExplanation && (
          <div className="bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 font-medium shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="line-clamp-1">{note.matchedExplanation}</span>
          </div>
        )}

        {/* Related Notes Badge */}
        {note.relatedNoteIds && note.relatedNoteIds.length > 0 && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 text-[11px]">
            <Link2 className="w-3 h-3 text-indigo-500" />
            <span>{t.relatedNotesCount.replace("{count}", String(note.relatedNoteIds.length))}</span>
          </div>
        )}

        {/* Label Chips & Collaborators */}
        <div className="flex flex-wrap items-center gap-1.5">
          {note.labels.map((lbl) => (
            <span
              key={lbl}
              className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium"
            >
              #{lbl}
            </span>
          ))}

          {note.collaborators && note.collaborators.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-500 ml-auto" title={`${t.collaboratorTooltip}: ${note.collaborators.join(", ")}`}>
              <Users className="w-3 h-3" />
              {note.collaborators.length}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Action Bar (Hover or Focus) */}
      <div
        className="flex items-center justify-end gap-1 pt-1 opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {!note.isTrashed ? (
          <>
            <button
              onClick={(e) => onToggleArchive(note.id, e)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={note.isArchived ? t.unarchiveTooltip : t.archiveTooltip}
            >
              <Archive className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={(e) => onTrashNote(note.id, e)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={t.trashTooltip}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => onRestoreNote && onRestoreNote(note.id, e)}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 text-xs font-medium"
              title={t.restoreTooltip}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.restoreBtn}</span>
            </button>

            <button
              onClick={(e) => onDeleteForever && onDeleteForever(note.id, e)}
              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 text-xs font-medium"
              title={t.deleteForeverTooltip}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.deleteForeverBtn}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
