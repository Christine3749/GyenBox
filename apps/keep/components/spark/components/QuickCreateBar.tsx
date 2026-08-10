import React, { useState, useRef } from "react";
import {
  CheckSquare,
  Mic,
  Image as ImageIcon,
  Pin,
  X,
  Plus,
  Sparkles,
} from "lucide-react";
import { NoteColorId, ChecklistItem } from "../types";
import { MORANDI_COLORS } from "../constants/colors";
import { useLanguage } from "../context/LanguageContext";

interface QuickCreateBarProps {
  onAddNote: (note: {
    title: string;
    content: string;
    type: "text" | "list";
    items: ChecklistItem[];
    color: NoteColorId;
    isPinned: boolean;
    labels: string[];
    imageUrl?: string;
  }) => void;
  onOpenVoiceModal: () => void;
  onOpenOcrModal: () => void;
  existingLabels: string[];
}

export const QuickCreateBar: React.FC<QuickCreateBarProps> = ({
  onAddNote,
  onOpenVoiceModal,
  onOpenOcrModal,
  existingLabels,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"text" | "list">("text");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [color, setColor] = useState<NoteColorId>("default");
  const [isPinned, setIsPinned] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement>(null);

  // Quick 100ms instant save when user hits Enter on single-line mode
  const handleQuickKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isExpanded) {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        onAddNote({
          title: "",
          content: value,
          type: "text",
          items: [],
          color: "default",
          isPinned: false,
          labels: [],
        });
        (e.target as HTMLInputElement).value = "";
        setContent("");
      }
    }
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim() && items.length === 0 && !imageUrl) {
      resetForm();
      setIsExpanded(false);
      return;
    }

    onAddNote({
      title: title.trim(),
      content: content.trim(),
      type,
      items: items.filter((i) => i.text.trim().length > 0),
      color,
      isPinned,
      labels: selectedLabels,
      imageUrl,
    });

    resetForm();
    setIsExpanded(false);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setType("text");
    setItems([]);
    setNewItemText("");
    setColor("default");
    setIsPinned(false);
    setSelectedLabels([]);
    setImageUrl(undefined);
  };

  const handleAddItem = () => {
    if (newItemText.trim()) {
      setItems([
        ...items,
        { id: `i-${Date.now()}-${Math.random()}`, text: newItemText.trim(), completed: false },
      ]);
      setNewItemText("");
    }
  };

  const toggleLabel = (label: string) => {
    if (selectedLabels.includes(label)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== label));
    } else {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  const currentColor = MORANDI_COLORS.find((c) => c.id === color) || MORANDI_COLORS[0];

  return (
    <div className="w-full max-w-2xl mx-auto my-4 px-2">
      <div
        ref={containerRef}
        className={`rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${currentColor.bgLight} ${currentColor.borderLight}`}
      >
        {!isExpanded ? (
          /* Minimized Bar: Quick 3-second Capture */
          <div className="flex items-center justify-between px-4 py-3 gap-2">
            <input
              type="text"
              placeholder={t.quickInputPlaceholder}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={handleQuickKeyDown}
              className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none font-medium"
              id="quick-note-input"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setType("list");
                  setIsExpanded(true);
                }}
                className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title={t.quickChecklistTooltip}
                id="quick-checklist-btn"
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenVoiceModal}
                className="p-1.5 rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1 text-xs font-medium"
                title={t.quickVoiceTooltip}
                id="quick-voice-btn"
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">{t.quickVoiceBtn}</span>
              </button>

              <button
                type="button"
                onClick={onOpenOcrModal}
                className="p-1.5 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center gap-1 text-xs font-medium"
                title={t.quickOcrTooltip}
                id="quick-ocr-btn"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.quickOcrBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Full Quick Editor */
          <div className="p-4 space-y-3">
            {/* Header: Title + Pin */}
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.editorTitlePlaceholder}
                className="w-full bg-transparent text-base font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                autoFocus
                id="expanded-note-title"
              />

              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-full transition-colors ${
                  isPinned
                    ? "text-amber-600 dark:text-amber-400 bg-amber-500/15"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
                title={isPinned ? t.unpinTooltip : t.pinTooltip}
              >
                <Pin className={`w-4 h-4 ${isPinned ? "fill-amber-500" : ""}`} />
              </button>
            </div>

            {/* Content or Checklist */}
            {type === "text" ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.editorContentPlaceholder}
                rows={3}
                className="w-full bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none resize-none leading-relaxed"
                id="expanded-note-content"
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
                      className="flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 text-sm pt-1">
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

            {/* Image Preview if exists */}
            {imageUrl && (
              <div className="relative rounded-lg overflow-hidden max-h-48 group">
                <img src={imageUrl} alt="attached" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(undefined)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Label Chips selector */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-zinc-400 mr-1">{t.labelsLabel}</span>
              {existingLabels.map((lbl) => {
                const selected = selectedLabels.includes(lbl);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => toggleLabel(lbl)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      selected
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions: Color picker + Mode toggle + Close / Save */}
            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                {/* Color Palette Picker */}
                <div className="flex items-center gap-1">
                  {MORANDI_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-5 h-5 rounded-full border transition-transform ${
                        color === c.id ? "scale-125 ring-2 ring-amber-500" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.dotBg }}
                      title={c.name}
                    />
                  ))}
                </div>

                <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 my-auto mx-1" />

                <button
                  type="button"
                  onClick={() => setType(type === "text" ? "list" : "text")}
                  className="p-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {type === "text" ? t.switchToList : t.switchToText}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsExpanded(false);
                  }}
                  className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {t.cancelBtn}
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-colors"
                  id="save-quick-note-btn"
                >
                  {t.saveNoteBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


