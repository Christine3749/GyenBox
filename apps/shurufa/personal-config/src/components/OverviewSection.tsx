import React from 'react';
import {
  RefreshCw,
  Laptop,
  Download,
  Upload,
  Clock,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { GYConfig, GYDevice, SyncLog, NavSection } from '../types';

interface OverviewSectionProps {
  config: GYConfig;
  devices: GYDevice[];
  syncLogs: SyncLog[];
  syncStatus: 'synced' | 'syncing' | 'offline' | 'conflict';
  wordCount: number;
  onManualSync: () => void;
  onNavigateSection: (section: NavSection) => void;
  onOpenExportModal: () => void;
  onOpenImportModal: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  config,
  devices,
  syncLogs,
  syncStatus,
  wordCount,
  onManualSync,
  onNavigateSection,
  onOpenExportModal,
  onOpenImportModal,
}) => {
  const currentDevice = devices.find((d) => d.isCurrent) || devices[0];

  const formatLastSync = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '刚刚';
    }
  };

  return (
    <div className="space-y-6">
      {/* Account & Sync Summary Banner */}
      <div className="bg-[#18181b] rounded-xl p-6 border border-[#27272a] relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={config.account.avatar}
              alt={config.account.username}
              className="w-12 h-12 rounded-xl object-cover border border-[#3b82f6]/50"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#fafafa]">
                  {config.account.username} 的 GY 输入法配置中心
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                  <ShieldCheck className="w-3 h-3" /> GyenBox 认证
                </span>
              </div>
              <p className="text-xs text-[#71717a] font-mono">
                账号 ID: {config.account.gyenboxId} · 绑定邮箱: {config.account.email}
              </p>
              <p className="text-xs text-[#71717a]">
                当前按键响应：<span className="text-[#22c55e] font-medium">100% 本地极速处理</span> (零网络延时)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onManualSync}
              disabled={syncStatus === 'syncing'}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium text-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? '同步中...' : '立即同步配置'}
            </button>

            <button
              onClick={() => onNavigateSection('devices')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-[#27272a] hover:bg-[#27272a] text-[#fafafa] font-medium text-xs transition-all"
            >
              <Laptop className="w-3.5 h-3.5 text-[#71717a]" />
              管理设备 ({devices.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Connected Devices */}
        <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div className="text-[#71717a] text-xs font-medium mb-1">已连接设备</div>
          <div className="text-2xl font-semibold text-white">
            {devices.length} <span className="text-sm font-normal text-[#71717a]">台</span>
          </div>
        </div>

        {/* Stat 2: Last Synced Time */}
        <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div className="text-[#71717a] text-xs font-medium mb-1">最近同步时间</div>
          <div className="text-2xl font-semibold text-white">
            {formatLastSync(config.lastSyncedAt)}
          </div>
        </div>

        {/* Stat 3: Config Revision Version */}
        <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div className="text-[#71717a] text-xs font-medium mb-1">配置版本</div>
          <div className="text-2xl font-semibold text-white">
            v2.4.8 <span className="text-sm font-normal text-[#71717a]">rev.{config.revision}</span>
          </div>
        </div>

        {/* Stat 4: Personal Vocabulary Items */}
        <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div className="text-[#71717a] text-xs font-medium mb-1">个人词频数据</div>
          <div className="text-2xl font-semibold text-white">
            {wordCount} <span className="text-sm font-normal text-[#71717a]">条</span>
          </div>
        </div>
      </div>

      {/* Prominent Action Bar */}
      <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#71717a]">
          <Zap className="w-4 h-4 text-[#3b82f6]" />
          <span>备份您的个人配置和词库到本地，或者从备份文件还原。所有导出数据均采用 AES 加密。</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportModal}
            className="border border-[#27272a] hover:bg-[#27272a] px-3 py-2 rounded text-xs font-medium text-white transition-colors"
          >
            导入配置
          </button>
          <button
            onClick={onOpenExportModal}
            className="border border-[#27272a] hover:bg-[#27272a] px-3 py-2 rounded text-xs font-medium text-white transition-colors"
          >
            导出配置
          </button>
        </div>
      </div>

      {/* Recent Configuration Change Audit Log */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272a] flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white">最近配置变更</h3>
          <span
            onClick={() => onNavigateSection('sync')}
            className="text-xs text-[#71717a] cursor-pointer hover:text-white underline underline-offset-4"
          >
            查看全部
          </span>
        </div>

        <div className="divide-y divide-[#27272a]">
          {syncLogs.slice(0, 4).map((log) => (
            <div key={log.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#3b82f6]/10 rounded">
                  <RefreshCw className="w-4 h-4 text-[#3b82f6]" />
                </div>
                <div>
                  <p className="text-sm text-white">{log.action}</p>
                  <p className="text-[11px] text-[#71717a]">
                    {log.timestamp} · {log.deviceName}
                  </p>
                </div>
              </div>
              <span className="text-xs text-[#22c55e]">已通过云端覆盖</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
