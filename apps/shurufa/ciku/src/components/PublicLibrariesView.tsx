import React, { useState } from 'react';
import { LibraryItem, PendingSubmission } from '../types/ciku';
import { CikuApiService } from '../services/api';
import {
  Globe,
  Clock,
  Plus,
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface PublicLibrariesViewProps {
  libraries: LibraryItem[];
  submissions: PendingSubmission[];
  onRefreshSubmissions: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublicLibrariesView: React.FC<PublicLibrariesViewProps> = ({
  libraries,
  submissions,
  onRefreshSubmissions,
  onShowToast
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitWord, setSubmitWord] = useState('');
  const [submitPinyin, setSubmitPinyin] = useState('');
  const [submitPos, setSubmitPos] = useState('n. 行业术语');
  const [submitDefinition, setSubmitDefinition] = useState('');

  const handleSubmitPublic = async () => {
    if (!submitWord || !submitPinyin) {
      onShowToast('请填写完整的词语和拼音', 'error');
      return;
    }

    if (
      submitWord.includes('密码') ||
      submitWord.includes('WIFI') ||
      submitWord.includes('身份证') ||
      submitWord.includes('密钥')
    ) {
      onShowToast('检测到可能包含私密敏感信息，已被系统自动拦截', 'error');
      return;
    }

    await CikuApiService.submitPublicEntry({
      word: submitWord,
      pinyin: submitPinyin,
      pos: submitPos,
      definition: submitDefinition || '社区贡献公共词条',
      category: 'TECH'
    });

    setSubmitWord('');
    setSubmitPinyin('');
    setSubmitDefinition('');
    setShowSubmitModal(false);
    onRefreshSubmissions();
    onShowToast('词条已提交至知识库审核队列，状态设为【待审核】', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                公共词库与社区贡献中心
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                公共词库仅包含经过权威校验的基础词典与人工/自动化双重审核校验的标准词条。
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>提交公共词条</span>
          </button>
        </div>

        {/* Privacy Guarantee Badge */}
        <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded text-xs text-blue-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong>零私密泄漏保障:</strong> 用户打字输入的个人隐私词条绝对不会自动混入公共词库。公共词库仅支持用户显式主动提交并成功通过合规审核的内容。
          </div>
        </div>
      </div>

      {/* Public Libraries Grid */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 font-mono">
          已挂载的公共词库版本
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {libraries.map((lib) => (
            <div
              key={lib.id}
              className="p-3 bg-[#11131c] border border-[#222532] rounded-md space-y-2 hover:border-[#383d52] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-zinc-100">{lib.name}</h3>
                  <span className="text-[10px] font-mono bg-[#181a26] text-zinc-300 px-1.5 py-0.2 rounded border border-[#272a38]">
                    {lib.version}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {lib.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1e212d] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>包含 {lib.count.toLocaleString()} 条</span>
                <span>更新: {lib.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Submissions Queue Table */}
      <div className="bg-[#11131c] border border-[#222532] rounded-md p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-[#222532] pb-2">
          <div>
            <h2 className="text-xs font-bold text-zinc-200 flex items-center gap-2 font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>词条提交审核记录与队列</span>
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            共 {submissions.length} 条记录
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#161824] text-zinc-400 font-mono text-[11px] uppercase border-b border-[#242736]">
                <th className="py-2 px-3 font-semibold">词语</th>
                <th className="py-2 px-3 font-semibold">拼音</th>
                <th className="py-2 px-3 font-semibold">词性与释义</th>
                <th className="py-2 px-3 font-semibold">提交时间</th>
                <th className="py-2 px-3 font-semibold">审核状态</th>
                <th className="py-2 px-3 font-semibold">说明或原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e212d] text-zinc-300">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#161824] transition-colors">
                  <td className="py-2 px-3 font-bold text-zinc-100 text-sm">{sub.word}</td>
                  <td className="py-2 px-3 font-mono text-zinc-400 text-xs">{sub.pinyin}</td>
                  <td className="py-2 px-3 text-zinc-400 max-w-xs truncate text-xs">
                    <span className="text-zinc-500 font-mono text-[10px] mr-1">{sub.pos}</span>
                    {sub.definition}
                  </td>
                  <td className="py-2 px-3 font-mono text-zinc-500 text-xs">{sub.submittedAt}</td>
                  <td className="py-2 px-3">
                    {sub.status === 'PENDING' && (
                      <span className="text-blue-400 bg-blue-950/40 border border-blue-800/60 px-2 py-0.2 rounded text-[10px] font-bold flex items-center gap-1 w-fit font-mono">
                        <Clock className="w-3 h-3" /> 审核中
                      </span>
                    )}
                    {sub.status === 'APPROVED' && (
                      <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.2 rounded text-[10px] font-bold flex items-center gap-1 w-fit font-mono">
                        <CheckCircle2 className="w-3 h-3" /> 已通过
                      </span>
                    )}
                    {sub.status === 'REJECTED' && (
                      <span className="text-rose-400 bg-rose-950/40 border border-rose-800/60 px-2 py-0.2 rounded text-[10px] font-bold flex items-center gap-1 w-fit font-mono">
                        <XCircle className="w-3 h-3" /> 已拒绝
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-zinc-400 text-[11px] max-w-xs">
                    {sub.rejectionReason || '系统多重校验中...'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Public Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#11131c] border border-[#2a2d3e] rounded-md w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222532]">
              <h3 className="text-sm font-bold text-zinc-100">提交新词条至公共库</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">词语 *</label>
                <input
                  type="text"
                  value={submitWord}
                  onChange={(e) => setSubmitWord(e.target.value)}
                  placeholder="例如: 深度检索增强"
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">拼音全拼 *</label>
                <input
                  type="text"
                  value={submitPinyin}
                  onChange={(e) => setSubmitPinyin(e.target.value)}
                  placeholder="例如: shen du jian suo zeng qiang"
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">词条解释与行业背景</label>
                <textarea
                  value={submitDefinition}
                  onChange={(e) => setSubmitDefinition(e.target.value)}
                  placeholder="请简要阐述本词条含义，帮助审核人员快速校验..."
                  className="w-full bg-[#0c0d10] border border-[#272a38] rounded p-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                  rows={2}
                />
              </div>

              <div className="p-2.5 bg-amber-950/30 border border-amber-900/40 rounded text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>请勿提交任何私人姓名、内部网络密码、公司隐私或私密服务器地址。</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222532]">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-3 py-1 bg-[#181a26] text-zinc-300 rounded text-xs border border-[#272a38]"
              >
                取消
              </button>
              <button
                onClick={handleSubmitPublic}
                className="px-4 py-1 bg-blue-600 text-white font-medium rounded text-xs"
              >
                提交审核
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
