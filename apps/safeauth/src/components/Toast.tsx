import React from "react";
import { CheckCircle2, Copy } from "lucide-react";

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="sa-toast fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-sm bg-[#121218] text-slate-100 border border-slate-800 text-xs font-mono font-bold uppercase tracking-wide">
      <CheckCircle2 size={16} className="text-emerald-400" />
      <span>{message}</span>
    </div>
  );
};
