import React from 'react';
import { CikuEntry, EntryLevel, AppTheme, AppLang } from '../types/ciku';
import {
  X,
  Star,
  Pin,
  Bookmark,
  Trash2,
  Keyboard,
  Globe
} from 'lucide-react';

interface EntryDetailModalProps {
  entry: CikuEntry | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUpdateLevel: (id: string, level: EntryLevel) => void;
  onSendToKeep: (entry: CikuEntry) => void;
  onDeleteEntry: (id: string) => void;
  theme?: AppTheme;
  lang?: AppLang;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  onClose,
  onToggleFavorite,
  onTogglePin,
  onUpdateLevel,
  onSendToKeep,
  onDeleteEntry,
  theme = 'dark',
  lang = 'zh'
}) => {
  if (!entry) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className={`border rounded-lg w-full max-w-lg p-5 space-y-4 text-xs shadow-2xl transition-all ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#11131c] border-[#2a2d3e] text-zinc-200'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-start justify-between pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-[#222532]'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                {entry.word}
              </h2>
              {entry.english && (
                <span className={`text-xs px-2 py-0.5 rounded font-mono border flex items-center gap-1 ${
                  isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                }`}>
                  <Globe className="w-3 h-3" />
                  {entry.english}
                </span>
              )}
            </div>
            <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              ID: {entry.id} • {lang === 'en' ? 'Source' : '库源'}: <strong className={isLight ? 'text-slate-700' : 'text-zinc-200'}>{entry.sourceLibrary}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-[#181a26]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: 老三样 (Standard Input Encodings: Pinyin, Wubi, Double Pinyin, Cangjie) */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-mono tracking-wider text-blue-500 font-bold flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Classic Three Input Schemes (Pinyin / Wubi / Shuangpin / Cangjie)' : '老三样编码 (拼音 / 五笔 / 双拼 / 仓颉)'}</span>
          </div>

          <div className={`grid grid-cols-2 gap-2 font-mono p-2.5 rounded-md border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0c0d10] border-[#222532]'
          }`}>
            <div>
              <span className="text-[10px] text-zinc-500 block">① 拼音 (Pinyin):</span>
              <span className="text-xs font-bold text-blue-400">{entry.pinyin}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">② 五笔 (Wubi):</span>
              <span className="text-xs font-bold text-emerald-400">{entry.wubi || '待生成编码'}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">③ 双拼 (Shuangpin):</span>
              <span className="text-xs font-bold text-amber-400">{entry.shuangpin || entry.pinyin}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">④ 仓颉/简拼:</span>
              <span className="text-xs font-bold text-purple-400">{entry.cangjie || '暂无'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Content & Meaning */}
        <div className="space-y-2">
          <div className={`text-[10px] uppercase font-mono tracking-wider font-bold ${
            isLight ? 'text-slate-500' : 'text-zinc-500'
          }`}>
            2. {lang === 'en' ? 'Definition & Translation' : '词条内容与英文释义'}
          </div>

          <div className={`p-3 rounded-md border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0c0d10] border-[#222532]'
          }`}>
            <div>
              <span className={`font-mono text-[10px] block mb-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                {lang === 'en' ? 'POS & Definition' : '词性与解释'}
              </span>
              <p className={`leading-relaxed font-medium ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                <span className={`font-mono text-[10px] mr-1.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{entry.pos}</span>
                {entry.definition}
              </p>
            </div>

            {entry.english && (
              <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-[#1e212d]'}`}>
                <span className={`font-mono text-[10px] block mb-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {lang === 'en' ? 'English Translation' : '英文释义 / English Translation'}
                </span>
                <p className="text-emerald-500 font-bold text-xs">{entry.english}</p>
              </div>
            )}

            {entry.etymology && (
              <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-[#1e212d]'}`}>
                <span className={`font-mono text-[10px] block mb-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {lang === 'en' ? 'Etymology' : '语源背景与构词'}
                </span>
                <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{entry.etymology}</p>
              </div>
            )}

            {entry.exampleSentences && entry.exampleSentences.length > 0 && (
              <div className={`pt-2 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-[#1e212d]'}`}>
                <span className={`font-mono text-[10px] block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {lang === 'en' ? 'Examples' : '打字例句'}
                </span>
                <ul className={`list-disc pl-4 space-y-0.5 text-[11px] ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  {entry.exampleSentences.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className={`pt-2 border-t flex flex-wrap items-center gap-1 ${isLight ? 'border-slate-200' : 'border-[#1e212d]'}`}>
                <span className={`font-mono text-[10px] mr-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {lang === 'en' ? 'Tags:' : '分类标签:'}
                </span>
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-1.5 py-0.2 rounded text-[10px] border font-mono ${
                      isLight
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-[#181a26] text-zinc-400 border-[#272a38]'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Usage Stats */}
        <div className="space-y-2">
          <div className={`text-[10px] uppercase font-mono tracking-wider font-bold ${
            isLight ? 'text-slate-500' : 'text-zinc-500'
          }`}>
            3. {lang === 'en' ? 'Frequency & Stats' : '算法与使用数据'}
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono">
            <div className={`p-2.5 rounded text-center border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161824] border-[#222532]'
            }`}>
              <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                {lang === 'en' ? 'Confirmed' : '累计确认次数'}
              </div>
              <div className={`text-base font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>{entry.usageCount}</div>
            </div>

            <div className={`p-2.5 rounded text-center border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161824] border-[#222532]'
            }`}>
              <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                {lang === 'en' ? '7d / 30d Trend' : '7天 / 30天 趋势'}
              </div>
              <div className="text-xs font-bold text-emerald-500 mt-1">
                +{entry.trend7d}% / +{entry.trend30d}%
              </div>
            </div>

            <div className={`p-2.5 rounded text-center border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161824] border-[#222532]'
            }`}>
              <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                {lang === 'en' ? 'Frequency Level' : '当前词频等级'}
              </div>
              <div className="mt-1">
                {entry.level === 'FIXED' && <span className="text-emerald-500 font-bold">{lang === 'en' ? 'Fixed' : '固定词'}</span>}
                {entry.level === 'HIGH' && <span className="text-amber-500 font-bold">{lang === 'en' ? 'High' : '高频词'}</span>}
                {entry.level === 'MEMORY' && <span className="text-blue-500 font-bold">{lang === 'en' ? 'Memory' : '记忆词'}</span>}
                {entry.level === 'ONCE' && <span className="text-slate-400 font-bold">{lang === 'en' ? 'Once' : '一次词'}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Actions */}
        <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-[#222532]'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(entry.id)}
                className={`px-3 py-1.5 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  entry.isFavorited
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#181a26] border-[#272a38] text-zinc-300 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{entry.isFavorited ? (lang === 'en' ? 'Favorited' : '已收藏') : (lang === 'en' ? 'Favorite' : '收藏')}</span>
              </button>

              <button
                onClick={() => onTogglePin(entry.id)}
                className={`px-3 py-1.5 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  entry.isPinned
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#181a26] border-[#272a38] text-zinc-300 hover:text-white'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                <span>{entry.isPinned ? (lang === 'en' ? 'Pinned' : '已固定') : (lang === 'en' ? 'Pin' : '固定')}</span>
              </button>

              <button
                onClick={() => {
                  onSendToKeep(entry);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                title={lang === 'en' ? 'Create Keep Flashcard' : '发送至 Keep 生成复习卡片'}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Keep Card' : '生成 Keep 卡片'}</span>
              </button>
            </div>

            {entry.category === 'PERSONAL' && (
              <button
                onClick={() => {
                  if (window.confirm(lang === 'en' ? 'Delete this entry?' : '确定要删除该个人词条吗？')) {
                    onDeleteEntry(entry.id);
                    onClose();
                  }
                }}
                className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 rounded text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Delete' : '删除'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
