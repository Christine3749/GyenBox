import React, { useState } from 'react';
import { CikuEntry, EntryLevel } from '../types/ciku';
import {
  Activity,
  Pin,
  Sliders,
  Info
} from 'lucide-react';

interface FrequencyViewProps {
  entries: CikuEntry[];
  onSelectEntry: (entry: CikuEntry) => void;
  onUpdateLevel: (id: string, newLevel: EntryLevel) => void;
}

export const FrequencyView: React.FC<FrequencyViewProps> = ({
  entries,
  onSelectEntry,
  onUpdateLevel
}) => {
  const [decayDays, setDecayDays] = useState<number>(0);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');

  // Filtered list
  const filtered = entries.filter((e) => {
    if (selectedLevelFilter === 'ALL') return true;
    return e.level === selectedLevelFilter;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md space-y-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-orange-400 shrink-0" />
          <div>
            <h1 className="text-base font-bold text-zinc-100">
              词频分析与时间衰减引擎
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              基于 7 天与 30 天滑动窗口的动态权重计算，兼顾即时输入热度与长期表达习惯。
            </p>
          </div>
        </div>

        {/* 4 Levels Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
          {/* Once */}
          <div className="p-2.5 bg-[#161824] border border-[#222532] rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                一次词 (One-time)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">1x 确认</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              仅出现或确认过 1 次，候选框低权保护。
            </p>
          </div>

          {/* Memory */}
          <div className="p-2.5 bg-[#161824] border border-[#222532] rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                记忆词 (Memory)
              </span>
              <span className="text-[10px] font-mono text-blue-400/80">2-4x 使用</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              复用 2–4 次或主动标记，快速候选首页。
            </p>
          </div>

          {/* High */}
          <div className="p-2.5 bg-[#161824] border border-[#222532] rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                高频词 (High)
              </span>
              <span className="text-[10px] font-mono text-orange-400/80">7/30天高频</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              近期多次输入获加权；久不用平滑衰减。
            </p>
          </div>

          {/* Fixed */}
          <div className="p-2.5 bg-[#161824] border border-emerald-900/40 rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                固定词 (Fixed)
              </span>
              <span className="text-[10px] font-mono text-emerald-400/80">永久置顶</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              主动锁定，不受时间衰减，首位强行输出。
            </p>
          </div>
        </div>
      </div>

      {/* Time Decay Simulator Card */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <h2 className="text-xs font-bold text-zinc-200">时间衰减逻辑模拟器</h2>
          </div>
          <span className="text-xs font-mono text-blue-400">
            未输入天数: <strong className="text-zinc-100">{decayDays} 天</strong>
          </span>
        </div>

        <div className="space-y-1.5">
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={decayDays}
            onChange={(e) => setDecayDays(Number(e.target.value))}
            className="w-full accent-blue-600 bg-[#181a26] rounded cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>0天 (活跃)</span>
            <span>15天 (轻微降权)</span>
            <span>45天 (降为记忆)</span>
            <span>90天 (降为一次词)</span>
          </div>
        </div>

        {/* Dynamic Simulation Result Box */}
        <div className="p-3 bg-[#0c0d10] border border-[#222532] rounded-md text-xs space-y-1.5 font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              当词条在 <strong>{decayDays} 天</strong> 内无键盘打字输入时：
            </span>
          </div>
          <ul className="text-zinc-400 text-[11px] space-y-1 pl-5 list-disc">
            <li>
              <strong>固定词 (Fixed):</strong> 权重 100% 保护，<span className="text-emerald-400 font-bold">完全不降级</span>。
            </li>
            <li>
              <strong>高频词 (High):</strong>{' '}
              {decayDays >= 30 ? (
                <span className="text-orange-300">
                  超 30 天无输入，自动衰减降级为【记忆词】。
                </span>
              ) : (
                <span>保持高频排序。</span>
              )}
            </li>
            <li>
              <strong>记忆词 (Memory):</strong>{' '}
              {decayDays >= 60 ? (
                <span className="text-zinc-300">
                  超 60 天无输入，自动降级为【一次词】。
                </span>
              ) : (
                <span>维持记忆词展示。</span>
              )}
            </li>
          </ul>
        </div>
      </div>

      {/* Term List Table */}
      <div className="bg-[#11131c] border border-[#222532] rounded-md space-y-3 p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#222532]">
          <h2 className="text-xs font-bold text-zinc-200 flex items-center gap-2 font-mono">
            <span>词条词频与衰减诊断表</span>
            <span className="text-zinc-500">({filtered.length} 条)</span>
          </h2>

          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-zinc-500 mr-1">筛选等级:</span>
            {['ALL', 'FIXED', 'HIGH', 'MEMORY', 'ONCE'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevelFilter(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  selectedLevelFilter === lvl
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-[#181a26] text-zinc-400 hover:text-white border border-[#272a38]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#161824] text-zinc-400 font-mono text-[11px] uppercase border-b border-[#242736]">
                <th className="py-2 px-3 font-semibold">词语</th>
                <th className="py-2 px-3 font-semibold">拼音</th>
                <th className="py-2 px-3 font-semibold">使用频次</th>
                <th className="py-2 px-3 font-semibold">7/30天趋势</th>
                <th className="py-2 px-3 font-semibold">当前等级</th>
                <th className="py-2 px-3 font-semibold">规则/计算说明</th>
                <th className="py-2 px-3 font-semibold text-right">手动调整</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e212d] text-zinc-300">
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-[#161824] transition-colors"
                >
                  <td
                    className="py-2 px-3 font-bold text-zinc-100 text-sm cursor-pointer hover:text-blue-400"
                    onClick={() => onSelectEntry(entry)}
                  >
                    <div className="flex items-center gap-1.5">
                      {entry.isPinned && <Pin className="w-3 h-3 text-emerald-400 shrink-0" />}
                      <span>{entry.word}</span>
                    </div>
                  </td>

                  <td className="py-2 px-3 font-mono text-zinc-400 text-xs">
                    {entry.pinyin}
                  </td>

                  <td className="py-2 px-3 font-mono text-zinc-200">
                    {entry.usageCount} 次
                  </td>

                  <td className="py-2 px-3 font-mono text-emerald-400 text-[11px]">
                    +{entry.trend7d}% (7d) / +{entry.trend30d}% (30d)
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

                  <td className="py-2 px-3 text-zinc-400 max-w-xs truncate text-[11px]">
                    {entry.autoUpgradeReason || '系统默认规则计算'}
                  </td>

                  <td className="py-2 px-3 text-right">
                    <select
                      value={entry.level}
                      onChange={(e) => onUpdateLevel(entry.id, e.target.value as EntryLevel)}
                      className="bg-[#0c0d10] border border-[#272a38] rounded px-2 py-0.5 text-[11px] text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                    >
                      <option value="FIXED">设为 固定词</option>
                      <option value="HIGH">设为 高频词</option>
                      <option value="MEMORY">设为 记忆词</option>
                      <option value="ONCE">设为 一次词</option>
                    </select>
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
