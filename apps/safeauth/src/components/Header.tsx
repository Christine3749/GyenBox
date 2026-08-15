import React, { useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Lock,
  ShieldCheck,
  LayoutList,
  LayoutGrid,
  Sun,
  Moon,
  Info,
} from "lucide-react";
import { ViewMode, ThemeMode } from "../types";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  themeMode: ThemeMode;
  onThemeToggle: () => void;
  onAddAccount: () => void;
  onLockVault: () => void;
  onOpenSecurityAbout: () => void;
  accountCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  themeMode,
  onThemeToggle,
  onAddAccount,
  onLockVault,
  onOpenSecurityAbout,
  accountCount,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for `/` to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if target is an input or textarea
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sa-header sticky top-0 z-30 w-full border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0C0E14] px-4 lg:px-8 py-3 flex items-center justify-between gap-4 select-none transition-colors">
      {/* Brand Title / Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="sa-brand-mark flex items-center justify-center p-2 rounded-sm bg-[#6D5EF5]/10 text-[#6D5EF5] border border-[#6D5EF5]/30">
          <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="sa-brand-name text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
              SafeAuth_Vault
            </h1>
            <span className="sa-system-badge px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase rounded-sm bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
              OFFLINE_ZERO_KNOWLEDGE
            </span>
          </div>
          <p className="sa-header-meta text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block font-mono">
            RFC 6238 TOTP ENGINE · VAULT_PROTECTED: {accountCount} TOKENS
          </p>
        </div>
      </div>

      {/* Center Search Input with `/` Key Binding */}
      <div className="flex-1 max-w-md mx-2 relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索服务发行方、用户名或标签..."
            className="sa-header-search w-full pl-9 pr-10 py-1.5 rounded-sm bg-slate-100 dark:bg-[#12131D] border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5] transition-all"
          />
          <kbd className="sa-shortcut-key absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-[#161622] rounded-sm border border-slate-300 dark:border-slate-800 pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View Mode Toggle (List vs Grid) */}
        <div className="sa-view-toggle flex items-center p-0.5 rounded-sm bg-slate-100 dark:bg-[#12131D] border border-slate-300 dark:border-slate-800">
          <button
            onClick={() => onViewModeChange("compact_list")}
            title="紧凑列表视图 (默认)"
            className={`sa-view-option ${viewMode === "compact_list" ? "sa-view-option--selected" : ""} p-1.5 rounded-sm text-xs font-mono transition-all ${
              viewMode === "compact_list"
                ? "bg-[#6D5EF5] text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <LayoutList size={15} />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            title="网格视图"
            className={`sa-view-option ${viewMode === "grid" ? "sa-view-option--selected" : ""} p-1.5 rounded-sm text-xs font-mono transition-all ${
              viewMode === "grid"
                ? "bg-[#6D5EF5] text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <LayoutGrid size={15} />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onThemeToggle}
          title={
            themeMode === "dark"
              ? "当前为深色模式；点击切换至浅色模式"
              : "当前为浅色模式；点击切换至深色模式"
          }
          className="sa-header-icon-button p-1.5 rounded-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#12131D] border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
        >
          {themeMode === "dark" ? <Moon size={16} className="sa-theme-moon" /> : <Sun size={16} />}
        </button>

        {/* Security Info Modal Trigger */}
        <button
          onClick={onOpenSecurityAbout}
          title="关于零知识安全机制"
          className="sa-header-icon-button p-1.5 rounded-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#12131D] border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
        >
          <Info size={16} />
        </button>

        {/* Lock Vault Button */}
        <button
          onClick={onLockVault}
          title="锁定保险箱"
          className="sa-lock-button hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#12131D] hover:bg-slate-200 dark:hover:bg-[#161622] border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-all"
        >
          <Lock size={13} className="text-[#6D5EF5]" />
          <span>[ 锁定 ]</span>
        </button>

        {/* Add Account Primary Action */}
        <button
          onClick={onAddAccount}
          className="sa-primary-button flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] active:scale-95 transition-all text-xs font-mono font-bold"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span className="hidden sm:inline">+ 添加账号</span>
        </button>
      </div>
    </header>
  );
};
