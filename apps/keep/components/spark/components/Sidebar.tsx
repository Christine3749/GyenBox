import React, { useEffect, useRef, useState } from "react";
import {
  StickyNote,
  Bell,
  Tag,
  Archive,
  Trash2,
  Plus,
  Pencil,
  Sparkles,
} from "lucide-react";
import { NavFilter } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface SidebarProps {
  navFilter: NavFilter;
  setNavFilter: (filter: NavFilter) => void;
  labels: string[];
  onOpenEditLabels: () => void;
  onRestoreDefaultLabels: () => void;
  isRestoringDefaultLabels: boolean;
  notesCount: number;
  remindersCount: number;
  archiveCount: number;
  trashCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  navFilter,
  setNavFilter,
  labels,
  onOpenEditLabels,
  onRestoreDefaultLabels,
  isRestoringDefaultLabels,
  notesCount,
  remindersCount,
  archiveCount,
  trashCount,
  sidebarOpen,
  setSidebarOpen,
}) => {
  const { t } = useLanguage();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isDrawerMode, setIsDrawerMode] = useState(false);

  useEffect(() => {
    const updateDrawerMode = () => {
      const nextDrawerMode = window.innerWidth < 1280;
      setIsDrawerMode(nextDrawerMode);
      if (!nextDrawerMode) setSidebarOpen(false);
    };

    updateDrawerMode();
    window.addEventListener("resize", updateDrawerMode);
    return () => window.removeEventListener("resize", updateDrawerMode);
  }, [setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen || !isDrawerMode) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFirstNavItem = window.requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>("#nav-notes-btn")?.focus();
    });

    const handleDrawerKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleDrawerKeys);

    return () => {
      window.cancelAnimationFrame(focusFirstNavItem);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDrawerKeys);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isDrawerMode, sidebarOpen, setSidebarOpen]);

  const handleNavClick = (filter: NavFilter) => {
    setNavFilter(filter);
    // The navigation becomes a drawer below the desktop layout breakpoint.
    if (window.innerWidth < 1280) {
      setSidebarOpen(false);
    }
  };

  const handleOpenLabels = () => {
    onOpenEditLabels();
    if (window.innerWidth < 1280) setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-20 xl:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        ref={drawerRef}
        id="keep-navigation"
        aria-label="Keep navigation"
        aria-hidden={isDrawerMode && !sidebarOpen ? true : undefined}
        inert={isDrawerMode && !sidebarOpen ? true : undefined}
        className={`fixed xl:static inset-y-0 left-0 z-20 w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {/* Main Views */}
          <div className="space-y-1">
            <button
              onClick={() => handleNavClick("notes")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                navFilter === "notes"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200 font-semibold"
                  : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
              id="nav-notes-btn"
            >
              <div className="flex items-center gap-3">
                <StickyNote className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{t.navAllNotes}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">{notesCount}</span>
            </button>

            <button
              onClick={() => handleNavClick("reminders")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                navFilter === "reminders"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200 font-semibold"
                  : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
              id="nav-reminders-btn"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                <span>{t.navReminders}</span>
              </div>
              {remindersCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                  {remindersCount}
                </span>
              )}
            </button>
          </div>

          <hr className="border-slate-100 dark:border-zinc-800 my-2" />

          {/* Labels Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>{t.navLabelsHeading}</span>
              <button
                onClick={handleOpenLabels}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                title={t.navManageLabelsTooltip}
                id="manage-labels-btn"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {labels.map((label, idx) => {
              const isSelected = navFilter === label;
              // Subtle color dots for labels
              const dotColors = [
                "bg-blue-400",
                "bg-emerald-400",
                "bg-amber-400",
                "bg-purple-400",
                "bg-rose-400",
                "bg-indigo-400",
              ];
              const dotClass = dotColors[idx % dotColors.length];

              return (
                <button
                  key={label}
                  onClick={() => handleNavClick(label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200 font-semibold"
                      : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                    <span className="truncate">{label}</span>
                  </div>
                </button>
              );
            })}

            {labels.length === 0 && (
              <button
                type="button"
                onClick={onRestoreDefaultLabels}
                disabled={isRestoringDefaultLabels}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 disabled:cursor-wait disabled:opacity-60 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isRestoringDefaultLabels ? "…" : t.restoreDefaultLabels}</span>
              </button>
            )}

            <button
              onClick={handleOpenLabels}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t.navNewManageLabels}</span>
            </button>
          </div>

          <hr className="border-slate-100 dark:border-zinc-800 my-2" />

          {/* Archive & Trash */}
          <div className="space-y-1">
            <button
              onClick={() => handleNavClick("archive")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                navFilter === "archive"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200 font-semibold"
                  : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
              id="nav-archive-btn"
            >
              <div className="flex items-center gap-3">
                <Archive className="w-4 h-4 text-slate-500" />
                <span>{t.navArchive}</span>
              </div>
              <span className="text-xs text-slate-400">{archiveCount}</span>
            </button>

            <button
              onClick={() => handleNavClick("trash")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                navFilter === "trash"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200 font-semibold"
                  : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
              id="nav-trash-btn"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>{t.navTrash}</span>
              </div>
              <span className="text-xs text-slate-400">{trashCount}</span>
            </button>
          </div>
        </div>

        {/* AI Storage Insight Bottom Box */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800">
          <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-1">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              {t.aiInsightTitle}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-400 leading-snug">
              {t.aiInsightText}{" "}
              <span
                onClick={() => handleNavClick("notes")}
                className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer underline hover:text-indigo-700"
              >
                {t.aiInsightLink}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
