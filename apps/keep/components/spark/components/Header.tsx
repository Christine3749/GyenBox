import React from "react";
import {
  Search,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Moon,
  Sun,
  Menu,
  X,
  Globe,
  Settings2,
} from "lucide-react";
import { ViewMode } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { KeepLogo } from "./KeepLogo";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSemanticSearch: boolean;
  setIsSemanticSearch: (v: boolean) => void;
  isSearching: boolean;
  onTriggerSemanticSearch: () => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  showAiBanner: boolean;
  setShowAiBanner: (v: boolean) => void;
  aiRecommendationCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  onOpenAiSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  isSemanticSearch,
  setIsSemanticSearch,
  isSearching,
  onTriggerSemanticSearch,
  viewMode,
  setViewMode,
  darkMode,
  setDarkMode,
  showAiBanner,
  setShowAiBanner,
  aiRecommendationCount,
  sidebarOpen,
  setSidebarOpen,
  onOpenAiSettings,
}) => {
  const { language, toggleLanguage, t } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      onTriggerSemanticSearch();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 transition-colors">
      {/* Left: Mobile Menu + Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer select-none active:scale-95 xl:hidden"
          title="Toggle Sidebar"
          id="toggle-sidebar-btn"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-controls="keep-navigation"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 select-none" aria-label="Gyen Keep">
            <KeepLogo deliverableId="mark-only" size="100%" className="block dark:hidden" showShadow={false} />
            <KeepLogo deliverableId="dark-mode" size="100%" className="hidden dark:block" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-zinc-100 tracking-tight leading-tight flex items-center gap-2">
              {t.appName}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 uppercase tracking-wider select-none">
                {t.appBadge}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:block">
              {t.appTagline}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Search Bar with Semantic AI Toggle */}
      <div className="flex-1 max-w-2xl mx-4">
        <div className="relative flex items-center group">
          <div className="absolute left-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors flex items-center">
            <Search className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isSemanticSearch
                ? t.searchPlaceholderSemantic
                : t.searchPlaceholderExact
            }
            className="w-full pl-10 pr-28 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-zinc-800/90 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 border border-transparent focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none transition-all"
            id="main-search-input"
          />

          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const next = !isSemanticSearch;
                setIsSemanticSearch(next);
                if (next && searchQuery.trim()) {
                  onTriggerSemanticSearch();
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer select-none active:scale-95 transition-all ${
                isSemanticSearch
                  ? "bg-indigo-600 text-white shadow-xs hover:bg-indigo-700"
                  : "bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-600"
              }`}
              title={t.semanticSearchTooltip}
              id="toggle-semantic-search-btn"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSearching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {isSemanticSearch ? t.semanticSearchBtn : t.keywordSearchBtn}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all shadow-2xs"
          title={t.languageToggleTooltip}
          id="language-switcher-btn"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{language === "zh" ? "中文" : "EN"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenAiSettings}
          className="p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer select-none active:scale-95 transition-all"
          title="Keep AI 设置"
          id="ai-settings-btn"
        >
          <Settings2 className="w-5 h-5" />
        </button>

        {/* AI Overview Toggle Button */}
        <button
          type="button"
          onClick={() => setShowAiBanner(!showAiBanner)}
          className={`relative p-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all ${
            showAiBanner
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800"
              : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
          title={t.todayCleanupTooltip}
          id="ai-overview-toggle-btn"
        >
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden lg:inline text-xs">{t.todayCleanupBtn}</span>
          {aiRecommendationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs">
              {aiRecommendationCount}
            </span>
          )}
        </button>

        {/* View Mode Toggle */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          className="p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer select-none active:scale-95 transition-all"
          title={viewMode === "grid" ? t.viewModeListTooltip : t.viewModeGridTooltip}
          id="view-mode-toggle-btn"
        >
          {viewMode === "grid" ? (
            <ListIcon className="w-5 h-5" />
          ) : (
            <LayoutGrid className="w-5 h-5" />
          )}
        </button>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer select-none active:scale-95 transition-all"
          title={darkMode ? t.darkModeLightTooltip : t.darkModeDarkTooltip}
          id="dark-mode-toggle-btn"
        >
          {darkMode ? <Moon className="w-5 h-5 text-slate-600 dark:text-zinc-300" /> : <Sun className="w-5 h-5 text-amber-400" />}
        </button>
      </div>
    </header>
  );
};
