import React from 'react';
import {
  LayoutDashboard,
  Sliders,
  BookOpen,
  Laptop,
  RefreshCw,
  History,
  Info,
} from 'lucide-react';

export type NavSection = 'overview' | 'settings' | 'learning' | 'devices' | 'sync' | 'changelog';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  wordCount: number;
  deviceCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  wordCount,
  deviceCount,
}) => {
  const navItems = [
    {
      id: 'overview' as NavSection,
      label: '首页概览',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'settings' as NavSection,
      label: '输入法设置',
      icon: Sliders,
      badge: null,
    },
    {
      id: 'learning' as NavSection,
      label: '个人学习',
      icon: BookOpen,
      badge: `${wordCount} 词`,
    },
    {
      id: 'devices' as NavSection,
      label: '设备管理',
      icon: Laptop,
      badge: `${deviceCount} 台`,
    },
    {
      id: 'sync' as NavSection,
      label: '同步中心',
      icon: RefreshCw,
      badge: '策略',
    },
    {
      id: 'changelog' as NavSection,
      label: '更新日志',
      icon: History,
      badge: 'v2.4',
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-[#0f0f12] lg:min-h-[calc(100vh-4rem)] border-r border-[#27272a] p-4 flex flex-col justify-between">
      <div>
        <div className="px-3 py-2 text-[10px] font-bold text-[#71717a] uppercase tracking-widest">
          配置中心
        </div>
        <nav className="space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#18181b] text-white font-medium border border-[#27272a]'
                    : 'text-[#71717a] hover:bg-[#18181b] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#3b82f6]' : 'text-[#71717a]'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      isActive
                        ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30'
                        : 'bg-[#18181b] text-[#71717a] border border-[#27272a]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Domain Isolation Notice */}
      <div className="mt-6 p-4 rounded-xl bg-[#111114] border border-[#27272a] text-[#71717a] text-[11px] space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
          <Info className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>服务范围声明</span>
        </div>
        <p className="text-[11px] leading-relaxed text-[#71717a]">
          本项目只负责 GY 输入法配置同步与个人词库。软件下载及官网请访问独立站 <span className="text-slate-300 font-mono">shurufa.wang</span>。
        </p>
      </div>
    </aside>
  );
};
