import React from 'react';
import { BookOpen, Keyboard, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { CikuEntry, SyncStatus } from '../types/ciku';

interface PersonalCenterViewProps {
  entries: CikuEntry[];
  syncStatus: SyncStatus;
  onNavigate: (view: string) => void;
}

export const PersonalCenterView: React.FC<PersonalCenterViewProps> = ({ entries, syncStatus, onNavigate }) => {
  const personalEntries = entries.filter((entry) => entry.category === 'PERSONAL');
  const fixedCount = personalEntries.filter((entry) => entry.level === 'FIXED').length;
  const memoryCount = personalEntries.filter((entry) => entry.level === 'MEMORY').length;

  return (
    <div className="space-y-4">
      <section className="p-4 bg-[#11131c] border border-[#222532] rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#161824] border border-blue-900/60 rounded flex items-center justify-center">
            <UserRound className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-blue-400 font-mono font-bold tracking-wider">GYENBOX_ACCOUNT</p>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">个人中心</h1>
            <p className="text-xs text-zinc-500 mt-1">个人词条、输入法配置与设备同步的辅助工作台。</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-emerald-400">账号已连接</span>
          <span className="text-zinc-500">gyenbox_user</span>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PersonalMetric label="我的个人词条" value={personalEntries.length} detail="仅当前账号可见" tone="blue" />
        <PersonalMetric label="记忆词" value={memoryCount} detail="多次使用或主动确认" tone="blue" />
        <PersonalMetric label="固定词" value={fixedCount} detail="始终保持优先" tone="emerald" />
        <PersonalMetric label="同步设备" value="3" detail={`最近 ${syncStatus.lastSyncTime}`} tone="zinc" />
      </div>

      <section className="bg-[#11131c] border border-[#222532] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#161824] border-b border-[#222532]">
          <h2 className="text-sm font-bold text-zinc-200">个人配置入口</h2>
          <p className="text-xs text-zinc-500 mt-1">配置是辅助层，词库和个人学习数据仍由本地优先策略保护。</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222532]">
          <PersonalAction icon={<BookOpen className="w-4 h-4" />} title="我的个人词库" description="查看、编辑和固定个人词条。" onClick={() => onNavigate('my-libraries')} />
          <PersonalAction icon={<Keyboard className="w-4 h-4" />} title="输入法设置" description="候选框、Shift、英文直通和 Tab 行为。" onClick={() => onNavigate('input-settings')} />
          <PersonalAction icon={<RefreshCw className="w-4 h-4" />} title="同步中心" description="检查 Revision、设备和离线同步状态。" onClick={() => onNavigate('sync')} />
          <PersonalAction icon={<ShieldCheck className="w-4 h-4" />} title="隐私设置" description="管理个人词频与公共词库的边界。" onClick={() => onNavigate('privacy')} />
        </div>
      </section>

      <div className="p-3 bg-[#0d0f15] border border-[#222532] border-l-2 border-l-blue-600 rounded-md text-xs text-zinc-500 leading-relaxed">
        个人输入数据默认只在本地学习；只有你确认同步的个人词条和词频才会进入 GyenBox 账号。一次输入不会自动进入公共词库。
      </div>
    </div>
  );
};

function PersonalMetric({ label, value, detail, tone }: { label: string; value: number | string; detail: string; tone: 'blue' | 'emerald' | 'zinc' }) {
  const valueClass = tone === 'emerald' ? 'text-emerald-400' : tone === 'blue' ? 'text-blue-400' : 'text-zinc-100';
  return (
    <div className="p-3 bg-[#11131c] border border-[#222532] rounded-md">
      <div className="text-xs text-zinc-500 font-mono">{label}</div>
      <div className={`mt-2 text-xl font-bold font-mono ${valueClass}`}>{value}</div>
      <div className="mt-1 text-[10px] text-zinc-500 truncate">{detail}</div>
    </div>
  );
}

function PersonalAction({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-4 bg-[#11131c] hover:bg-[#161824] text-left transition-colors flex items-start gap-3">
      <span className="w-8 h-8 shrink-0 rounded border border-[#272a38] bg-[#161824] text-blue-400 flex items-center justify-center">{icon}</span>
      <span>
        <strong className="block text-sm text-zinc-200">{title}</strong>
        <span className="block mt-1 text-xs text-zinc-500">{description}</span>
      </span>
    </button>
  );
}
