import React, { useState } from 'react';
import { CikuEntry } from '../types/ciku';
import { Search, Star, Pin, Filter, X } from 'lucide-react';

interface SearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  entries: CikuEntry[];
  onSelectEntry: (entry: CikuEntry) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  query,
  onQueryChange,
  entries,
  onSelectEntry,
  onToggleFavorite,
  onTogglePin
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'WORD' | 'PINYIN' | 'DEF' | 'TAG'>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  // Filter entries
  const filtered = React.useMemo(() => {
    let result = entries;
    const q = query.trim().toLowerCase();

    if (q) {
      result = result.filter((item) => {
        if (filterType === 'WORD') return item.word.toLowerCase().includes(q);
        if (filterType === 'PINYIN') return item.pinyin.toLowerCase().includes(q);
        if (filterType === 'DEF') return item.definition.toLowerCase().includes(q);
        if (filterType === 'TAG') return item.tags.some((t) => t.toLowerCase().includes(q));

        // ALL fields
        return (
          item.word.toLowerCase().includes(q) ||
          item.pinyin.toLowerCase().includes(q) ||
          item.definition.toLowerCase().includes(q) ||
          (item.etymology && item.etymology.toLowerCase().includes(q)) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.exampleSentences.some((s) => s.toLowerCase().includes(q))
        );
      });
    }

    if (filterLevel !== 'ALL') {
      result = result.filter((e) => e.level === filterLevel);
    }

    return result;
  }, [entries, query, filterType, filterLevel]);

  return (
    <div className="space-y-4">
      {/* Search Header Panel */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span>全局词条与词频检索</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              多维支持：中文词语、全拼/首字母、释义例句、自定义标签。
            </p>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 bg-[#181a26] px-2.5 py-1 rounded border border-[#272a38] self-start sm:self-center">
            <span>按键:</span>
            <kbd className="px-1 py-0.2 bg-[#0c0d10] text-zinc-300 rounded border border-[#272a38]">
              /
            </kbd>
            <span>聚焦</span>
            <kbd className="px-1 py-0.2 bg-[#0c0d10] text-zinc-300 rounded border border-[#272a38]">
              Esc
            </kbd>
            <span>清空</span>
          </div>
        </div>

        {/* Input Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="输入搜索关键字，如：机器学习、ji qi xue xi、AI、算法..."
            className="w-full bg-[#0c0d10] border border-[#272a38] rounded-md py-2 pl-9 pr-8 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600"
            autoFocus
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded hover:bg-[#181a26]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222532] text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-zinc-500 mr-1 flex items-center gap-1 font-mono text-[11px]">
              <Filter className="w-3 h-3" /> 匹配字段:
            </span>
            {[
              { id: 'ALL', label: '全部' },
              { id: 'WORD', label: '词语' },
              { id: 'PINYIN', label: '拼音' },
              { id: 'DEF', label: '释义例句' },
              { id: 'TAG', label: '标签' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  filterType === f.id
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-[#181a26] text-zinc-400 hover:text-zinc-200 border border-[#272a38]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="text-zinc-500 mr-1">词频等级:</span>
            {[
              { id: 'ALL', label: '全部' },
              { id: 'FIXED', label: '固定' },
              { id: 'HIGH', label: '高频' },
              { id: 'MEMORY', label: '记忆' },
              { id: 'ONCE', label: '一次' }
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setFilterLevel(lvl.id)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterLevel === lvl.id
                    ? 'bg-zinc-700 text-white font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-mono">
          <span>共找到 {filtered.length} 个结果</span>
          {query && (
            <span>
              正在检索 “<strong className="text-blue-400">{query}</strong>”
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#11131c] border border-[#222532] rounded-md space-y-2">
            <p className="text-sm font-medium text-zinc-300">未找到匹配的词条</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              尝试更改关键字或点击右上角“新建词条”添加至个人词库。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectEntry(item)}
                className="p-3 bg-[#11131c] border border-[#222532] hover:border-[#383d52] rounded-md transition-colors cursor-pointer flex flex-col justify-between space-y-2 group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                        {item.word}
                      </h3>
                      <span className="font-mono text-xs text-zinc-400 bg-[#181a26] px-1.5 py-0.2 rounded border border-[#272a38]">
                        {item.pinyin}
                      </span>
                      {item.wubi && (
                        <span className="font-mono text-[11px] text-amber-400 bg-amber-950/30 px-1 py-0.2 rounded border border-amber-900/50">
                          五笔:{item.wubi}
                        </span>
                      )}
                      {item.shuangpin && (
                        <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/30 px-1 py-0.2 rounded border border-cyan-900/50">
                          双拼:{item.shuangpin}
                        </span>
                      )}
                      {item.cangjie && (
                        <span className="font-mono text-[11px] text-indigo-400 bg-indigo-950/30 px-1 py-0.2 rounded border border-indigo-900/50">
                          仓颉:{item.cangjie}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(item.id)}
                        className={`p-1 rounded hover:bg-[#181a26] transition-colors ${
                          item.isFavorited ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
                        }`}
                        title={item.isFavorited ? '取消收藏' : '收藏'}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={() => onTogglePin(item.id)}
                        className={`p-1 rounded hover:bg-[#181a26] transition-colors ${
                          item.isPinned ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-300'
                        }`}
                        title={item.isPinned ? '取消固定' : '固定词条'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Definition & English */}
                  <div className="space-y-1 mt-1.5">
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      <span className="text-zinc-500 font-mono text-[10px] mr-1">{item.pos}</span>
                      {item.definition}
                    </p>
                    {item.english && (
                      <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                        <span className="text-blue-400 font-bold">EN:</span> {item.english}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Tags & Level */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1e212d] text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#181a26] text-zinc-400 px-1.5 py-0.2 rounded border border-[#272a38]">
                      {item.sourceLibrary}
                    </span>
                    <span className="text-zinc-500">
                      频次: <strong className="text-zinc-300">{item.usageCount}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.level === 'FIXED' && (
                      <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.2 rounded font-bold">
                        固定
                      </span>
                    )}
                    {item.level === 'HIGH' && (
                      <span className="text-orange-400 bg-orange-950/40 border border-orange-800/60 px-1.5 py-0.2 rounded font-bold">
                        高频
                      </span>
                    )}
                    {item.level === 'MEMORY' && (
                      <span className="text-blue-400 bg-blue-950/40 border border-blue-800/60 px-1.5 py-0.2 rounded font-bold">
                        记忆
                      </span>
                    )}
                    {item.level === 'ONCE' && (
                      <span className="text-zinc-400 bg-[#181a26] border border-[#272a38] px-1.5 py-0.2 rounded font-bold">
                        一次
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
