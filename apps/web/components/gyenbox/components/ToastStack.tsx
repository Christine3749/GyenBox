import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastItem } from '../types';

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div
      id="toast-stack"
      className="fixed top-5 right-5 z-1000 flex flex-col gap-2 items-end pointer-events-none select-none max-w-[340px]"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { key?: string; toast: ToastItem; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const progressRef = useRef(100);
  const intervalRef = useRef<number | null>(null);

  const duration = toast.duration || 4000; // default 4s
  const stepTime = 40; // 40ms updates (25 frames/sec)
  const decrement = (stepTime / duration) * 100;

  useEffect(() => {
    if (!isHovered) {
      intervalRef.current = window.setInterval(() => {
        progressRef.current = Math.max(0, progressRef.current - decrement);
        setProgress(progressRef.current);

        if (progressRef.current <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onDismiss(toast.id);
        }
      }, stepTime);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, decrement, toast.id, onDismiss]);

  // Color config mapping
  const config = {
    success: {
      color: '#1DB877',
      icon: CheckCircle2,
    },
    error: {
      color: '#E8445A',
      icon: XCircleReplacement, // we will use AlertCircle with correct color
    },
    info: {
      color: '#3B9EFF',
      icon: Info,
    },
    warning: {
      color: '#F0A500',
      icon: AlertTriangle,
    },
  }[toast.type] || { color: '#3B9EFF', icon: Info };

  function XCircleReplacement(props: any) {
    return (
      <div className="w-4 h-4 bg-[#E8445A]/20 border border-[#E8445A]/40 rounded-full flex items-center justify-center text-[#E8445A]">
        <X className="w-2.5 h-2.5 stroke-[3px]" />
      </div>
    );
  }

  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 120, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 250 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id={`toast-${toast.id}`}
      className="pointer-events-auto w-[320px] bg-[#1F1F2E] border border-[#2A2A3D] rounded-lg shadow-2xl overflow-hidden relative cursor-pointer"
      style={{
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      {/* CONTENT ROW */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-start gap-2.5">
          {/* Icon */}
          <span className="mt-0.5 flex-shrink-0" style={{ color: config.color }}>
            <IconComponent className="w-4 h-4" />
          </span>

          {/* Texts */}
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-semibold text-[#EEEEF8] leading-tight truncate">
              {toast.title}
            </h4>
            <p className="text-[12px] text-[#8A8AA8] leading-normal mt-1 pr-1 break-words">
              {toast.body}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 w-5 h-5 rounded hover:bg-[#2A2A3D] text-[#4A4A6A] hover:text-[#EEEEF8] flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* DEPLETING PROGRESS BAR (2px bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2A2A3D]/40">
        <div
          className="h-full transition-all duration-75"
          style={{
            backgroundColor: config.color,
            width: `${progress}%`,
          }}
        />
      </div>
    </motion.div>
  );
}
