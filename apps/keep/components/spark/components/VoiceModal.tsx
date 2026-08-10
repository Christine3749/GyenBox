import React, { useState } from "react";
import { Mic, Sparkles, X, CheckSquare, Plus, RefreshCw } from "lucide-react";
import { NoteColorId, ChecklistItem } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { useAi } from "../context/AiContext";

interface VoiceModalProps {
  onAddNote: (note: {
    title: string;
    content: string;
    type: "text" | "list";
    items: ChecklistItem[];
    color: NoteColorId;
    isPinned: boolean;
    labels: string[];
    reminder?: { date: string };
  }) => void;
  onClose: () => void;
}

const SAMPLE_VOICE_SPEECHES_ZH = [
  "明天要买鸡蛋牛奶还有面包，另外记得交房租，对了后天下午两点团队开周会。",
  "周六去苹果直营店修MacBook屏幕，顺便去隔壁宜家买人体工学椅和落地灯。",
  "下周去关西旅游，要把关西周游券买了，预约岚山小火车，准备日元现金。",
];

const SAMPLE_VOICE_SPEECHES_EN = [
  "Buy eggs, milk, and bread tomorrow. Remember to pay rent. Also team weekly meeting at 2 PM the day after tomorrow.",
  "Go to Apple Store on Saturday to repair MacBook screen, then stop by IKEA for an ergonomic chair and floor lamp.",
  "Trip to Kyoto next week: buy Kansai railway pass, reserve Sagano romantic train ticket, prepare Japanese Yen cash.",
];

export const VoiceModal: React.FC<VoiceModalProps> = ({ onAddNote, onClose }) => {
  const { language, t } = useLanguage();
  const ai = useAi();
  const speeches = language === "en" ? SAMPLE_VOICE_SPEECHES_EN : SAMPLE_VOICE_SPEECHES_ZH;
  const [audioText, setAudioText] = useState(speeches[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Structured Output State
  const [structuredData, setStructuredData] = useState<{
    title: string;
    type: "text" | "list";
    items: { text: string; completed: boolean }[];
    noteBody: string;
    reminder: string | null;
    tags: string[];
  } | null>(null);

  const handleProcessVoice = async () => {
    if (!audioText.trim()) return;
    setIsProcessing(true);
    if (ai.configured) {
      try {
        const result = await ai.request<typeof structuredData>('structure-voice', { transcript: audioText, language });
        setStructuredData(result);
        return;
      } catch {
        // Create a usable local note when the API cannot be reached.
      } finally {
        setIsProcessing(false);
      }
    }
    const items = audioText.split(/[，,。.!！？!?；;]/).map((text) => text.trim()).filter(Boolean);
    setStructuredData({ title: language === "en" ? "Voice note" : "语音速记", type: items.length > 1 ? "list" : "text", items: items.map((text) => ({ text, completed: false })), noteBody: audioText.trim(), reminder: null, tags: [] });
    setIsProcessing(false);
  };

  const handleConfirmAdd = () => {
    if (!structuredData) return;

    onAddNote({
      title: structuredData.title || (language === "en" ? "Voice Note" : "语音速记便签"),
      content: structuredData.noteBody || "",
      type: structuredData.type || "list",
      items: (structuredData.items || []).map((i, idx) => ({
        id: `v-${Date.now()}-${idx}`,
        text: i.text,
        completed: false,
      })),
      color: "amber",
      isPinned: false,
      labels: structuredData.tags || [language === "en" ? "Voice Note" : "语音速记"],
      reminder: structuredData.reminder
        ? { date: new Date().toISOString().split("T")[0] + "T14:00" }
        : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {t.voiceModalHeader}
              </h3>
              <p className="text-xs text-zinc-500">
                {t.voiceModalSubheader}
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

        {/* Content */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Input Speech Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.voiceTextLabel}
              </label>

              <button
                type="button"
                onClick={() => {
                  const randomSpeech =
                    speeches[
                      Math.floor(Math.random() * speeches.length)
                    ];
                  setAudioText(randomSpeech);
                  setStructuredData(null);
                }}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {t.changeSampleSpeechBtn}
              </button>
            </div>

            <textarea
              value={audioText}
              onChange={(e) => {
                setAudioText(e.target.value);
                setStructuredData(null);
              }}
              rows={3}
              placeholder={t.voiceInputPlaceholder}
              className="w-full p-3 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Action to Parse */}
          <button
            onClick={handleProcessVoice}
            disabled={isProcessing || !audioText.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
            <span>{isProcessing ? t.voiceExtractingState : t.voiceProcessBtn}</span>
          </button>

          {/* Structured Output Preview */}
          {structuredData && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-300/60 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {t.voiceResultPreviewTitle}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {structuredData.title}
                </h4>

                {structuredData.items && structuredData.items.length > 0 && (
                  <div className="space-y-1">
                    {structuredData.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {structuredData.noteBody && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {structuredData.noteBody}
                  </p>
                )}

                {structuredData.tags && structuredData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {structuredData.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"
          >
            {t.cancelBtn}
          </button>

          <button
            onClick={handleConfirmAdd}
            disabled={!structuredData}
            className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors"
          >
            {t.confirmCreateNoteBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
