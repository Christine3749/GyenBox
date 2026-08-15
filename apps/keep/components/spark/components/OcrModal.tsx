import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { ChecklistItem, NoteColorId } from "../types";
import { useAi } from "../context/AiContext";
import { useLanguage } from "../context/LanguageContext";
import { colorForCategory } from "../category-colors";

interface OcrModalProps {
  onAddNote: (note: {
    title: string;
    content: string;
    type: "text" | "list";
    items: ChecklistItem[];
    color: NoteColorId;
    isPinned: boolean;
    labels: string[];
  }) => void;
  onClose: () => void;
}

type OcrResult = {
  title?: string;
  type?: "text" | "list";
  content?: string;
  items?: Array<{ text?: string; completed?: boolean }>;
  tags?: string[];
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export const OcrModal: React.FC<OcrModalProps> = ({ onAddNote, onClose }) => {
  const { language, t } = useLanguage();
  const ai = useAi();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<OcrResult | null>(null);
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const chooseFile = (next: File | null) => {
    setStructuredData(null);
    setMessage(null);
    if (!next) return setFile(null);
    if (!ACCEPTED_TYPES.has(next.type)) {
      setFile(null);
      setMessage(language === "en" ? "Use a PNG, JPEG, or WebP image." : "请上传 PNG、JPEG 或 WebP 图片。");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      setFile(null);
      setMessage(language === "en" ? "Image must be 8 MB or smaller." : "图片大小不能超过 8 MB。");
      return;
    }
    setFile(next);
  };

  const handleProcessImage = async () => {
    if (!file) {
      setMessage(language === "en" ? "Choose an image first." : "请先选择一张图片。");
      return;
    }
    if (!ai.configured) {
      setMessage(language === "en" ? "Add your Gemini API Token in Keep AI settings first." : "请先在 Keep AI 设置中填写 Gemini API Token。");
      return;
    }
    setIsProcessing(true);
    setMessage(null);
    try {
      const data = await readAsBase64(file);
      const result = await ai.request<OcrResult>("ocr", { imageData: data, mimeType: file.type, language });
      setStructuredData(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (language === "en" ? "OCR failed. Try a clearer image." : "识别失败，请尝试更清晰的图片。"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!structuredData) return;
    const title = structuredData.title?.trim() || (language === "en" ? "Scanned note" : "图片识别便签");
    const content = structuredData.content?.trim() || "";
    const tags = Array.isArray(structuredData.tags) ? structuredData.tags.filter(Boolean).slice(0, 6) : [];
    onAddNote({
      title,
      content,
      type: structuredData.type === "list" ? "list" : "text",
      items: (structuredData.items ?? []).filter((item) => item.text?.trim()).slice(0, 50).map((item, index) => ({
        id: "ocr-" + Date.now() + "-" + index,
        text: item.text!.trim(),
        completed: Boolean(item.completed),
      })),
      color: colorForCategory({ id: String(Date.now()) + title, title, content, labels: tags }),
      isPinned: false,
      labels: tags,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><ImageIcon className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{t.ocrModalHeader}</h3>
              <p className="text-xs text-zinc-500">{language === "en" ? "Upload a real image. Keep extracts structured text with Gemini vision." : "上传真实图片；Keep 使用 Gemini 视觉模型提取结构化文字与清单。"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <label className="block rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 text-center cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            {previewUrl ? <img src={previewUrl} alt="Selected OCR source" className="mx-auto max-h-56 max-w-full rounded-lg object-contain" /> : <><Upload className="mx-auto mb-2 w-6 h-6 text-indigo-500" /><p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{language === "en" ? "Choose an image to scan" : "选择要识别的图片"}</p><p className="mt-1 text-xs text-zinc-500">PNG / JPEG / WebP · 8 MB max</p></>}
          </label>
          {file && <p className="text-xs text-zinc-500 truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
          {message && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{message}</div>}

          <button onClick={handleProcessImage} disabled={isProcessing || !file} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <span>{isProcessing ? (language === "en" ? "Recognizing…" : "识别中…") : (language === "en" ? "Recognize and structure" : "识图并结构化")}</span>
          </button>

          {structuredData && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-300/60 dark:border-indigo-800/60 space-y-3">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">{t.ocrResultPreviewTitle}</span>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{structuredData.title || t.untitledNote}</h4>
              {(structuredData.items ?? []).map((item, index) => <div key={index} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200"><CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" /><span>{item.text}</span></div>)}
              {structuredData.content && <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{structuredData.content}</p>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-800/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full">{t.cancelBtn}</button>
          <button onClick={handleConfirmAdd} disabled={!structuredData} className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors">{language === "en" ? "Save recognized note" : "确认并保存识别便签"}</button>
        </div>
      </div>
    </div>
  );
};
