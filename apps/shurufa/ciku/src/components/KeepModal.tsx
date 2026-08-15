import React from 'react';
import { Bookmark, X } from 'lucide-react';
import { KeepCard } from '../types/ciku';

interface KeepModalProps {
  card: KeepCard | null;
  onClose: () => void;
}

export const KeepModal: React.FC<KeepModalProps> = ({ card, onClose }) => {
  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#11131c] border border-emerald-800/60 rounded-md w-full max-w-sm p-5 space-y-3 relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-zinc-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">生成 Keep 记忆复习卡片</h3>
            <span className="text-[10px] text-emerald-400 font-mono">GyenBox Spaced Repetition</span>
          </div>
        </div>

        <div className="p-3 bg-[#0c0d10] border border-[#222532] rounded space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-100 text-sm">{card.word}</span>
            <span className="font-mono text-zinc-400 text-xs">{card.pinyin}</span>
          </div>
          <p className="text-zinc-300 text-xs line-clamp-2">{card.definition}</p>
          <div className="text-[10px] text-zinc-500 border-t border-[#1e212d] pt-1.5 flex items-center justify-between font-mono">
            <span>推荐复习时间:</span>
            <span className="text-emerald-400 font-medium">{card.nextReviewAt}</span>
          </div>
        </div>

        <div className="p-2.5 bg-[#161824] border border-[#222532] rounded text-[10px] text-zinc-400 leading-normal">
          <strong>架构防混淆提示:</strong> 本词条仅作为单独练习卡片存在于 Keep。此操作不会全量同步或复制词库数据，确保业务职责清晰隔离。
        </div>

        <button
          onClick={onClose}
          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-xs transition-colors"
        >
          确认完成
        </button>
      </div>
    </div>
  );
};
