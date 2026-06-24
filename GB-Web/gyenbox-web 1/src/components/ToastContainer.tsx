import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-[1000] flex flex-col gap-2 select-none pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void; key?: string }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const duration = 4000; // 4 seconds
    const intervalTime = 40; // 40ms updates
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, onDismiss, toast.id]);

  let typeColor = '#3B9EFF'; // Default info
  let Icon = Info;

  switch (toast.type) {
    case 'success':
      typeColor = '#1DB877';
      Icon = CheckCircle;
      break;
    case 'error':
      typeColor = '#E8445A';
      Icon = XCircle;
      break;
    case 'warning':
      typeColor = '#F0A500';
      Icon = AlertTriangle;
      break;
    case 'info':
    default:
      typeColor = '#3B9EFF';
      Icon = Info;
      break;
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-80 bg-[#1F1F2E] border border-border-default rounded-lg shadow-2xl relative overflow-hidden pointer-events-auto transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right duration-200"
      style={{ borderLeft: `3px solid ${typeColor}` }}
    >
      <div className="p-3.5 flex items-start gap-2.5">
        {/* ICON */}
        <div className="shrink-0 mt-0.5" style={{ color: typeColor }}>
          <Icon size={15} />
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          <span className="font-sans font-semibold text-[13px] text-text-primary block leading-tight">
            {toast.title}
          </span>
          <p className="font-sans text-xs text-text-secondary mt-1 leading-relaxed">
            {toast.body}
          </p>
        </div>

        {/* CLOSE BUTTON */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 w-4 h-4 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border-strong rounded cursor-pointer transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* DEPLETER PROGRESS BAR (at bottom) */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-border-subtle/30">
        <div
          style={{ width: `${progress}%`, backgroundColor: typeColor }}
          className="h-full transition-all duration-75 ease-linear"
        />
      </div>
    </div>
  );
}
