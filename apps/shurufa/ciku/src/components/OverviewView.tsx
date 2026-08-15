import React, { useState } from 'react';
import { CikuEntry, FrequencyStats, SyncStatus } from '../types/ciku';
import {
  RefreshCw,
  Plus,
  Pin,
  ChevronRight,
  Upload,
  Search,
  Filter
} from 'lucide-react';

interface OverviewViewProps {
  entries: CikuEntry[];
  freqStats: FrequencyStats;
  syncStatus: SyncStatus;
  onSelectEntry: (entry: CikuEntry) => void;
  onOpenImportModal: () => void;
  onRunManualSync: () => void;
  onNavigateSearch: (q?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  entries,
  freqStats,
  syncStatus,
  onSelectEntry,
  onOpenImportModal,
  onRunManualSync,
  onNavigateSearch
}) => {
  const [activeTab, setActiveTab] = useState<'RECENT' | 'FAVORITE' | 'PENDING'>('RECENT');

  // Filter entries according to activeTab
  const displayedEntries = React.useMemo(() => {
    if (activeTab === 'FAVORITE') {
      return entries.filter((e) => e.isFavorited);
    }
    if (activeTab === 'PENDING') {
      return entries.filter((e) => e.category === 'PENDING' || e.level === 'ONCE');
    }
    // Default RECENT
    return [...entries].sort((a, b) => b.usageCount - a.usageCount).slice(0, 10);
  }, [entries, activeTab]);

  const personalCount = entries.filter((e) => e.category === 'PERSONAL').length;
  const pendingCount = 128;

  return (
    <div className="space-y-4">
      {/* Workbench Header Bar */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                词库工作台
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-[#181a26] text-zinc-400 font-mono border border-[#272a38]">
                GY Lexicon Center
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            词库优先，配置辅助 • 离线优先 • Revision 增量对齐
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#161824] border border-[#222532] rounded-md text-xs font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-300">同步正常</span>
            <span className="text-zinc-500 text-[11px]">({syncStatus.lastSyncTime})</span>
          </div>

          <button
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-[#181a26] hover:bg-[#1f2230] text-zinc-300 border border-[#272a38] rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
              <span>导入词库</span>
          </button>

          <button
            onClick={onOpenImportModal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
              <span>+ 新建词条</span>
          </button>
        </div>
      </div>

      {/* Compact Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="p-3 bg-[#11131c] border border-[#222532] rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>公共词库条目</span>
            <span className="text-[10px] bg-[#181a26] px-1.5 py-0.2 rounded text-zinc-400 border border-[#272a38]">
              基座
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-mono font-bold text-zinc-100">
              1,240,892
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">通用与语料</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-3 bg-[#11131c] border border-[#222532] rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>我的个人词条</span>
            <span className="text-[10px] bg-[#161824] text-blue-400 px-1.5 py-0.2 rounded border border-blue-900/40">
              账号专属
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-mono font-bold text-blue-400">
              {personalCount || 4502}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">自学与名片</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-3 bg-[#11131c] border border-[#222532] rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>待审核词条</span>
            <span className="text-[10px] bg-[#181a26] text-zinc-400 px-1.5 py-0.2 rounded border border-[#272a38]">
              社区队列
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-mono font-bold text-zinc-200">
              {pendingCount}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">待合规校验</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-3 bg-[#11131c] border border-[#222532] rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>高频与固定词</span>
            <span className="text-[10px] bg-[#181a26] text-orange-400 px-1.5 py-0.2 rounded border border-orange-900/30">
              优先出字
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-mono font-bold text-orange-400">
              {freqStats.highCount + freqStats.fixedCount || 890}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">含 {freqStats.fixedCount} 固定</span>
          </div>
        </div>
      </div>

      {/* Horizontal Frequency Bar & Sync Widget Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Horizontal Frequency Distribution Bar */}
        <div className="lg:col-span-8 p-3.5 bg-[#11131c] border border-[#222532] rounded-md space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
              词频分布与状态占比 (总量: {freqStats.totalCount} 词条)
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              7/30天动态滑动计算
            </span>
          </div>

          {/* Simple Stacked Progress Bar */}
          <div className="w-full h-3 bg-[#181a26] rounded overflow-hidden flex border border-[#222532]">
            <div className="bg-zinc-600 h-full" style={{ width: '35%' }} title="一次词: 35%" />
            <div className="bg-blue-600 h-full" style={{ width: '42%' }} title="记忆词: 42%" />
            <div className="bg-orange-500 h-full" style={{ width: '18%' }} title="高频词: 18%" />
            <div className="bg-emerald-500 h-full" style={{ width: '5%' }} title="固定词: 5%" />
          </div>

          {/* Compact Legend Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-0.5">
            <div className="flex items-center justify-between px-2 py-1 bg-[#161824] border border-[#222532] rounded">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-zinc-400">一次词</span>
              </div>
              <span className="text-zinc-200 font-bold">{freqStats.onceCount} (35%)</span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 bg-[#161824] border border-[#222532] rounded">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-zinc-400">记忆词</span>
              </div>
              <span className="text-blue-400 font-bold">{freqStats.memoryCount} (42%)</span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 bg-[#161824] border border-[#222532] rounded">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-zinc-400">高频词</span>
              </div>
              <span className="text-orange-400 font-bold">{freqStats.highCount} (18%)</span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 bg-[#161824] border border-[#222532] rounded">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-zinc-400">固定词</span>
              </div>
              <span className="text-emerald-400 font-bold">{freqStats.fixedCount} (5%)</span>
            </div>
          </div>
        </div>

        {/* Sync Widget Panel */}
        <div className="lg:col-span-4 p-3.5 bg-[#11131c] border border-[#222532] rounded-md flex flex-col justify-between space-y-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#222532] pb-1.5">
              <span className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                同步引擎状态
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-[#161824] px-1.5 py-0.2 rounded border border-emerald-900/30">
                STABLE
              </span>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>最近同步时间:</span>
                <span className="text-zinc-200">{syncStatus.lastSyncTime}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>网络增量 Revision:</span>
                <span className="text-blue-400">{syncStatus.revision}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onRunManualSync}
            className="w-full py-1.5 bg-[#181a26] hover:bg-[#202230] text-zinc-200 text-xs font-medium rounded border border-[#272a38] transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3 text-zinc-400" />
            <span>手动作业同步</span>
          </button>
        </div>
      </div>

      {/* Main Table Panel: Recent Entries & Pending Queue */}
      <div className="bg-[#11131c] border border-[#222532] rounded-md overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-4 py-2.5 bg-[#161824] border-b border-[#222532] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('RECENT')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'RECENT'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2230]'
              }`}
            >
              最近使用词条
            </button>
            <button
              onClick={() => setActiveTab('FAVORITE')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'FAVORITE'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2230]'
              }`}
            >
              收藏词条
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'PENDING'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2230]'
              }`}
            >
              待审核/观察词条
            </button>
          </div>

          <button
            onClick={() => onNavigateSearch('')}
            className="text-xs text-zinc-400 hover:text-blue-400 flex items-center gap-1 font-mono"
          >
            <span>查看全部全库词条</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {displayedEntries.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-mono">
              无匹配记录。
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#181a26] text-zinc-400 font-mono text-[11px] uppercase border-b border-[#242736]">
                  <th className="py-2 px-3 font-semibold">词语</th>
                  <th className="py-2 px-3 font-semibold">拼音</th>
                  <th className="py-2 px-3 font-semibold">词性与释义</th>
                  <th className="py-2 px-3 font-semibold text-right">使用次数</th>
                  <th className="py-2 px-3 font-semibold">来源词库</th>
                  <th className="py-2 px-3 font-semibold">等级</th>
                  <th className="py-2 px-3 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e212d] text-zinc-300">
                {displayedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="hover:bg-[#161824] transition-colors cursor-pointer group"
                  >
                    <td className="py-2 px-3 font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                      {entry.isPinned && <Pin className="w-3 h-3 text-emerald-400 shrink-0" />}
                      <span className="group-hover:text-blue-400 transition-colors">
                        {entry.word}
                      </span>
                    </td>

                    <td className="py-2 px-3 font-mono text-zinc-400 text-xs">
                      {entry.pinyin}
                    </td>

                    <td className="py-2 px-3 text-zinc-400 max-w-xs truncate text-xs">
                      <span className="text-zinc-500 font-mono text-[10px] mr-1.5">{entry.pos}</span>
                      <span>{entry.definition}</span>
                    </td>

                    <td className="py-2 px-3 text-right font-mono font-bold text-zinc-200">
                      {entry.usageCount.toLocaleString()}
                    </td>

                    <td className="py-2 px-3">
                      <span className="bg-[#181a26] px-1.5 py-0.5 rounded text-[10px] text-zinc-300 border border-[#272a38] font-mono">
                        {entry.sourceLibrary}
                      </span>
                    </td>

                    <td className="py-2 px-3">
                      {entry.level === 'FIXED' && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                          固定
                        </span>
                      )}
                      {entry.level === 'HIGH' && (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-950/40 border border-orange-800/60 px-1.5 py-0.2 rounded">
                          高频
                        </span>
                      )}
                      {entry.level === 'MEMORY' && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/40 border border-blue-800/60 px-1.5 py-0.2 rounded">
                          记忆
                        </span>
                      )}
                      {entry.level === 'ONCE' && (
                        <span className="text-[10px] font-bold text-zinc-400 bg-[#181a26] border border-[#272a38] px-1.5 py-0.2 rounded">
                          一次
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEntry(entry);
                        }}
                        className="px-2 py-0.5 bg-[#181a26] hover:bg-blue-600 text-zinc-300 hover:text-white rounded border border-[#272a38] text-[11px] font-medium transition-colors"
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
