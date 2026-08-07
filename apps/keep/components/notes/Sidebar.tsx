"use client";

import React from 'react';
import { ViewMode, Label } from '@/types';
import {
  StickyNote,
  Bell,
  Tag,
  Edit2,
  Archive,
  Trash2,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeView: ViewMode;
  selectedLabelId: string | null;
  labels: Label[];
  notesCount: number;
  remindersCount: number;
  archiveCount: number;
  trashCount: number;
  onSelectView: (view: ViewMode, labelId?: string | null) => void;
  onOpenLabelManager: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isExpandedDesktop: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  selectedLabelId,
  labels,
  notesCount,
  remindersCount,
  archiveCount,
  trashCount,
  onSelectView,
  onOpenLabelManager,
  isOpenMobile,
  onCloseMobile,
  isExpandedDesktop,
}) => {
  const navItems = [
    {
      id: 'notes',
      view: 'notes' as ViewMode,
      label: 'Notes',
      icon: StickyNote,
      count: notesCount,
    },
    {
      id: 'reminders',
      view: 'reminders' as ViewMode,
      label: 'Reminders',
      icon: Bell,
      count: remindersCount,
    },
  ];

  const secondaryNavItems = [
    {
      id: 'archive',
      view: 'archive' as ViewMode,
      label: 'Archive',
      icon: Archive,
      count: archiveCount,
    },
    {
      id: 'trash',
      view: 'trash' as ViewMode,
      label: 'Trash',
      icon: Trash2,
      count: trashCount,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full py-2 space-y-4 text-zinc-700 dark:text-zinc-300">
      {/* Primary views */}
      <div className="space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.view && !selectedLabelId;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectView(item.view, null);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-r-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-4 truncate">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                {isExpandedDesktop && <span className="truncate">{item.label}</span>}
              </div>
              {isExpandedDesktop && item.count > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Labels section */}
      <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 px-2 space-y-1">
        {isExpandedDesktop && (
          <div className="flex items-center justify-between px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <span>Labels</span>
          </div>
        )}

        {labels.map((label) => {
          const isActive = activeView === 'label' && selectedLabelId === label.id;
          return (
            <button
              key={label.id}
              onClick={() => {
                onSelectView('label', label.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-r-full text-sm transition-colors ${
                isActive
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-4 truncate">
                <Tag className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}`} />
                {isExpandedDesktop && <span className="truncate">{label.name}</span>}
              </div>
            </button>
          );
        })}

        {/* Edit Labels Button */}
        <button
          onClick={() => {
            onOpenLabelManager();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-4 px-4 py-2.5 rounded-r-full text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 transition-colors"
        >
          <Edit2 className="w-5 h-5 shrink-0 text-zinc-400" />
          {isExpandedDesktop && <span>Edit labels</span>}
        </button>
      </div>

      {/* Archive & Trash */}
      <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 px-2 space-y-1">
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.view;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectView(item.view, null);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-r-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-4 truncate">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                {isExpandedDesktop && <span className="truncate">{item.label}</span>}
              </div>
              {isExpandedDesktop && item.count > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent / Mini toggle) */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-300 ${
          isExpandedDesktop ? 'w-64' : 'w-20'
        }`}
      >
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pr-2">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80%] bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col pt-4">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-lg text-amber-500">Keep</span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
