import React from 'react';
import { Home, Folder, Users, Star, Clock, Trash2, Link2, FileText } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  storageUsed: number; // in GB
  onUpgradeClick: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, storageUsed, onUpgradeClick }: SidebarProps) {
  const mainNav = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'files', label: 'My Files', icon: Folder },
    { id: 'shared', label: 'Shared with me', icon: Users },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const toolsNav = [
    { id: 'requests', label: 'File Requests', icon: Link2 },
    { id: 'docs', label: 'Docs', icon: FileText },
  ];

  return (
    <nav className="w-[220px] h-full bg-[#0F0F1A] border-r border-[#1E1E2E] py-4 px-2.5 flex flex-col flex-shrink-0 overflow-y-auto select-none" id="sidebar-container">
      {/* SECTION LABEL: MAIN */}
      <div className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase mb-1.5 ml-2.5 mt-2">
        Main
      </div>

      <div className="space-y-0.5">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full h-[34px] px-2.5 rounded-lg flex items-center gap-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#7C6AF7]/12 text-[#A99FF8] border-l-2 border-[#7C6AF7] pl-2'
                  : 'text-[#8A8AA8] hover:bg-[#171724] hover:text-[#EEEEF8]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#A99FF8]' : 'text-[#8A8AA8]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION LABEL: TOOLS */}
      <div className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase mb-1.5 ml-2.5 mt-5">
        Tools
      </div>

      <div className="space-y-0.5">
        {toolsNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full h-[34px] px-2.5 rounded-lg flex items-center gap-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#7C6AF7]/12 text-[#A99FF8] border-l-2 border-[#7C6AF7] pl-2'
                  : 'text-[#8A8AA8] hover:bg-[#171724] hover:text-[#EEEEF8]'
              }`}
            >
              <Icon className="w-4 h-4 text-[#8A8AA8]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* SPACER */}
      <div className="flex-1" />

      {/* STORAGE SECTION */}
      <div className="mt-auto px-2.5 py-3 border-t border-[#1E1E2E]/50" id="sidebar-storage-box">
        <div className="flex justify-between items-center text-[11px] font-medium text-[#8A8AA8]">
          <span>Storage</span>
          <span className="font-mono text-[10px] text-[#4A4A6A]">{(storageUsed).toFixed(1)} GB / 10 GB</span>
        </div>

        {/* 3px segmented bar */}
        <div className="h-[3px] bg-[#2A2A3D] rounded-full my-1.5 flex overflow-hidden">
          {/* Segment 1: Images (55%) */}
          <div className="h-full bg-[#7C6AF7]" style={{ width: '55%' }} title="Images: 5.5 GB" />
          {/* Segment 2: Docs (8%) */}
          <div className="h-full bg-[#FF6B9D]" style={{ width: '8%' }} title="Docs: 0.8 GB" />
          {/* Segment 3: PDFs (5%) */}
          <div className="h-full bg-[#3B9EFF]" style={{ width: '5%' }} title="PDFs: 0.5 GB" />
        </div>

        <div className="font-mono text-[10px] text-[#4A4A6A] leading-tight mb-2.5">
          5.8 GB of 10 GB used
        </div>

        {/* Legend Row */}
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[9px] text-[#4A4A6A]">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7]" />
            Images
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B9D]" />
            Docs
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B9EFF]" />
            PDFs
          </span>
        </div>

        {/* Upgrade link */}
        <div 
          id="upgrade-storage-link"
          onClick={onUpgradeClick}
          className="mt-3 text-[12px] font-semibold text-[#A99FF8] hover:text-[#7C6AF7] transition-colors duration-150 cursor-pointer flex items-center"
        >
          Get more storage →
        </div>
      </div>
    </nav>
  );
}
