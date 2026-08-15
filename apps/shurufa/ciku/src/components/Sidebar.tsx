import React from 'react';
import {
  LayoutDashboard,
  Search,
  BookOpen,
  UserCheck,
  Cpu,
  MapPin,
  Briefcase,
  Clock,
  RefreshCw,
  Shield,
  Layers,
  HelpCircle,
  Keyboard,
  SlidersHorizontal,
  UserRound
} from 'lucide-react';
import { CikuEntry, AppTheme, AppLang } from '../types/ciku';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  selectedCategory: string;
  onCategorySelect: (cat: string) => void;
  selectedLevel: string;
  onLevelSelect: (level: string) => void;
  entries: CikuEntry[];
  pendingCount: number;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  theme?: AppTheme;
  lang?: AppLang;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  selectedCategory,
  onCategorySelect,
  selectedLevel,
  onLevelSelect,
  entries,
  pendingCount,
  mobileMenuOpen,
  onCloseMobileMenu,
  theme = 'dark',
  lang = 'zh'
}) => {
  const isLight = theme === 'light';
  const personalCount = entries.filter((e) => e.category === 'PERSONAL').length;
  const onceCount = entries.filter((e) => e.level === 'ONCE').length;
  const memoryCount = entries.filter((e) => e.level === 'MEMORY').length;
  const highCount = entries.filter((e) => e.level === 'HIGH').length;
  const fixedCount = entries.filter((e) => e.level === 'FIXED').length;

  const handleNavClick = (viewName: string, categoryName: string = 'ALL', levelName: string = 'ALL') => {
    onViewChange(viewName);
    onCategorySelect(categoryName);
    onLevelSelect(levelName);
    onCloseMobileMenu();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={onCloseMobileMenu}
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-[49px] left-0 h-[calc(100vh-49px)] w-56 border-r flex flex-col p-2 z-50 transition-all duration-150 overflow-y-auto ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#0d0e14] border-[#222532] text-zinc-300'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Navigation Sections */}
        <div className="flex-1 space-y-4 pt-1">
          {/* Main Navigation */}
          <div>
            <p className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 mb-1 ${
              isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              {lang === 'en' ? 'Workbench' : '工作台'}
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleNavClick('overview')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeView === 'overview'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs rounded-r-md font-bold'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Overview' : '词库概览'}</span>
                  </div>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('search')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeView === 'search'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs rounded-r-md font-bold'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Global Search' : '全局搜索'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">/</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Library Categories */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <p className={`text-[10px] uppercase font-mono tracking-wider font-bold ${
                isLight ? 'text-slate-400' : 'text-zinc-500'
              }`}>
                {lang === 'en' ? 'Categories' : '词库分类'}
              </p>
            </div>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleNavClick('categories', 'ALL')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'categories' && selectedCategory === 'ALL'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 opacity-70" />
                    <span>{lang === 'en' ? 'All Lexicons' : '全部词库'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">2.4M</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('my-libraries')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'my-libraries'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>{lang === 'en' ? 'My Personal Library' : '我的个人词库'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-500 font-bold">{personalCount}</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('categories', 'PUBLIC_BASE')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'categories' && selectedCategory === 'PUBLIC_BASE'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 opacity-70" />
                    <span>{lang === 'en' ? 'Public Base' : '公共基础词库'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">1.2M</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('categories', 'TECH')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'categories' && selectedCategory === 'TECH'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 opacity-70" />
                    <span>{lang === 'en' ? 'IT & AI Tech' : '技术词库'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">85k</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('categories', 'NAMES_PLACES')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'categories' && selectedCategory === 'NAMES_PLACES'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 opacity-70" />
                    <span>{lang === 'en' ? 'Names & Places' : '人名与地名'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">320k</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('categories', 'PRO')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'categories' && selectedCategory === 'PRO'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 opacity-70" />
                    <span>{lang === 'en' ? 'Professional Industry' : '专业行业词库'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">142k</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('public-libraries')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'public-libraries'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 opacity-70" />
                    <span>{lang === 'en' ? 'Pending Approval' : '待审核词条'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-500 font-semibold">{pendingCount}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Word Frequency Levels */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <p className={`text-[10px] uppercase font-mono tracking-wider font-bold ${
                isLight ? 'text-slate-400' : 'text-zinc-500'
              }`}>
                {lang === 'en' ? 'Frequency Levels' : '词频等级'}
              </p>
              <button
                onClick={() => handleNavClick('frequency')}
                className="text-[10px] text-blue-500 hover:underline font-bold"
              >
                {lang === 'en' ? 'Analyze' : '分析'}
              </button>
            </div>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleNavClick('frequency', 'ALL', 'ONCE')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    isLight ? 'hover:bg-slate-200 text-slate-700' : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{lang === 'en' ? 'Once Words' : '一次词'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{onceCount}</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('frequency', 'ALL', 'MEMORY')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    isLight ? 'hover:bg-slate-200 text-slate-700' : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{lang === 'en' ? 'Memory Words' : '记忆词'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{memoryCount}</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('frequency', 'ALL', 'HIGH')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    isLight ? 'hover:bg-slate-200 text-slate-700' : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>{lang === 'en' ? 'High Frequency' : '高频词'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{highCount}</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('frequency', 'ALL', 'FIXED')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    isLight ? 'hover:bg-slate-200 text-slate-700' : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{lang === 'en' ? 'Fixed (Permanent)' : '固定词 (永久)'}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-500">{fixedCount}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Personal center */}
          <div>
            <p className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 mb-1 ${
              isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              {lang === 'en' ? 'Personal Center' : '个人中心'}
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleNavClick('personal-center')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'personal-center'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserRound className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Account Center' : '账号与配置'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">LOCAL</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Input method companion tools */}
          <div>
            <p className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 mb-1 ${
              isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              {lang === 'en' ? 'Input Method' : '输入法辅助'}
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleNavClick('input-settings')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'input-settings'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Input Settings' : '输入法设置'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">LOCAL</span>
                </button>
              </li>
            </ul>
          </div>

          {/* System Tools */}
          <div>
            <p className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 mb-1 ${
              isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              {lang === 'en' ? 'System Tools' : '系统工具'}
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleNavClick('sync')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'sync'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Sync Center' : '同步中心'}</span>
                  </div>
                  <span className={`text-[9px] px-1 py-0.2 border rounded font-mono ${
                    isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#12141c] text-emerald-400 border-[#222532]'
                  }`}>
                    Offline
                  </span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('privacy')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                    activeView === 'privacy'
                      ? isLight
                        ? 'border-l-2 border-blue-600 bg-white text-blue-700 shadow-xs font-bold rounded-r-md'
                        : 'border-l-2 border-blue-500 bg-[#161824] text-zinc-100 font-medium rounded-r-md'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md'
                      : 'text-zinc-400 hover:bg-[#141622] hover:text-zinc-200 rounded-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Privacy & Safety' : '隐私设置'}</span>
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Statement */}
        <div className={`pt-2 border-t mt-auto ${isLight ? 'border-slate-200' : 'border-[#222532]'}`}>
          <div className={`p-2 rounded-md border space-y-1 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#12141c] border-[#222532]'
          }`}>
            <div className={`flex items-center gap-1 text-[10px] font-bold ${
              isLight ? 'text-slate-700' : 'text-zinc-400'
            }`}>
              <HelpCircle className="w-3 h-3 text-blue-500 shrink-0" />
              <span>{lang === 'en' ? 'GyenBox System Note' : 'GyenBox 架构说明'}</span>
            </div>
            <p className={`text-[10px] leading-normal ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              shurufa.gyenbox.com • 词库核心 + 配置辅助 • 离线零延迟
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
