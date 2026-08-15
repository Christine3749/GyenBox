import React, { useState } from 'react';
import { GYConfig, ThemeType } from '../types';
import { Sparkles, Keyboard } from 'lucide-react';

interface CandidatePreviewProps {
  appearance: GYConfig['appearance'];
}

export const CandidatePreview: React.FC<CandidatePreviewProps> = ({ appearance }) => {
  const [testInput, setTestInput] = useState('shurufa');

  // Simulated candidate dictionary based on input
  const getSimulatedCandidates = (input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed === 'shurufa') {
      return ['输入法', '输入法配置', '输入发', '输入', '输出法', '树如法', '数据法', '数字法', '熟练度'];
    }
    if (trimmed.includes('gy') || trimmed.includes('box')) {
      return ['GyenBox', 'GY输入法', '工业', '搞与', '极速词库', '云同步', '高效率'];
    }
    if (trimmed.includes('wo')) {
      return ['我们', '我', '我国', '卧龙', '握手', '卧室', '舞台'];
    }
    return [`${trimmed}候选`, '输入法', '个人词库', '极速响应', '云端同步', '设备管理', '快捷短语'];
  };

  const candidates = getSimulatedCandidates(testInput).slice(0, appearance.candidateCount);

  // Theme styling mapping
  const getThemeStyles = (theme: ThemeType) => {
    switch (theme) {
      case 'dark_minimal':
        return {
          container: 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-2xl shadow-black/80',
          inputBox: 'text-slate-200 border-slate-700 bg-slate-800/80',
          firstCandidate: 'text-blue-400 font-semibold bg-blue-500/10 border-blue-500/30',
          candidateItem: 'text-slate-300 hover:text-white',
          badge: 'bg-slate-800 text-slate-400',
          firstBadge: 'bg-blue-600 text-white',
        };
      case 'light_minimal':
        return {
          container: 'bg-white border border-slate-200 text-slate-800 shadow-xl',
          inputBox: 'text-slate-900 border-slate-300 bg-slate-50',
          firstCandidate: 'text-blue-600 font-semibold bg-blue-50 border-blue-200',
          candidateItem: 'text-slate-700 hover:text-slate-900',
          badge: 'bg-slate-100 text-slate-500',
          firstBadge: 'bg-blue-600 text-white',
        };
      case 'light_paper':
        return {
          container: 'bg-[#faf8f5] border border-[#e7e0d8] text-[#2c2825] shadow-lg',
          inputBox: 'text-[#2c2825] border-[#d8cfc4] bg-[#f2ece4]',
          firstCandidate: 'text-[#9a3412] font-semibold bg-[#ffedd5] border-[#fdba74]',
          candidateItem: 'text-[#44403c] hover:text-black',
          badge: 'bg-[#e7e0d8] text-[#78716c]',
          firstBadge: 'bg-[#ea580c] text-white',
        };
      case 'classic_laosanyang':
        return {
          container: 'bg-[#f1f5f9] border-2 border-slate-400 text-slate-900 shadow-md font-sans',
          inputBox: 'text-slate-900 border-slate-400 bg-white',
          firstCandidate: 'text-blue-700 font-bold bg-blue-100/80 border-blue-400',
          candidateItem: 'text-slate-800 hover:text-blue-900',
          badge: 'bg-slate-300 text-slate-700',
          firstBadge: 'bg-blue-700 text-white font-bold',
        };
      case 'english_clean':
        return {
          container: 'bg-[#0f172a] border border-cyan-500/50 text-cyan-50 shadow-xl font-mono',
          inputBox: 'text-cyan-200 border-cyan-700 bg-slate-900',
          firstCandidate: 'text-cyan-300 font-bold bg-cyan-950/80 border-cyan-400',
          candidateItem: 'text-slate-300 hover:text-cyan-100',
          badge: 'bg-slate-800 text-cyan-400',
          firstBadge: 'bg-cyan-500 text-slate-950 font-bold',
        };
      case 'acrylic_classic':
        return {
          container: 'bg-slate-900/70 backdrop-blur-xl border-slate-600/50 text-slate-100 shadow-2xl ring-1 ring-white/10',
          inputBox: 'text-white border-slate-600 bg-slate-800/50',
          firstCandidate: 'text-sky-300 font-semibold bg-sky-500/20 border-sky-400/40',
          candidateItem: 'text-slate-200 hover:text-white',
          badge: 'bg-slate-700/50 text-slate-300',
          firstBadge: 'bg-sky-500 text-white',
        };
      case 'aurora_blue':
        return {
          container: 'bg-indigo-950/90 border-indigo-500/40 text-indigo-50 shadow-2xl shadow-indigo-950/80',
          inputBox: 'text-indigo-100 border-indigo-700 bg-indigo-900/60',
          firstCandidate: 'text-cyan-300 font-semibold bg-cyan-500/20 border-cyan-400/40',
          candidateItem: 'text-indigo-200 hover:text-white',
          badge: 'bg-indigo-900 text-indigo-300',
          firstBadge: 'bg-cyan-500 text-slate-950 font-bold',
        };
      case 'slate_dark':
        return {
          container: 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-xl',
          inputBox: 'text-zinc-200 border-zinc-700 bg-zinc-800',
          firstCandidate: 'text-emerald-400 font-semibold bg-emerald-500/10 border-emerald-500/30',
          candidateItem: 'text-zinc-300 hover:text-white',
          badge: 'bg-zinc-800 text-zinc-400',
          firstBadge: 'bg-emerald-600 text-white',
        };
      case 'pure_contrast':
        return {
          container: 'bg-black border-2 border-amber-400 text-white shadow-2xl',
          inputBox: 'text-amber-300 border-amber-400 bg-zinc-950',
          firstCandidate: 'text-amber-300 font-bold bg-amber-400/20 border-amber-400',
          candidateItem: 'text-white hover:text-amber-200',
          badge: 'bg-zinc-800 text-amber-200',
          firstBadge: 'bg-amber-400 text-black font-bold',
        };
    }
  };

  const themeStyle = getThemeStyles(appearance.theme);

  return (
    <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3b82f6]" />
          <h3 className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">
            候选框实时外观预览
          </h3>
        </div>
        <span className="text-[11px] text-[#71717a] font-mono">
          {appearance.fontFamily} · {appearance.fontSize}px · {appearance.candidateCount} 候选
        </span>
      </div>

      {/* Interactive Typing Test Box */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-[#71717a] flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-[#71717a]" />
          按键编码模拟输入框 (可在此试打)：
        </label>
        <input
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="请输入拼音 (如 shurufa, gy, wo...)"
          className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6] transition-colors font-mono"
        />
      </div>

      {/* Floating Simulated Candidate Window */}
      <div className="pt-2 pb-1 flex justify-center">
        <div
          className={`rounded-xl border p-2.5 transition-all max-w-full overflow-x-auto ${themeStyle.container}`}
          style={{ fontFamily: appearance.fontFamily }}
        >
          {/* Pinyin pre-edit line */}
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10 text-xs font-mono">
            <span className="text-slate-400">编码:</span>
            <span className="underline decoration-blue-500 decoration-2 underline-offset-4 tracking-wide font-medium">
              {testInput || 'shurufa'}
            </span>
            {appearance.showLogo && (
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                GY
              </span>
            )}
          </div>

          {/* Candidate list inline */}
          <div className="flex items-center gap-2 flex-wrap">
            {candidates.map((word, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                    isFirst ? themeStyle.firstCandidate : `border-transparent ${themeStyle.candidateItem}`
                  }`}
                  style={{ fontSize: `${appearance.fontSize}px` }}
                >
                  <span
                    className={`text-[10px] w-4 h-4 rounded flex items-center justify-center font-mono font-bold ${
                      isFirst ? themeStyle.firstBadge : themeStyle.badge
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span>{word}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
