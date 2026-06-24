import React, { useRef, useEffect } from 'react';
import { Search, Bell, Upload } from 'lucide-react';
import { FileItem } from '../types';

interface TopbarProps {
  currentFolder: FileItem | null;
  onNavigateToFolder: (folderId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onUploadClick: () => void;
  onNotificationClick: () => void;
  onAvatarClick: () => void;
}

export default function Topbar({
  currentFolder,
  onNavigateToFolder,
  searchQuery,
  setSearchQuery,
  onUploadClick,
  onNotificationClick,
  onAvatarClick
}: TopbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on Command+K or Control+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 w-full h-[56px] bg-[#0F0F1A] border-b border-[#1E1E2E] px-5 flex items-center gap-3 z-100 select-none" id="topbar">
      {/* LEFT BRAND SECTION */}
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigateToFolder(null)} id="brand-container">
        {/* Logo Mark */}
        <div className="w-7 h-7 bg-[#7C6AF7] rounded-md flex items-center justify-center border border-[#7C6AF7]" id="logo-mark">
          <span className="font-sans font-bold text-[14px] text-white">G</span>
        </div>
        {/* Wordmark */}
        <span className="font-sans font-semibold text-[15px] text-[#EEEEF8]" id="logo-wordmark">
          yenbox
        </span>
      </div>

      {/* SEPARATOR */}
      <div className="w-[1px] h-5 bg-[#1E1E2E] mx-1" />

      {/* BREADCRUMB */}
      <div className="flex items-center gap-1.5 text-[13px] font-medium" id="breadcrumb-container">
        <span 
          onClick={() => onNavigateToFolder(null)}
          className="text-[#8A8AA8] hover:text-[#EEEEF8] transition-colors duration-150 cursor-pointer"
        >
          My Files
        </span>
        {currentFolder && (
          <>
            <span className="text-[#4A4A6A] font-mono">/</span>
            <span 
              onClick={() => onNavigateToFolder(currentFolder.id)}
              className="text-[#EEEEF8] hover:text-[#7C6AF7] transition-colors duration-150 cursor-pointer"
            >
              {currentFolder.name}
            </span>
          </>
        )}
      </div>

      {/* CENTER SEARCH BAR */}
      <div className="flex-1 max-w-[440px] mx-auto relative group" id="search-container">
        <Search className="w-3.5 h-3.5 text-[#4A4A6A] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          ref={searchInputRef}
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full h-[34px] bg-[#13131F] border border-[#2A2A3D] rounded-lg pl-9 pr-12 text-[13px] text-[#EEEEF8] placeholder-[#4A4A6A] focus:outline-none focus:border-[#7C6AF7] focus:ring-3 focus:ring-[#7C6AF7]/15 transition-all duration-150"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#1F1F2E] px-1.5 py-0.5 rounded border border-[#2A2A3D] pointer-events-none select-none">
          <span className="font-mono text-[9px] text-[#4A4A6A]">⌘K</span>
        </div>
      </div>

      {/* RIGHT ACTION CONTROLS */}
      <div className="flex items-center gap-2" id="topbar-actions">
        {/* Upload Button */}
        <button
          onClick={onUploadClick}
          id="upload-btn"
          className="h-8 px-3.5 bg-[#7C6AF7] hover:bg-[#5B4FD4] text-white text-[13px] font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors duration-150 active:scale-[0.98]"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>+ Upload</span>
        </button>

        {/* Notification Button */}
        <button
          onClick={onNotificationClick}
          id="notifications-btn"
          className="w-8 h-8 flex items-center justify-center border border-[#2A2A3D] rounded-lg text-[#8A8AA8] hover:bg-[#171724] hover:text-[#EEEEF8] cursor-pointer transition-colors duration-150 relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {/* Notification Dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#7C6AF7] rounded-full ring-1 ring-[#0F0F1A]" />
        </button>

        {/* User Avatar */}
        <div
          onClick={onAvatarClick}
          id="user-avatar-btn"
          className="w-7 h-7 rounded-full bg-[#7C6AF7] flex items-center justify-center text-white text-[11px] font-semibold cursor-pointer select-none hover:ring-2 hover:ring-[#A99FF8]/50 transition-all duration-150"
          title="Account info (Ethan Li)"
        >
          EL
        </div>
      </div>
    </header>
  );
}
