import React from 'react';
import { Search, Bell, Upload } from 'lucide-react';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUploadClick: () => void;
  currentPath: { id: string | null; name: string }[];
  onBreadcrumbClick: (folderId: string | null) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  notificationCount: number;
  onNotificationClick: () => void;
}

export default function Topbar({
  searchQuery,
  onSearchChange,
  onUploadClick,
  currentPath,
  onBreadcrumbClick,
  searchInputRef,
  notificationCount,
  onNotificationClick,
}: TopbarProps) {
  return (
    <header className="h-14 sticky top-0 z-50 bg-surface border-b border-border-subtle px-5 flex items-center gap-3">
      {/* LEFT: Logo and wordmark */}
      <div className="flex items-center gap-2 select-none">
        <div
          onClick={() => onBreadcrumbClick(null)}
          className="w-7 h-7 shrink-0 cursor-pointer transition-transform hover:scale-[1.03]"
          title="Go to Home Root"
        >
          <svg viewBox="0 0 64 64" role="img" aria-label="GyenBox" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="56" height="56" rx="14" fill="#0A0E14" />
            <rect x="4.5" y="4.5" width="55" height="55" rx="13.5" stroke="white" strokeOpacity="0.14" />
            <path d="M32 9.5 53 21.5 32 33.5 11 21.5 32 9.5Z" fill="#133047" stroke="#3B82F6" strokeOpacity="0.7" />
            <path d="M11 22 32 34v21L11 43V22Z" fill="#0C1723" stroke="#1D4ED8" strokeOpacity="0.65" />
            <path d="M53 22 32 34v21l21-12V22Z" fill="#122033" stroke="#F97316" strokeOpacity="0.75" />
            <path d="M21 22.3 32 16l11 6.3-11 6.2-11-6.2Z" fill="#F8FAFC" fillOpacity="0.92" />
            <path d="M26.5 22.3 32 19.2l5.5 3.1-5.5 3.1-5.5-3.1Z" fill="#0A0E14" />
            <path d="M20 33.5v7.8l7.3 4.2" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 31.5h-8.2c-5.3 0-9.5 4-9.5 9.1 0 5.3 4.2 9.2 9.6 9.2H44" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M42 40.6h-7" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <span
          onClick={() => onBreadcrumbClick(null)}
          className="font-sans font-semibold text-base text-text-primary cursor-pointer hover:text-white transition-colors"
        >
          Gyen<span className="text-[#FDBA74]">Box</span>
        </span>

        {/* Separator line */}
        <div className="w-[1px] h-5 bg-border-subtle mx-1"></div>

        {/* Path Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-text-secondary overflow-hidden max-w-[200px] sm:max-w-xs md:max-w-md whitespace-nowrap">
          {currentPath.map((node, idx) => (
            <React.Fragment key={node.id || 'root'}>
              {idx > 0 && <span className="text-text-muted">›</span>}
              <button
                onClick={() => onBreadcrumbClick(node.id)}
                className={`hover:text-text-primary transition-colors cursor-pointer truncate ${
                  idx === currentPath.length - 1 ? 'text-text-primary font-medium' : 'text-text-secondary'
                }`}
              >
                {node.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* CENTER: Search Bar */}
      <div className="flex-1 max-w-[440px] mx-auto relative hidden sm:block">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <Search size={14} className="text-text-muted" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files..."
          className="w-full h-[34px] bg-card-bg border border-border-default rounded-lg pl-9 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-3 focus:ring-[rgba(124,106,247,0.15)] transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <kbd className="font-mono text-[10px] text-text-muted px-1.5 py-0.5 rounded border border-border-subtle bg-page-bg">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* RIGHT: Action Buttons and Avatar */}
      <div className="ml-auto flex items-center gap-2">
        {/* Mobile search indicator */}
        <button 
          onClick={() => searchInputRef.current?.focus()}
          className="sm:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-card-hover rounded-lg transition-colors cursor-pointer"
        >
          <Search size={16} />
        </button>

        {/* Upload Button */}
        <button
          onClick={onUploadClick}
          className="h-8 px-3.5 bg-accent hover:bg-accent-dim rounded-lg flex items-center gap-1.5 text-white font-sans font-semibold text-xs cursor-pointer transition-colors"
        >
          <Upload size={13} />
          <span>+ Upload</span>
        </button>

        {/* Notification Button */}
        <button
          onClick={onNotificationClick}
          className="relative w-8 h-8 flex items-center justify-center border border-border-default rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors cursor-pointer"
        >
          <Bell size={16} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full ring-2 ring-surface" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div 
          className="w-7 h-7 rounded-full bg-accent flex items-center justify-center cursor-pointer border border-accent-dim hover:ring-2 hover:ring-accent hover:ring-opacity-50 transition-all select-none"
          title="User Account: Ethan Li (EL)"
        >
          <span className="font-sans font-semibold text-[11px] text-white">EL</span>
        </div>
      </div>
    </header>
  );
}
