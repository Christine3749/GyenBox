"use client";

import React, { useState } from 'react';
import { LayoutMode, ThemeMode } from '@/types';
import {
  Menu,
  Search,
  X,
  LayoutGrid,
  List,
  Sun,
  Moon,
  User,
  Download,
  Upload,
  LogOut,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layoutMode: LayoutMode;
  onToggleLayout: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onExportNotes: () => void;
  onImportNotes: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userEmail: string | null;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  layoutMode,
  onToggleLayout,
  themeMode,
  onToggleTheme,
  onToggleSidebar,
  onExportNotes,
  onImportNotes,
  userEmail,
  onSignOut,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const initial = (userEmail?.[0] ?? 'K').toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-3 text-zinc-800 dark:text-zinc-100 transition-colors">
      {/* Left section: Hamburger & Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          title="Main menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 select-none cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-sm flex items-center justify-center text-white font-bold">
            <span className="text-xl leading-none">💡</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-100 hidden sm:inline-block">
            Keep
          </span>
        </div>
      </div>

      {/* Center section: Search Bar */}
      <div className="flex-1 max-w-2xl mx-2">
        <div className="relative flex items-center w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes, labels, checklists..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-100/90 dark:hover:bg-zinc-800 text-sm rounded-2xl border border-transparent focus:border-amber-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right section: Quick Action Buttons & Account */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Layout toggle (Grid vs List) */}
        <button
          onClick={onToggleLayout}
          className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          title={layoutMode === 'grid' ? 'List view' : 'Grid view'}
        >
          {layoutMode === 'grid' ? (
            <List className="w-5 h-5" />
          ) : (
            <LayoutGrid className="w-5 h-5" />
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          title={themeMode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-zinc-600" />
          )}
        </button>

        {/* User Account Menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-bold flex items-center justify-center shadow-xs hover:ring-2 hover:ring-amber-400/50 transition-all cursor-pointer"
            title="Account"
          >
            {initial}
          </button>

          {isUserMenuOpen && (
            <div
              className="absolute right-0 top-11 w-64 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 p-3 text-sm text-zinc-800 dark:text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 pb-3 mb-2 border-b border-zinc-100 dark:border-zinc-700">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-lg flex items-center justify-center">
                  {initial}
                </div>
                <div className="truncate">
                  <p className="font-semibold text-sm truncate">{userEmail ?? 'GyenBox account'}</p>
                  <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" /> Synced to your account
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    onExportNotes();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-500" /> Export Backup (.json)
                </button>

                <label className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-amber-500" /> Import Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      onImportNotes(e);
                      setIsUserMenuOpen(false);
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors mt-2 border-t border-zinc-100 dark:border-zinc-700"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
