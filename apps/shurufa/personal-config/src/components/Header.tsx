import React from 'react';
import { ShieldCheck, ArrowLeft, LogOut, RefreshCw, Layers } from 'lucide-react';
import { GYConfig } from '../types';

interface HeaderProps {
  config: GYConfig;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'conflict';
  onManualSync: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  syncStatus,
  onManualSync,
  onLogout,
}) => {
  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            已同步 (rev-{config.revision})
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
            同步中...
          </span>
        );
      case 'conflict':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            存在版本冲突
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            离线模式 (本地缓存)
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-md border-b border-[#27272a] text-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#3b82f6] flex items-center justify-center font-bold text-white text-sm tracking-tight shadow-md">
            GY
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-[#fafafa] tracking-tight">
                GY 输入法个人配置
              </h1>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6] font-mono border border-[#3b82f6]/20">
                shurufa.gyenbox.com
              </span>
            </div>
            <p className="text-xs text-[#71717a] hidden sm:block">
              GyenBox 统一账号 · 本地优先 · 实时云端同步中心
            </p>
          </div>
        </div>

        {/* Sync Status Badge & GyenBox Account */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            {getStatusBadge()}
            <button
              onClick={onManualSync}
              disabled={syncStatus === 'syncing'}
              title="立即触发同步"
              className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>立即同步</span>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-[#27272a] hidden md:block" />

          {/* User Profile Card */}
          <div className="flex items-center gap-2.5 bg-[#18181b] px-3 py-1.5 rounded-lg border border-[#27272a]">
            <img
              src={config.account.avatar}
              alt={config.account.username}
              className="w-7 h-7 rounded-full object-cover border border-[#3b82f6]/40"
            />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-white">
                  {config.account.username}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#3b82f6]" title="GyenBox 认证账号" />
              </div>
              <span className="text-[10px] text-[#71717a] font-mono truncate max-w-[120px] sm:max-w-[160px]">
                {config.account.email}
              </span>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-1.5">
            <a
              href="https://gyenbox.com"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#71717a] hover:text-white border border-[#27272a] hover:bg-[#27272a] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回 GyenBox
            </a>

            <button
              onClick={onLogout}
              title="退出登入"
              className="p-2 text-[#71717a] hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
