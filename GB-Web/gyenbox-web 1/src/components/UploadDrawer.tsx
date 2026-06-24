import { X, Check } from 'lucide-react';
import { UploadProgress } from '../types';
import { FileIcon } from './FileGrid';

interface UploadDrawerProps {
  queue: UploadProgress[];
  onClose: () => void;
  isOpen: boolean;
}

export default function UploadDrawer({
  queue,
  onClose,
  isOpen,
}: UploadDrawerProps) {
  if (!isOpen || queue.length === 0) return null;

  const uploadingCount = queue.filter((f) => f.status === 'uploading').length;

  return (
    <div className="fixed bottom-5 right-5 w-[300px] bg-overlay border border-border-default rounded-xl shadow-2xl z-[500] overflow-hidden select-none animate-in slide-in-from-bottom duration-200">
      {/* HEADER */}
      <div className="h-11 px-4 border-b border-border-subtle bg-surface flex items-center justify-between">
        <span className="font-sans font-semibold text-xs text-text-primary">
          {uploadingCount > 0 ? `Uploading ${uploadingCount} files` : 'Uploads complete'}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* FILE ROWS */}
      <div className="max-h-[240px] overflow-y-auto bg-overlay/85 divide-y divide-border-subtle/50">
        {queue.map((file) => {
          const isDone = file.status === 'done';
          return (
            <div key={file.id} className="p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs">
                {/* Small file icon */}
                <div className="shrink-0">
                  <FileIcon type={file.type} size={15} />
                </div>

                {/* Filename */}
                <span className="flex-1 font-sans font-medium text-text-primary truncate" title={file.name}>
                  {file.name}
                </span>

                {/* Percentage or checkmark status */}
                {isDone ? (
                  <span className="text-[10px] font-bold text-success flex items-center gap-0.5">
                    <Check size={11} strokeWidth={3} />
                    <span>Done</span>
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-accent-text font-semibold">
                    {Math.round(file.progress)}%
                  </span>
                )}
              </div>

              {/* Progress bar (full width) */}
              <div className="h-[2px] w-full bg-border-default rounded-full overflow-hidden">
                <div
                  style={{ width: `${file.progress}%` }}
                  className={`h-full transition-all duration-300 ease-out ${
                    isDone ? 'bg-success' : 'shimmer-bg'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
