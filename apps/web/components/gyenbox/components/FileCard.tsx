import React from 'react';
import { 
  Folder, 
  Image as ImageIcon, 
  FileText, 
  FileSpreadsheet, 
  Video, 
  Archive, 
  Check 
} from 'lucide-react';
import { FileItem, FileType } from '../types';

interface FileCardProps {
  key?: React.Key;
  file: FileItem;
  selected: boolean;
  viewMode: 'grid' | 'list';
  onSelect: (file: FileItem, isMultiSelect: boolean, isCheckboxClick?: boolean) => void;
  onDoubleClick: (file: FileItem) => void;
  onContextMenu: (file: FileItem, e: React.MouseEvent) => void;
}

// Map file types to beautiful Lucide icons and colors
export const FILE_TYPE_CONFIG: Record<FileType, { icon: React.ComponentType<any>; color: string; label: string }> = {
  folder: { icon: Folder, color: '#F0A500', label: 'Folder' },
  png: { icon: ImageIcon, color: '#FF6B9D', label: 'PNG' },
  jpg: { icon: ImageIcon, color: '#FF6B9D', label: 'JPG' },
  pdf: { icon: FileText, color: '#E8445A', label: 'PDF' },
  docx: { icon: FileText, color: '#3B9EFF', label: 'DOC' },
  xlsx: { icon: FileSpreadsheet, color: '#1DB877', label: 'XLS' },
  mp4: { icon: Video, color: '#7C6AF7', label: 'MP4' },
  zip: { icon: Archive, color: '#8A8AA8', label: 'ZIP' },
  txt: { icon: FileText, color: '#F0A500', label: 'TXT' },
};

export default function FileCard({
  file,
  selected,
  viewMode,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: FileCardProps) {
  const config = FILE_TYPE_CONFIG[file.type] || { icon: FileText, color: '#8A8AA8', label: 'FILE' };
  const Icon = config.icon;

  const handleCardClick = (e: React.MouseEvent) => {
    // If double click was triggered, don't interfere
    if (e.detail >= 2) return;
    onSelect(file, e.shiftKey || e.metaKey || e.ctrlKey);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(file, true, true);
  };

  const handleDouble = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(file);
  };

  if (viewMode === 'list') {
    // LIST VIEW ITEM
    return (
      <div
        id={`file-item-${file.id}`}
        onClick={handleCardClick}
        onDoubleClick={handleDouble}
        onContextMenu={(e) => onContextMenu(file, e)}
        className={`w-full h-11 px-4 border-b border-[#1E1E2E] flex items-center gap-3 cursor-pointer transition-all duration-150 select-none ${
          selected 
            ? 'bg-[#7C6AF7]/8 border-l-2 border-l-[#7C6AF7] pl-[14px]' 
            : 'hover:bg-[#171724]'
        }`}
      >
        {/* Checkbox */}
        <div 
          onClick={handleCheckboxClick}
          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            selected 
              ? 'bg-[#7C6AF7] border-[#7C6AF7]' 
              : 'border-[#3D3D5C] bg-[#1F1F2E] hover:border-[#7C6AF7]'
          }`}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
        </div>

        {/* Flat File Icon */}
        <div className="flex-shrink-0" style={{ color: config.color }}>
          <Icon className="w-5 h-5 fill-current opacity-90" />
        </div>

        {/* Filename */}
        <div className="flex-1 min-w-0 text-[13px] font-medium text-[#EEEEF8] truncate">
          {file.name}
        </div>

        {/* Type / Extension */}
        <div className="hidden md:block w-24 text-[11px] font-mono text-[#4A4A6A] uppercase">
          {config.label}
        </div>

        {/* Date Modified */}
        <div className="w-28 text-[11px] font-mono text-[#4A4A6A] text-right">
          {file.modifiedAt}
        </div>

        {/* File / Folder Size */}
        <div className="w-24 text-[11px] font-mono text-[#4A4A6A] text-right">
          {file.type === 'folder' ? `${file.itemCount} items` : file.size}
        </div>
      </div>
    );
  }

  // GRID VIEW CARD
  return (
    <div
      id={`file-card-${file.id}`}
      onClick={handleCardClick}
      onDoubleClick={handleDouble}
      onContextMenu={(e) => onContextMenu(file, e)}
      className={`group relative bg-[#13131F] border rounded-lg overflow-hidden cursor-pointer transition-all duration-150 select-none h-[142px] flex flex-col ${
        selected
          ? 'border-[#7C6AF7] ring-1 ring-[#7C6AF7]'
          : 'border-[#1E1E2E] hover:border-[#2A2A3D] hover:bg-[#171724] hover:-translate-y-0.5'
      }`}
    >
      {/* THUMBNAIL AREA (height 90px) */}
      <div className="relative h-[90px] w-full flex items-center justify-center bg-transparent">
        {/* Checkbox (visible on hover or when selected) */}
        <div
          onClick={handleCheckboxClick}
          className={`absolute top-2.5 left-2.5 w-4 h-4 rounded border flex items-center justify-center transition-opacity duration-150 ${
            selected 
              ? 'opacity-100 bg-[#7C6AF7] border-[#7C6AF7]' 
              : 'opacity-0 group-hover:opacity-100 border-[#3D3D5C] bg-[#1F1F2E] hover:border-[#7C6AF7]'
          }`}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
        </div>

        {/* Type Badge (top-right corner) */}
        {file.type !== 'folder' && (
          <div
            className="absolute top-2.5 right-2.5 bg-[#07070E]/85 border border-[#1E1E2E] rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase select-none pointer-events-none"
            style={{ color: config.color }}
          >
            {config.label}
          </div>
        )}

        {/* Big flat-colored file icon */}
        <div className="transition-transform duration-150 group-hover:scale-105" style={{ color: config.color }}>
          <Icon className="w-9 h-9 fill-current" />
        </div>
      </div>

      {/* CARD BODY (padding 10px 12px) */}
      <div className="p-3 pt-0 flex-1 min-w-0 flex flex-col justify-end">
        {/* Filename */}
        <div className="text-[13px] font-medium text-[#EEEEF8] truncate w-full" title={file.name}>
          {file.name}
        </div>

        {/* Metadata (JetBrains Mono 11px #4A4A6A) */}
        <div className="font-mono text-[11px] text-[#4A4A6A] mt-0.5 truncate flex items-center gap-1.5">
          {file.type === 'folder' ? (
            <>
              <span>{file.itemCount} items</span>
              <span>·</span>
              <span>{file.size}</span>
            </>
          ) : (
            <>
              <span>{file.modifiedAt}</span>
              <span>·</span>
              <span>{file.size}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
