import React, { useState, useEffect } from "react";
import {
  X,
  Pin,
  CheckSquare,
  Bell,
  Archive,
  Trash2,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Link2,
  Users,
  Clock,
  MapPin,
  Tag,
} from "lucide-react";
import { Note, NoteColorId, ChecklistItem } from "../types";
import { MORANDI_COLORS, getColorById } from "../constants/colors";
import { useLanguage } from "../context/LanguageContext";
import { useAi } from "../context/AiContext";

interface NoteEditorModalProps {
  note: Note;
  onSave: (updated: Note) => boolean | Promise<boolean>;
  onClose: () => void;
  onTrash: (id: string) => void;
  allNotes: Note[];
  allLabels: string[];
  onSelectRelatedNote: (note: Note) => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  note,
  onSave,
  onClose,
  onTrash,
  allNotes,
  allLabels,
  onSelectRelatedNote,
}) => {
  const { language, t } = useLanguage();
  const ai = useAi();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [type, setType] = useState<"text" | "list">(note.type);
  const [items, setItems] = useState<ChecklistItem[]>(note.items || []);
  const [newItemText, setNewItemText] = useState("");
  const [color, setColor] = useState<NoteColorId>(note.color);
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [isArchived, setIsArchived] = useState(note.isArchived);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    note.labels || []
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>(note.imageUrl);
  const [isSaving, setIsSaving] = useState(false);

  // Reminder State
  const [reminderDate, setReminderDate] = useState(note.reminder?.date || "");
  const [reminderLocation, setReminderLocation] = useState(
    note.reminder?.location || ""
  );
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  // AI Insights State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>(
    note.suggestedTags || []
  );
  const [relatedNotes, setRelatedNotes] = useState<
    { id: string; reason: string }[]
  >(note.relatedNoteIds || []);

  // Local suggestions keep synced data private until a dedicated AI service is wired.
  const handleAiAnalyze = async () => {
    if (!title && !content) return;
    setAiAnalyzing(true);
    if (ai.configured) {
      try {
        const result = await ai.request<{ suggestedTags?: string[]; relatedNotes?: { id: string; reason: string }[] }>('analyze-note', { title, content, labels: allLabels, notes: allNotes, language });
        setSuggestedTags(Array.isArray(result.suggestedTags) ? result.suggestedTags : []);
        setRelatedNotes(Array.isArray(result.relatedNotes) ? result.relatedNotes : []);
        return;
      } catch {
        // Retain the local fallback when the configured provider is unavailable.
      } finally {
        setAiAnalyzing(false);
      }
    }
    const words = `${title} ${content}`.toLowerCase();
    setSuggestedTags(allLabels.filter((label) => words.includes(label.toLowerCase()) && !selectedLabels.includes(label)).slice(0, 4));
    setRelatedNotes(allNotes.filter((other) => other.id !== note.id && other.labels.some((label) => selectedLabels.includes(label))).slice(0, 3).map((other) => ({ id: other.id, reason: language === "en" ? "Shares a label" : "共享相同标签" })));
    setAiAnalyzing(false);
  };

  useEffect(() => {
    // Automatically trigger AI analysis in background on modal open
    handleAiAnalyze();
  }, [note.id]);

  const handleSaveAndClose = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const saved = await onSave({
      ...note,
      title: title.trim(),
      content: content.trim(),
      type,
      items: items.filter((i) => i.text.trim().length > 0),
      color,
      isPinned,
      isArchived,
      labels: selectedLabels,
      imageUrl,
      reminder: reminderDate
        ? { date: reminderDate, location: reminderLocation || undefined }
        : undefined,
      suggestedTags,
      relatedNoteIds: relatedNotes,
      updatedAt: new Date().toISOString(),
    });
    setIsSaving(false);
    if (saved) onClose();
  };

  const handleAddItem = () => {
    if (newItemText.trim()) {
      setItems([
        ...items,
        {
          id: `i-${Date.now()}-${Math.random()}`,
          text: newItemText.trim(),
          completed: false,
        },
      ]);
      setNewItemText("");
    }
  };

  const toggleLabel = (lbl: string) => {
    if (selectedLabels.includes(lbl)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== lbl));
    } else {
      setSelectedLabels([...selectedLabels, lbl]);
    }
  };

  const addSuggestedTag = (tag: string) => {
    if (!selectedLabels.includes(tag)) {
      setSelectedLabels([...selectedLabels, tag]);
    }
    setSuggestedTags(suggestedTags.filter((t) => t !== tag));
  };

  const insertDoubleLink = (relatedNoteTitle: string) => {
    const linkSyntax = ` [[${relatedNoteTitle}]] `;
    setContent((prev) => prev + linkSyntax);
  };

  const currentColor = getColorById(color);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-xl overflow-hidden transition-all duration-200 ${currentColor.bgLight} ${currentColor.borderLight}`}
      >
        {/* Top Modal Header */}
        <div className="p-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
              {type === "text" ? t.noteDetailTitle : t.noteChecklistDetailTitle}
            </span>
            {aiAnalyzing && (
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                {t.aiAnalyzing}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-full transition-colors ${
                isPinned
                  ? "text-amber-600 dark:text-amber-400 bg-amber-500/15"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title={isPinned ? t.unpinTooltip : t.pinTooltip}
            >
              <Pin className={`w-4 h-4 ${isPinned ? "fill-amber-500" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.editorTitlePlaceholder}
            className="w-full bg-transparent text-xl font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
            id="editor-title-input"
          />

          {/* Content Body / Checklist */}
          {type === "text" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.editorContentPlaceholder}
              rows={8}
              className="w-full bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none resize-none leading-relaxed"
              id="editor-content-textarea"
            />
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].completed = e.target.checked;
                      setItems(newItems);
                    }}
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].text = e.target.value;
                      setItems(newItems);
                    }}
                    className={`flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none ${
                      item.completed ? "line-through text-zinc-400" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 text-sm pt-2">
                <Plus className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  placeholder={t.addChecklistItemPlaceholder}
                  className="flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none"
                />
                {newItemText && (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-medium text-amber-600 dark:text-amber-400"
                  >
                    {t.addBtn}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Image Attachment Preview */}
          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden max-h-56 group">
              <img
                src={imageUrl}
                alt="attachment"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl(undefined)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Reminder Picker Expandable Panel */}
          {showReminderPicker && (
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2 text-xs">
              <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-rose-500" />
                  {t.reminderTimeAndLocationHeading}
                </span>
                <button
                  type="button"
                  onClick={() => setShowReminderPicker(false)}
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">
                    {t.reminderTimeLabel}
                  </label>
                  <input
                    type="datetime-local"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">
                    {t.reminderLocationLabel}
                  </label>
                  <input
                    type="text"
                    value={reminderLocation}
                    onChange={(e) => setReminderLocation(e.target.value)}
                    placeholder={t.reminderLocationPlaceholder}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Labels & AI Suggested Tags */}
          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                {t.selectedLabelsLabel}
              </span>
              {allLabels.map((lbl) => {
                const selected = selectedLabels.includes(lbl);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => toggleLabel(lbl)}
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                      selected
                        ? "bg-amber-500 text-white border-amber-500 font-medium"
                        : "bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border-transparent hover:border-zinc-300"
                    }`}
                  >
                    #{lbl}
                  </button>
                );
              })}
            </div>

            {/* AI Suggested Tags Pill Chips */}
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {t.aiSuggestedTagsLabel}
                </span>
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addSuggestedTag(tag)}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-1"
                  >
                    <span>+{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Related Notes Panel */}
          {relatedNotes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {t.aiRelatedNotesCount.replace("{count}", String(relatedNotes.length))}
                </span>
              </div>

              <div className="space-y-2">
                {relatedNotes.map((rel) => {
                  const matchedNote = allNotes.find((n) => n.id === rel.id);
                  if (!matchedNote) return null;

                  return (
                    <div
                      key={rel.id}
                      className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-2"
                    >
                      <div
                        onClick={() => onSelectRelatedNote(matchedNote)}
                        className="flex-1 cursor-pointer hover:underline"
                      >
                        <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {matchedNote.title || t.untitledNote}
                        </h5>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 line-clamp-1">
                          💡 {t.relatedReasonPrefix} {rel.reason}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => insertDoubleLink(matchedNote.title || "Note")}
                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-medium shrink-0"
                        title={t.insertLinkTooltip}
                      >
                        🔗 {t.insertLinkBtn}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Toolbar */}
        <div className="p-4 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/5 dark:bg-white/5">
          {/* Left toolbar tools */}
          <div className="flex items-center gap-2">
            {/* Color Palette */}
            <div className="flex items-center gap-1">
              {MORANDI_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    color === c.id
                      ? "scale-125 ring-2 ring-amber-500"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.dotBg }}
                  title={c.name}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

            <button
              type="button"
              onClick={() => setShowReminderPicker(!showReminderPicker)}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                reminderDate
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              title={t.setReminderTooltip}
            >
              <Bell className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">
                {reminderDate ? t.reminderSetBtn : t.reminderUnsetBtn}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setType(type === "text" ? "list" : "text")}
              className="p-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {type === "text" ? t.switchToList : t.switchToText}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAiAnalyze}
              className="p-1.5 rounded-lg text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex items-center gap-1 font-medium"
              title={t.reAnalyzeTooltip}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">{t.reAnalyzeBtn}</span>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onTrash(note.id);
                onClose();
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
              title={t.trashTooltip}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSaving}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold shadow-sm transition-colors"
              id="save-note-modal-btn"
            >
              {isSaving ? (language === "en" ? "Saving…" : "保存中…") : t.doneAndSaveBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
