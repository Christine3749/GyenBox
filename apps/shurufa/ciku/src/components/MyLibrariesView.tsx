import React, { useState } from 'react';
import { CikuEntry, ImportPreviewResult } from '../types/ciku';
import { CikuApiService } from '../services/api';
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Pin,
  CheckSquare,
  Square,
  AlertCircle,
  X,
  FolderPlus
} from 'lucide-react';

interface MyLibrariesViewProps {
  entries: CikuEntry[];
  onRefreshEntries: () => void;
  onSelectEntry: (entry: CikuEntry) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MyLibrariesView: React.FC<MyLibrariesViewProps> = ({
  entries,
  onRefreshEntries,
  onSelectEntry,
  onShowToast
}) => {
  const personalEntries = entries.filter((e) => e.category === 'PERSONAL');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);

  // New term state
  const [newWord, setNewWord] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newPos, setNewPos] = useState('n. 个人短语');
  const [newDefinition, setNewDefinition] = useState('');

  // Batch actions
  const toggleSelectAll = () => {
    if (selectedIds.length === personalEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(personalEntries.map((e) => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个词条吗？`)) return;

    for (const id of selectedIds) {
      await CikuApiService.deletePersonalEntry(id);
    }
    setSelectedIds([]);
    onRefreshEntries();
    onShowToast(`已批量删除 ${selectedIds.length} 个词条`, 'success');
  };

  const handleBatchPin = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await CikuApiService.updatePersonalEntry(id, { isPinned: true, level: 'FIXED' });
    }
    setSelectedIds([]);
    onRefreshEntries();
    onShowToast(`已批量固定 ${selectedIds.length} 个词条`, 'success');
  };

  // Create personal entry
  const handleCreatePersonal = async () => {
    if (!newWord || !newPinyin) {
      onShowToast('词语和拼音为必填项', 'error');
      return;
    }

    await CikuApiService.createPersonalEntry({
      word: newWord,
      pinyin: newPinyin,
      pos: newPos,
      definition: newDefinition || '用户自定义词条',
      exampleSentences: [],
      relatedTerms: [],
      usageCount: 1,
      category: 'PERSONAL',
      sourceLibrary: '我的个人词库',
      level: 'MEMORY',
      isFavorited: true,
      isPinned: false,
      tags: ['个人', '自定义'],
      trend7d: 0,
      trend30d: 0
    });

    setNewWord('');
    setNewPinyin('');
    setNewDefinition('');
    setShowCreateModal(false);
    onRefreshEntries();
    onShowToast('个人新词条已创建并存储于云端个人库', 'success');
  };

  // Import file handle
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      setImportContent(text);
      const preview = CikuApiService.parseImportFile(text, file.name);
      setPreviewResult(preview);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!previewResult) return;
    const added = CikuApiService.executeImport(previewResult);
    setShowImportModal(false);
    setPreviewResult(null);
    setImportContent('');
    onRefreshEntries();
    onShowToast(`词库导入成功！共写入 ${added} 条新词`, 'success');
  };

  // Export
  const handleExport = (format: 'TXT' | 'CSV' | 'JSON') => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'JSON') {
      content = JSON.stringify(personalEntries, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else if (format === 'CSV') {
      content = '词语,拼音,词性,释义,使用次数,等级\n' +
        personalEntries.map((e) => `"${e.word}","${e.pinyin}","${e.pos}","${e.definition}",${e.usageCount},${e.level}`).join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    } else {
      content = personalEntries.map((e) => `${e.word}\t${e.pinyin}\t${e.pos}\t${e.definition}`).join('\n');
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gy_personal_ciku_${new Date().toISOString().slice(0,10)}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`导出成功 (${ext.toUpperCase()})`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-blue-400" />
            <span>我的个人词库管理</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            管理专属名片、自定义快捷短语、导入搜狗/Rime/TXT词库，支持预审与批量管理。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建个人词条</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 bg-[#181a26] hover:bg-[#202230] text-zinc-300 border border-[#272a38] rounded-md text-xs flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>导入词库</span>
          </button>

          <div className="relative group">
            <button className="px-3 py-1.5 bg-[#181a26] hover:bg-[#202230] text-zinc-300 border border-[#272a38] rounded-md text-xs flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>导出词库</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-[#11131c] border border-[#272a38] rounded-md shadow-lg p-1 z-20 min-w-[120px] text-xs">
              <button
                onClick={() => handleExport('TXT')}
                className="w-full text-left px-2.5 py-1 hover:bg-[#181a26] rounded text-zinc-300"
              >
                TXT 文本格式
              </button>
              <button
                onClick={() => handleExport('CSV')}
                className="w-full text-left px-2.5 py-1 hover:bg-[#181a26] rounded text-zinc-300"
              >
                CSV 表格格式
              </button>
              <button
                onClick={() => handleExport('JSON')}
                className="w-full text-left px-2.5 py-1 hover:bg-[#181a26] rounded text-zinc-300"
              >
                JSON 完整备份
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Bar */}
      <div className="p-2.5 bg-[#11131c] border border-[#222532] rounded-md flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white"
          >
            {selectedIds.length === personalEntries.length && personalEntries.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-blue-400" />
            ) : (
              <Square className="w-4 h-4 text-zinc-500" />
            )}
            <span>全选 ({personalEntries.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <span className="text-blue-400 font-medium">已选择 {selectedIds.length} 项</span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchPin}
              className="px-2.5 py-1 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 rounded text-xs flex items-center gap-1 font-medium"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>批量固定</span>
            </button>

            <button
              onClick={handleBatchDelete}
              className="px-2.5 py-1 bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 rounded text-xs flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>批量删除</span>
            </button>
          </div>
        )}
      </div>

      {/* Personal Entries List */}
      <div className="space-y-2">
        {personalEntries.length === 0 ? (
          <div className="p-12 text-center bg-[#11131c] border border-[#222532] rounded-md space-y-2">
            <p className="text-sm font-medium text-zinc-300">还没有个人词条</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              开始使用 GY 输入法后，这里会逐渐形成你的专属词库。或使用上方的“导入词库”快速迁移旧数据。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {personalEntries.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-3 bg-[#11131c] border rounded-md transition-colors cursor-pointer flex flex-col justify-between space-y-2 group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/20'
                      : 'border-[#222532] hover:border-[#383d52]'
                  }`}
                  onClick={() => onSelectEntry(item)}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className="mt-0.5 text-zinc-500 hover:text-blue-400"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                            {item.word}
                          </h3>
                          <span className="font-mono text-xs text-zinc-400 bg-[#181a26] px-1.5 py-0.2 rounded border border-[#272a38]">
                            {item.pinyin}
                          </span>
                        </div>
                        {item.isPinned && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.2 rounded font-bold font-mono">
                            固定
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        <span className="text-zinc-500 font-mono text-[10px] mr-1.5">{item.pos}</span>
                        {item.definition}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#1e212d] text-zinc-500 font-mono">
                    <span>使用频次: {item.usageCount} 次</span>
                    <span>更新于 {item.lastUsedTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Personal Term */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#11131c] border border-[#2a2d3e] rounded-md w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222532]">
              <h3 className="text-sm font-bold text-zinc-100">新建个人词条</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">中文词语 *</label>
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="例如: 具身智能、GyenBox"
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">拼音全拼 *</label>
                <input
                  type="text"
                  value={newPinyin}
                  onChange={(e) => setNewPinyin(e.target.value)}
                  placeholder="例如: ju shen zhi neng"
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">词性标注</label>
                <input
                  type="text"
                  value={newPos}
                  onChange={(e) => setNewPos(e.target.value)}
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">简短释义或个人备注</label>
                <textarea
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  placeholder="为本词条添加个人释义说明..."
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222532]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1 bg-[#181a26] text-zinc-300 rounded text-xs border border-[#272a38]"
              >
                取消
              </button>
              <button
                onClick={handleCreatePersonal}
                className="px-4 py-1 bg-blue-600 text-white font-medium rounded text-xs"
              >
                存入个人库
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Preview Confirmation */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#11131c] border border-[#2a2d3e] rounded-md w-full max-w-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222532]">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>导入词库预审与校验</span>
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPreviewResult(null);
                }}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  选择词库文件 (支持 TXT / CSV / JSON)
                </label>
                <input
                  type="file"
                  accept=".txt,.csv,.json"
                  onChange={handleFileChange}
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-300 text-xs"
                />
              </div>

              {previewResult && (
                <div className="space-y-2.5 bg-[#0c0d10] p-3 border border-[#272a38] rounded">
                  <div className="flex items-center justify-between border-b border-[#222532] pb-1.5 font-mono">
                    <span className="font-bold text-zinc-200">文件: {previewResult.fileName}</span>
                    <span className="text-[10px] bg-[#181a26] text-blue-400 px-1.5 py-0.2 rounded border border-blue-900/30">
                      解析 {previewResult.totalParsed} 行
                    </span>
                  </div>

                  {/* Pre-import Statistics Badge Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-1.5 bg-emerald-950/40 border border-emerald-800/50 rounded">
                      <div className="text-emerald-400 font-bold text-sm">
                        +{previewResult.newCount}
                      </div>
                      <div className="text-[10px] text-zinc-400">新增词条</div>
                    </div>

                    <div className="p-1.5 bg-[#181a26] border border-[#272a38] rounded">
                      <div className="text-zinc-300 font-bold text-sm">
                        {previewResult.duplicateCount}
                      </div>
                      <div className="text-[10px] text-zinc-400">完全重复</div>
                    </div>

                    <div className="p-1.5 bg-orange-950/40 border border-orange-800/50 rounded">
                      <div className="text-orange-400 font-bold text-sm">
                        {previewResult.conflictCount}
                      </div>
                      <div className="text-[10px] text-zinc-400">拼音冲突</div>
                    </div>

                    <div className="p-1.5 bg-rose-950/40 border border-rose-800/50 rounded">
                      <div className="text-rose-400 font-bold text-sm">
                        {previewResult.invalidCount}
                      </div>
                      <div className="text-[10px] text-zinc-400">无效/跳过</div>
                    </div>
                  </div>

                  {/* Warning Notice */}
                  <div className="p-2.5 bg-[#181a26] border border-[#272a38] rounded text-zinc-400 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span>
                      未经二次确认，系统绝对不会自动覆盖原有个人词库数据。
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222532]">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPreviewResult(null);
                }}
                className="px-3 py-1 bg-[#181a26] text-zinc-300 rounded text-xs border border-[#272a38]"
              >
                取消
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!previewResult}
                className={`px-4 py-1 font-medium rounded text-xs transition-colors ${
                  previewResult
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-[#181a26] text-zinc-600 cursor-not-allowed border border-[#272a38]'
                }`}
              >
                确认写入个人词库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
