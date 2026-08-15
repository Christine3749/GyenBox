import React, { useState } from 'react';
import { LearnedWord, WordCategory } from '../types';
import {
  BookOpen,
  Pin,
  Trash2,
  Bookmark,
  Sparkles,
  Search,
  Filter,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface LearningSectionProps {
  words: LearnedWord[];
  onUpdateWords: (updatedWords: LearnedWord[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LearningSection: React.FC<LearningSectionProps> = ({
  words,
  onUpdateWords,
  onShowToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Add new word modal input
  const [newWord, setNewWord] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Category change for single word
  const handleChangeCategory = (id: string, newCat: WordCategory) => {
    const updated = words.map((w) => (w.id === id ? { ...w, category: newCat, synced: true } : w));
    onUpdateWords(updated);
    const target = words.find((w) => w.id === id);
    onShowToast(`已将「${target?.word}」归类为 ${getCategoryLabel(newCat)}`, 'success');
  };

  // Delete single word
  const handleDeleteWord = (id: string) => {
    const target = words.find((w) => w.id === id);
    const updated = words.filter((w) => w.id !== id);
    onUpdateWords(updated);
    onShowToast(`已从个人词库中删除「${target?.word}」`, 'info');
  };

  // Add new custom word
  const handleAddWord = () => {
    if (!newWord.trim() || !newPinyin.trim()) {
      onShowToast('请完整输入词汇与对应拼音', 'error');
      return;
    }
    const item: LearnedWord = {
      id: `w-${Date.now()}`,
      word: newWord.trim(),
      pinyin: newPinyin.trim().toLowerCase(),
      count: 1,
      lastUsedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      category: 'fixed',
      synced: true,
    };
    onUpdateWords([item, ...words]);
    setNewWord('');
    setNewPinyin('');
    setShowAddModal(false);
    onShowToast(`已添加固定词条「${item.word}」`, 'success');
  };

  // Batch delete
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    const updated = words.filter((w) => !selectedIds.includes(w.id));
    onUpdateWords(updated);
    setSelectedIds([]);
    onShowToast(`已批量删除 ${selectedIds.length} 项词条`, 'info');
  };

  // Batch set to fixed
  const handleBatchFix = () => {
    if (selectedIds.length === 0) return;
    const updated = words.map((w) =>
      selectedIds.includes(w.id) ? { ...w, category: 'fixed' as WordCategory } : w
    );
    onUpdateWords(updated);
    setSelectedIds([]);
    onShowToast(`已将选中的 ${selectedIds.length} 项设置为固定词`, 'success');
  };

  // Helper labels
  function getCategoryLabel(cat: WordCategory) {
    switch (cat) {
      case 'single':
        return '出现一次';
      case 'memorized':
        return '记忆词';
      case 'high_freq':
        return '高频词';
      case 'fixed':
        return '固定词';
    }
  }

  function getCategoryBadge(cat: WordCategory) {
    switch (cat) {
      case 'single':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'memorized':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'high_freq':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'fixed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  }

  // Filtering
  const filteredWords = words.filter((w) => {
    const matchesCat = selectedCategory === 'all' || w.category === selectedCategory;
    const matchesSearch =
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.pinyin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredWords.length / pageSize) || 1;
  const pageWords = filteredWords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isAllPageSelected =
    pageWords.length > 0 && pageWords.every((w) => selectedIds.includes(w.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageWords.some((w) => w.id === id)));
    } else {
      const newIds = Array.from(new Set([...selectedIds, ...pageWords.map((w) => w.id)]));
      setSelectedIds(newIds);
    }
  };

  return (
    <div className="space-y-6">
      {/* Explicit Account Privacy Declaration Banner */}
      <div className="bg-[#18181b] rounded-xl border border-[#3b82f6]/30 p-4 sm:p-5 flex items-start gap-3.5 relative overflow-hidden">
        <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center shrink-0 border border-[#3b82f6]/30">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#fafafa]">个人打字学习与词库隔离声明</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6] font-mono border border-[#3b82f6]/20">
              GyenBox 账号可信私有
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            “这些数据只属于当前 GyenBox 账号，不会自动进入公共词库。”
          </p>
          <p className="text-[11px] text-[#71717a] leading-relaxed">
            所有习惯词、热词和高频输入记录均使用端到端算法按当前 GyenBox 用户精准隔离。
          </p>
        </div>
      </div>

      {/* 4 Category Rules Explanation Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            cat: 'single' as WordCategory,
            title: '出现一次',
            count: words.filter((w) => w.category === 'single').length,
            rule: '弱候选，不强推',
            desc: '仅临时出现1次，若长期不使用将随时间自然衰减清理',
          },
          {
            cat: 'memorized' as WordCategory,
            title: '记忆词',
            count: words.filter((w) => w.category === 'memorized').length,
            rule: '多次使用或主动确认',
            desc: '打字命中 2 次以上或用户点击记住，优先级较高',
          },
          {
            cat: 'high_freq' as WordCategory,
            title: '高频词',
            count: words.filter((w) => w.category === 'high_freq').length,
            rule: '时间衰减加权计算',
            desc: '近期高强度使用，由词频衰减打分算法自动提升至前置候选',
          },
          {
            cat: 'fixed' as WordCategory,
            title: '固定词',
            count: words.filter((w) => w.category === 'fixed').length,
            rule: '用户手动固定',
            desc: '永远置顶上屏，绝不被时间衰减清理',
          },
        ].map((item) => (
          <div
            key={item.cat}
            onClick={() => {
              setSelectedCategory(item.cat);
              setCurrentPage(1);
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedCategory === item.cat
                ? 'bg-[#3b82f6]/20 border-[#3b82f6] shadow-md ring-1 ring-[#3b82f6]'
                : 'bg-[#18181b] border-[#27272a] hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">{item.title}</span>
              <span className="text-xs font-mono font-bold text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-0.5 rounded-full border border-[#3b82f6]/20">
                {item.count}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-[#3b82f6] mt-1">{item.rule}</div>
            <div className="text-[10px] text-[#71717a] mt-0.5">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Main Controls & Search */}
      <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#3b82f6] text-white shadow-sm'
                  : 'bg-[#09090b] text-[#71717a] hover:text-white border border-[#27272a]'
              }`}
            >
              全部 ({words.length})
            </button>
            {(['single', 'memorized', 'high_freq', 'fixed'] as WordCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#3b82f6] text-white shadow-sm'
                    : 'bg-[#09090b] text-[#71717a] hover:text-white border border-[#27272a]'
                }`}
              >
                {getCategoryLabel(cat)} ({words.filter((w) => w.category === cat).length})
              </button>
            ))}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="搜索中文词或拼音..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6] w-44 sm:w-56"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-medium transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              添加固定词
            </button>
          </div>
        </div>

        {/* Batch Operations Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-xs text-blue-200">
            <span>已选中 {selectedIds.length} 项词条</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchFix}
                className="px-3 py-1 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-medium"
              >
                设置成固定词
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
              >
                批量删除
              </button>
            </div>
          </div>
        )}

        {/* Word Table */}
        <div className="overflow-x-auto rounded-lg border border-[#27272a]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#09090b] text-[#71717a] font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a]">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-3.5 h-3.5 accent-[#3b82f6] rounded cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">中文词</th>
                <th className="px-4 py-3">拼音编码</th>
                <th className="px-4 py-3">使用次数</th>
                <th className="px-4 py-3">最近使用时间</th>
                <th className="px-4 py-3">分类状态</th>
                <th className="px-4 py-3">同步标识</th>
                <th className="px-4 py-3 text-right">词库操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] bg-[#18181b]">
              {pageWords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#71717a]">
                    没有找到符合条件的数据词条
                  </td>
                </tr>
              ) : (
                pageWords.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#27272a]/50 transition-colors ${
                        isSelected ? 'bg-[#3b82f6]/10' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedIds(selectedIds.filter((id) => id !== item.id));
                            } else {
                              setSelectedIds([...selectedIds, item.id]);
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[#3b82f6] rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-100 text-sm">
                        {item.word}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#71717a]">
                        {item.pinyin}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {item.count} 次
                      </td>
                      <td className="px-4 py-3 text-[#71717a] font-mono text-[11px]">
                        {item.lastUsedAt}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getCategoryBadge(
                            item.category
                          )}`}
                        >
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.synced ? (
                          <span className="text-[10px] text-[#22c55e] font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 已同步
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717a] font-mono">待同步</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.category !== 'fixed' ? (
                            <button
                              onClick={() => handleChangeCategory(item.id, 'fixed')}
                              className="px-2 py-1 rounded bg-[#09090b] border border-[#27272a] hover:bg-[#27272a] text-[11px] text-slate-300 hover:text-white transition-colors"
                              title="固定词条，防止衰减"
                            >
                              固定
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChangeCategory(item.id, 'memorized')}
                              className="px-2 py-1 rounded bg-[#09090b] border border-[#27272a] hover:bg-[#27272a] text-[11px] text-[#71717a] hover:text-slate-200 transition-colors"
                              title="取消固定"
                            >
                              取消固定
                            </button>
                          )}

                          {item.category !== 'memorized' && (
                            <button
                              onClick={() => handleChangeCategory(item.id, 'memorized')}
                              className="px-2 py-1 rounded bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 text-[11px] text-[#3b82f6] transition-colors"
                            >
                              记住
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteWord(item.id)}
                            className="p-1.5 text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title="删除此词"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between text-xs text-[#71717a] pt-2">
          <span>
            共 {filteredWords.length} 条记录 · 第 {currentPage} / {totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-[#09090b] border border-[#27272a] hover:bg-[#27272a] text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-[#09090b] border border-[#27272a] hover:bg-[#27272a] text-slate-300 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Custom Word Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#3b82f6]" />
              添加固定词条到个人词库
            </h3>
            <p className="text-xs text-[#71717a]">
              手动添加的固定词条将永久保存在您的 GyenBox 账号下，置顶候选且不会被词频衰减清理。
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">中文词条</label>
                <input
                  type="text"
                  placeholder="如: GyenBox 创新"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">对应拼音编码</label>
                <input
                  type="text"
                  placeholder="如: g y e n b o x chuang xin"
                  value={newPinyin}
                  onChange={(e) => setNewPinyin(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded border border-[#27272a] hover:bg-[#27272a] text-slate-300 text-xs font-medium"
              >
                取消
              </button>
              <button
                onClick={handleAddWord}
                className="px-4 py-2 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-medium"
              >
                确认添加固定词
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
