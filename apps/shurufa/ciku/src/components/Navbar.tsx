import React, { useEffect, useRef } from 'react';
import { Search, Plus, Upload, ShieldCheck, Menu, X, Sun, Moon, Globe, Keyboard } from 'lucide-react';
import { AppTheme, AppLang, InputScheme } from '../types/ciku';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenImportModal: () => void;
  onOpenNewTermModal: () => void;
  onOpenSyncView: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  lastSyncTime: string;
  theme: AppTheme;
  onToggleTheme: () => void;
  lang: AppLang;
  onToggleLang: () => void;
  scheme: InputScheme;
  onSchemeChange: (s: InputScheme) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenImportModal,
  onOpenNewTermModal,
  onOpenSyncView,
  onViewChange,
  mobileMenuOpen,
  onToggleMobileMenu,
  lastSyncTime,
  theme,
  onToggleTheme,
  lang,
  onToggleLang,
  scheme,
  onSchemeChange
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/' key press if not inside an input/textarea
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Clear on Esc
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        onSearchChange('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  const isLight = theme === 'light';

  return (
    <header className={`sticky top-0 z-40 border-b px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0d0e12] border-[#222532] text-zinc-100'
    }`}>
      {/* Brand & Mobile Menu Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className={`lg:hidden p-1.5 rounded transition-colors ${
            isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-[#1a1d28]'
          }`}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div
          onClick={() => onViewChange('overview')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-[11px] text-white shadow-sm">
            GY
          </div>
          <div className="flex items-center gap-2">
              <span className={`text-sm font-bold tracking-tight transition-colors ${
              isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-zinc-100 group-hover:text-blue-400'
            }`}>
                {lang === 'en' ? 'Lexicon Workbench' : '词库工作台'}
              </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
              isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#161824] text-zinc-400 border-[#272a38]'
            }`}>
              shurufa.gyenbox.com
            </span>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (e.target.value.trim().length > 0) {
                onViewChange('search');
              }
            }}
            placeholder={
              lang === 'en'
                ? 'Search terms, pinyin, wubi, definitions...'
                : '搜索词条、拼音、五笔编码、释义...'
            }
            className={`w-full border rounded-md py-1.5 pl-8 pr-10 text-xs transition-all focus:outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
                : 'bg-[#12141c] border-[#272a38] text-zinc-200 focus:border-blue-500 placeholder:text-zinc-600'
            }`}
          />
          <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 px-1 py-0.2 rounded border text-[10px] font-mono pointer-events-none select-none ${
            isLight ? 'bg-slate-200 border-slate-300 text-slate-500' : 'bg-[#181a26] border-[#272a38] text-zinc-500'
          }`}>
            /
          </div>
        </div>
      </div>

      {/* Header Controls & Status Pill */}
      <div className="flex items-center gap-2">
        {/* 老三样 Input Scheme Selector */}
        <div className={`hidden lg:flex items-center gap-1 p-0.5 border rounded-md text-xs ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#12141c] border-[#222532]'
        }`}>
          <div className="px-1.5 py-0.5 text-[10px] font-bold text-blue-500 flex items-center gap-1">
            <Keyboard className="w-3 h-3" />
            <span>{lang === 'en' ? 'Scheme' : '老三样'}</span>
          </div>
          {(['ALL', 'PINYIN', 'WUBI', 'SHUANGPIN'] as InputScheme[]).map((s) => (
            <button
              key={s}
              onClick={() => onSchemeChange(s)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                scheme === s
                  ? 'bg-blue-600 text-white font-bold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-zinc-400 hover:text-white hover:bg-[#181a26]'
              }`}
            >
              {s === 'ALL' ? (lang === 'en' ? 'All' : '全部') : s === 'PINYIN' ? '拼音' : s === 'WUBI' ? '五笔' : '双拼/仓颉'}
            </button>
          ))}
        </div>

        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`px-2.5 py-1.5 border rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              : 'bg-[#181a26] border-[#272a38] text-zinc-300 hover:text-white hover:bg-[#202332]'
          }`}
          title={isLight ? '切换为深色模式 (Dark Mode)' : '切换为浅色模式 (Light Mode)'}
        >
          {isLight ? <Sun className="w-3.5 h-3.5 text-amber-600" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
          <span className="hidden md:inline">{isLight ? (lang === 'en' ? 'Light' : '浅色') : (lang === 'en' ? 'Dark' : '深色')}</span>
        </button>

        {/* Chinese / English Language Toggle */}
        <button
          onClick={onToggleLang}
          className={`px-2.5 py-1.5 border rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isLight
              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              : 'bg-[#181a26] border-[#272a38] text-zinc-300 hover:text-white hover:bg-[#202332]'
          }`}
          title={lang === 'zh' ? 'Switch to English UI' : '切换为中文界面'}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono">{lang === 'zh' ? '中 / EN' : 'EN / 中'}</span>
        </button>

        {/* Sync Status Button */}
        <button
          onClick={onOpenSyncView}
          className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 border rounded-md text-xs transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              : 'bg-[#12141c] border-[#222532] hover:bg-[#181a26] text-zinc-300'
          }`}
          title={lang === 'en' ? 'Check Sync Status' : '点击查看同步状态'}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[11px]">{lang === 'en' ? 'Sync OK' : '同步正常'}</span>
        </button>

        {/* Import Action */}
        <button
          onClick={onOpenImportModal}
          className={`px-3 py-1.5 border text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-[#181a26] hover:bg-[#202332] border-[#272a38] text-zinc-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">{lang === 'en' ? 'Import' : '导入词库'}</span>
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewTermModal}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'New Term' : '新建词条'}</span>
        </button>

        {/* GyenBox Unified Account Chip */}
        <div className={`hidden xl:flex items-center gap-2 pl-2 border-l ${
          isLight ? 'border-slate-200' : 'border-[#222532]'
        }`}>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#12141c] border-[#222532] text-zinc-300'
          }`}>
            <span className="text-[11px] font-mono">gyenbox_user</span>
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
          </div>
        </div>
      </div>
    </header>
  );
};
