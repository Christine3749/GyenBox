import React, { useState } from 'react';
import { SyncStatus } from '../types/ciku';
import {
  RefreshCw,
  Laptop,
  Smartphone,
  HardDrive,
  WifiOff,
  GitMerge,
  AlertTriangle
} from 'lucide-react';

interface SyncViewProps {
  syncStatus: SyncStatus;
  onRunSync: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SyncView: React.FC<SyncViewProps> = ({
  syncStatus,
  onRunSync,
  onShowToast
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      onRunSync();
      onShowToast('GyenBox 增量同步完成！已校验 revision 版本', 'success');
    }, 1000);
  };

  const handleResolveConflict = (strategy: 'CLOUD' | 'LOCAL' | 'MERGE') => {
    setShowConflictModal(false);
    onShowToast(
      strategy === 'CLOUD'
        ? '已选择使用云端版本覆盖'
        : strategy === 'LOCAL'
        ? '已选择保留本端版本'
        : '已成功双向合并解决冲突',
      'success'
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className={`w-4 h-4 text-blue-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                GyenBox 增量同步中心
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                统一账号: <strong className="text-zinc-200">{syncStatus.accountEmail}</strong> • Revision: <span className="text-blue-400">{syncStatus.revision}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-[#181a26] text-white font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? '同步中...' : '手动作业同步'}</span>
          </button>
        </div>

        {/* Sync Principles Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 bg-[#161824] border border-[#222532] rounded-md space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>零延迟离线打字</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              候选框仅读取本地离线 C++/SQLite 词库，网络波动绝对不阻塞打字。
            </p>
          </div>

          <div className="p-3 bg-[#161824] border border-[#222532] rounded-md space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
              <WifiOff className="w-3.5 h-3.5 text-blue-400" />
              <span>静默空闲后台同步</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              网络同步仅在启动、系统空闲或用户主动点击时后台平滑执行。
            </p>
          </div>

          <div className="p-3 bg-[#161824] border border-[#222532] rounded-md space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
              <GitMerge className="w-3.5 h-3.5 text-orange-400" />
              <span>Revision 冲突解决</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              基于版本号标记变更，多设备修改冲突时可选择云端、本地或合并方案。
            </p>
          </div>
        </div>
      </div>

      {/* Device List */}
      <div className="bg-[#11131c] border border-[#222532] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#222532] pb-2">
          <h2 className="text-xs font-bold text-zinc-200 flex items-center gap-2 font-mono">
            <span>多端已绑定设备 ({syncStatus.devices.length})</span>
          </h2>

          <button
            onClick={() => setShowConflictModal(true)}
            className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>测试版本合并冲突</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {syncStatus.devices.map((dev) => (
            <div
              key={dev.id}
              className={`p-3 rounded-md border flex flex-col justify-between space-y-2 ${
                dev.isCurrent
                  ? 'bg-blue-950/20 border-blue-600/40'
                  : 'bg-[#161824] border-[#222532]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {dev.os.includes('Windows') || dev.os.includes('macOS') ? (
                      <Laptop className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                    )}
                    <h3 className="text-xs font-bold text-zinc-100">{dev.name}</h3>
                  </div>
                  {dev.isCurrent && (
                    <span className="text-[9px] font-bold bg-blue-950/40 text-blue-300 border border-blue-800/60 px-1.5 py-0.2 rounded font-mono">
                      当前设备
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  {dev.os} ({dev.ip})
                </p>
              </div>

              <div className="pt-2 border-t border-[#1e212d] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>最近同步: {dev.lastSyncAt}</span>
                <span className="text-emerald-400 font-bold">STABLE</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#11131c] border border-[#2a2d3e] rounded-md w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222532]">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span>解决版本冲突 (Conflict Resolution)</span>
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              检测到 MacBook Pro 与 当前 Windows 设备在词条 <strong>【具身智能】</strong> 上存在不同版本修改，请选择处理策略：
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleResolveConflict('CLOUD')}
                className="w-full p-2.5 bg-[#0c0d10] hover:bg-[#161824] border border-[#272a38] rounded-md text-left text-xs transition-colors"
              >
                <div className="font-bold text-zinc-100">使用云端版本 (Cloud Version)</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">覆盖本端改动，对齐修编 Revision</div>
              </button>

              <button
                onClick={() => handleResolveConflict('LOCAL')}
                className="w-full p-2.5 bg-[#0c0d10] hover:bg-[#161824] border border-[#272a38] rounded-md text-left text-xs transition-colors"
              >
                <div className="font-bold text-zinc-100">保留本机版本 (Local Version)</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">以本台电脑数据为准覆盖云端</div>
              </button>

              <button
                onClick={() => handleResolveConflict('MERGE')}
                className="w-full p-2.5 bg-blue-950/30 border border-blue-900/50 hover:bg-blue-900/40 rounded-md text-left text-xs transition-colors"
              >
                <div className="font-bold text-blue-300">智能双向合并两边内容 (Merge Both)</div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">推荐：保留两端非重叠释义与新增例句</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
