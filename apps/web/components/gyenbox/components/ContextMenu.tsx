import React, { useEffect, useRef } from 'react';
import { 
  Eye, 
  Download, 
  Share2, 
  Edit3, 
  Copy, 
  Move, 
  Star, 
  Trash2 
} from 'lucide-react';
import { FileItem } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  file: FileItem;
  onClose: () => void;
  onPreview: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onCopyTo: (file: FileItem) => void;
  onMoveTo: (file: FileItem) => void;
  onToggleStar: (file: FileItem) => void;
  onMoveToTrash: (file: FileItem) => void;
}

export default function ContextMenu({
  x,
  y,
  file,
  onClose,
  onPreview,
  onDownload,
  onShare,
  onRename,
  onCopyTo,
  onMoveTo,
  onToggleStar,
  onMoveToTrash
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Position adjustment to fit in viewport
  const [coords, setCoords] = React.useState({ left: x, top: y });

  useEffect(() => {
    if (menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth || 210;
      const menuHeight = menuRef.current.offsetHeight || 300;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + menuWidth > windowWidth) {
        adjustedX = windowWidth - menuWidth - 10;
      }
      if (y + menuHeight > windowHeight) {
        adjustedY = windowHeight - menuHeight - 10;
      }

      setCoords({ left: adjustedX, top: adjustedY });
    }
  }, [x, y]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay adding to avoid capturing the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('contextmenu', handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, [onClose]);

  const handleAction = (action: (f: FileItem) => void) => {
    action(file);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      id="context-menu"
      className="fixed bg-[#1F1F2E]/95 border border-[#2A2A3D] rounded-xl p-1 w-[210px] shadow-2xl backdrop-blur-md z-1000 select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
      }}
    >
      {/* 👁 Preview */}
      <button
        onClick={() => handleAction(onPreview)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#EEEEF8] hover:bg-[#2A2A3D] transition-colors cursor-pointer text-left font-medium"
      >
        <Eye className="w-4 h-4 text-[#8A8AA8] mr-2.5" />
        <span className="flex-1">Preview</span>
      </button>

      {/* ⬇️ Download */}
      <button
        onClick={() => handleAction(onDownload)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#EEEEF8] hover:bg-[#2A2A3D] transition-colors cursor-pointer text-left font-medium"
      >
        <Download className="w-4 h-4 text-[#8A8AA8] mr-2.5" />
        <span className="flex-1">Download</span>
        <span className="font-mono text-[10px] text-[#4A4A6A]">⌘D</span>
      </button>

      {/* 🔗 Share link */}
      <button
        onClick={() => handleAction(onShare)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#EEEEF8] hover:bg-[#2A2A3D] transition-colors cursor-pointer text-left font-medium"
      >
        <Share2 className="w-4 h-4 text-[#8A8AA8] mr-2.5" />
        <span className="flex-1">Share link</span>
        <span className="font-mono text-[10px] text-[#4A4A6A]">⌘S</span>
      </button>

      {/* Separator */}
      <div className="h-[1px] bg-[#1E1E2E] my-1" />

      {/* ✏️ Rename */}
      <button
        onClick={() => handleAction(onRename)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#EEEEF8] hover:bg-[#2A2A3D] transition-colors cursor-pointer text-left font-medium"
      >
        <Edit3 className="w-4 h-4 text-[#8A8AA8] mr-2.5" />
        <span className="flex-1">Rename</span>
      </button>

      {/* 📋 Copy to */}
      <button
        onClick={() => handleAction(onCopyTo)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#EEEEF8] hover:bg-[#2A2A3D] transition-colors cursor-pointer text-left font-medium"
      >
        <Copy className="w-4 h-4 text-[#8A8AA8] mr-2.5" />
        <span className="flex-1">Copy to...</span>
      </button>

      {/* ↗️ Move to */}
      <button
        onClick={() => handleAction(onMoveTo)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#EEEEF8] hover:bg-[#2A2A3D] transition-colors cursor-pointer text-left font-medium"
      >
        <Move className="w-4 h-4 text-[#8A8AA8] mr-2.5" />
        <span className="flex-1">Move to...</span>
      </button>

      {/* Separator */}
      <div className="h-[1px] bg-[#1E1E2E] my-1" />

      {/* ⭐ Star/Unstar */}
      <button
        onClick={() => handleAction(onToggleStar)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#EEEEF8] hover:bg-[#2A2A3D] transition-colors cursor-pointer text-left font-medium"
      >
        <Star className={`w-4 h-4 mr-2.5 ${file.starred ? 'text-[#F0A500] fill-[#F0A500]' : 'text-[#8A8AA8]'}`} />
        <span className="flex-1">{file.starred ? 'Remove from Starred' : 'Add to Starred'}</span>
      </button>

      {/* Separator */}
      <div className="h-[1px] bg-[#1E1E2E] my-1" />

      {/* 🗑️ Move to Trash */}
      <button
        onClick={() => handleAction(onMoveToTrash)}
        className="w-full h-8.5 px-3 rounded-lg flex items-center text-[13px] text-[#E8445A] hover:bg-[#E8445A]/10 transition-colors cursor-pointer text-left font-medium"
      >
        <Trash2 className="w-4 h-4 text-[#E8445A] mr-2.5" />
        <span className="flex-1">Move to Trash</span>
        <span className="font-mono text-[10px] text-[#E8445A]/70">Del</span>
      </button>
    </div>
  );
}
