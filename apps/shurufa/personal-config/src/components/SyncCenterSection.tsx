import React, { useState } from 'react';
import { SyncLog } from '../types';
import {
  RefreshCw,
  Zap,
  ShieldCheck,
  AlertTriangle,
  History,
  CheckCircle2,
  GitCompare,
  ArrowRight,
  Database,
  Cloud,
  Check,
} from 'lucide-react';

interface SyncCenterSectionProps {
  currentRevision: number;
  syncLogs: SyncLog[];
  onTriggerConflict: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SyncCenterSection: React.FC<SyncCenterSectionProps> = ({
  currentRevision,
  syncLogs,
  onTriggerConflict,
  onShowToast,
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'cloud' | 'local' | 'merge' | null>(null);

  const handleResolveChoice = (choice: 'cloud' | 'local' | 'merge') => {
    setSelectedResolution(choice);
    if (choice === 'cloud') {
      onShowToast(`已采纳云端版本 (rev-${currentRevision + 1})，覆盖本地配置`, 'success');
    } else if (choice === 'local') {
      onShowToast(`已保留本机版本 (rev-${currentRevision})，强制推送至云端`, 'success');
    } else {
      onShowToast('已自动融合两端快捷短语与词频，升级至最新 Revision', 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Policy Core Principles Card */}
      <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#3b82f6]" />
          <h2 className="text-base font-bold text-[#fafafa]">
            GY 输入法云端同步策略与无延迟架构
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-1.5">
            <div className="text-xs font-bold text-[#22c55e] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 本地优先零延迟
            </div>
            <p className="text-[11px] text-[#71717a]">
              打字上屏只读取本地高频词库与配置文件，完全脱离网络依赖。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-1.5">
            <div className="text-xs font-bold text-[#3b82f6] flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5" /> 智能空闲同步
            </div>
            <p className="text-[11px] text-[#71717a]">
              仅在软件启动、后台空闲或用户主动点击时进行增量云端同步。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-1.5">
            <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 离线打字降级
            </div>
            <p className="text-[11px] text-[#71717a]">
              无网或弱网环境下输入法功能 100% 正常使用，联网后自动追平补上。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-1.5">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" /> Revision 版本号冲突防护
            </div>
            <p className="text-[11px] text-[#71717a]">
              使用逻辑版本号递增校验，多端并发修改时自动提示人工选择。
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Conflict Resolution Simulator Box */}
      <div className="bg-[#18181b] rounded-xl border border-amber-500/40 p-6 space-y-5 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-200">
                多设备版本冲突处理演练场 (Revision Conflict Resolution)
              </h3>
            </div>
            <p className="text-xs text-[#71717a]">
              模拟当“MacBook”和“ThinkPad”同时修改配置时出现的冲突提示。
            </p>
          </div>

          <button
            onClick={onTriggerConflict}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            模拟触发版本冲突
          </button>
        </div>

        {/* Prompt Dialog Card */}
        <div className="bg-[#09090b] rounded-lg border border-amber-500/40 p-5 space-y-4">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-2 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>检测到其他设备更新，请选择使用云端版本或保留本机版本。</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Cloud Version Card */}
            <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#3b82f6]">云端最新版本 (来自 MacBook Pro)</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6]">
                  rev-{currentRevision + 1}
                </span>
              </div>
              <ul className="text-[11px] text-[#71717a] space-y-1 list-disc pl-4">
                <li>外观主题: 经典亚克力 (Acrylic)</li>
                <li>同屏候选数: 7 个词</li>
                <li>快捷短语: 新增「dz2」长短语地址</li>
              </ul>
            </div>

            {/* Local Version Card */}
            <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#22c55e]">本机保留版本 (ThinkPad X1)</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e]">
                  rev-{currentRevision}
                </span>
              </div>
              <ul className="text-[11px] text-[#71717a] space-y-1 list-disc pl-4">
                <li>外观主题: 极简深色 (Dark Minimal)</li>
                <li>同屏候选数: 5 个词</li>
                <li>快捷短语: 保留当前已编辑的短语</li>
              </ul>
            </div>
          </div>

          {/* Action Choice Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              onClick={() => handleResolveChoice('cloud')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                selectedResolution === 'cloud'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#18181b] hover:bg-[#27272a] text-[#3b82f6] border border-[#27272a]'
              }`}
            >
              使用云端版本 (rev-{currentRevision + 1})
            </button>

            <button
              onClick={() => handleResolveChoice('local')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                selectedResolution === 'local'
                  ? 'bg-[#22c55e] text-white'
                  : 'bg-[#18181b] hover:bg-[#27272a] text-[#22c55e] border border-[#27272a]'
              }`}
            >
              保留本机版本 (rev-{currentRevision})
            </button>

            <button
              onClick={() => handleResolveChoice('merge')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                selectedResolution === 'merge'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#18181b] hover:bg-[#27272a] text-purple-300 border border-[#27272a]'
              }`}
            >
              智能合并两端配置
            </button>
          </div>
        </div>
      </div>

      {/* Sync History Logs Table */}
      <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#3b82f6]" />
          <h3 className="text-sm font-semibold text-[#fafafa]">
            完整设备同步审计日志
          </h3>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#27272a]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#09090b] text-[#71717a] font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a]">
              <tr>
                <th className="px-4 py-3">同步时间</th>
                <th className="px-4 py-3">发起设备</th>
                <th className="px-4 py-3">动作描述</th>
                <th className="px-4 py-3">Revision 变更</th>
                <th className="px-4 py-3">结果状态</th>
                <th className="px-4 py-3">详细记录</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] bg-[#18181b]">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#27272a]/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[#71717a] text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {log.deviceName}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#3b82f6]">
                    rev-{log.revisionBefore} → rev-{log.revisionAfter}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                      <Check className="w-3 h-3" /> 成功
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#71717a] text-[11px]">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
