import React from 'react';
import { X, Check, FileText, Image as ImageIcon, Archive } from 'lucide-react';
import { UploadingFile, FileType } from '../types';
import { FILE_TYPE_CONFIG } from './FileCard';

interface UploadDrawerProps {
  files: UploadingFile[];
  onClose: () => void;
  isOpen: boolean;
}

export default function UploadDrawer({ files, onClose, isOpen }: UploadDrawerProps) {
  if (!isOpen || files.length === 0) return null;

  const totalUploading = files.filter(f => f.status === 'uploading').length;
  const headingText = totalUploading > 0 
    ? `Uploading ${files.length} file${files.length > 1 ? 's' : ''}` 
    : `Completed ${files.length} upload${files.length > 1 ? 's' : ''}`;

  return (
    <div
      id="upload-drawer"
      className="fixed bottom-5 right-5 w-[300px] bg-[#1F1F2E] border border-[#2A2A3D] rounded-xl shadow-2xl z-500 overflow-hidden animate-in slide-in-from-bottom-5 duration-200 select-none"
    >
      {/* HEADER */}
      <div className="px-4 py-3 border-b border-[#1E1E2E] flex items-center justify-between">
        <span className="font-sans font-semibold text-[13px] text-[#EEEEF8]">
          {headingText}
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md hover:bg-[#2A2A3D] text-[#8A8AA8] hover:text-[#EEEEF8] flex items-center justify-center cursor-pointer transition-colors"
          title="Minimize drawer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* FILE ROWS CONTAINER */}
      <div className="max-h-[220px] overflow-y-auto" id="upload-drawer-rows">
        {files.map((file) => {
          const config = FILE_TYPE_CONFIG[file.type] || { icon: FileText, color: '#8A8AA8' };
          const Icon = config.icon;
          const isDone = file.status === 'completed';

          return (
            <div
              key={file.id}
              className="px-4 py-2.5 border-t border-[#1E1E2E] flex flex-col gap-1.5 first:border-t-0"
              id={`upload-row-${file.id}`}
            >
              <div className="flex items-center gap-2">
                {/* File Icon */}
                <span className="flex-shrink-0" style={{ color: config.color }}>
                  <Icon className="w-4 h-4 fill-current opacity-85" />
                </span>

                {/* Filename */}
                <span className="flex-1 text-[12px] font-medium text-[#EEEEF8] truncate pr-2">
                  {file.name}
                </span>

                {/* Status indicator */}
                <span className="flex-shrink-0 font-mono text-[11px]">
                  {isDone ? (
                    <span className="text-[#1DB877] font-semibold flex items-center gap-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    </span>
                  ) : (
                    <span className="text-[#A99FF8] font-semibold">
                      {Math.round(file.progress)}%
                    </span>
                  )}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-[#2A2A3D] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDone ? 'bg-[#1DB877]' : 'bg-[#7C6AF7]'
                  }`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
