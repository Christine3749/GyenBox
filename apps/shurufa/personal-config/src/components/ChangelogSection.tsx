import React from 'react';
import { changelogItems } from '../data/initialData';
import { History, CheckCircle2, Tag, ShieldCheck, Info } from 'lucide-react';

export const ChangelogSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-2">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#3b82f6]" />
          <h2 className="text-base font-bold text-[#fafafa]">
            GY 输入法个人配置中心 - 更新日志
          </h2>
        </div>
        <p className="text-xs text-[#71717a]">
          此日志仅涵盖个人配置同步、个人词频算法、快捷短语及设备中心的功能迭代。软件安装包及客户端发布更新请访问官网 <span className="font-mono text-slate-300">shurufa.wang</span>。
        </p>
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 sm:before:left-5 before:w-0.5 before:bg-[#27272a]">
        {changelogItems.map((item) => (
          <div key={item.version} className="relative pl-8 sm:pl-12 space-y-3">
            {/* Timeline Dot */}
            <div className="absolute left-1.5 sm:left-3 top-1 w-4 h-4 rounded-full bg-[#3b82f6] border-2 border-[#09090b] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>

            {/* Version Card */}
            <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-[#3b82f6] font-mono bg-[#3b82f6]/10 px-2.5 py-0.5 rounded border border-[#3b82f6]/20">
                    {item.version}
                  </span>
                  <h3 className="text-sm font-bold text-[#fafafa]">{item.title}</h3>
                </div>
                <span className="text-xs text-[#71717a] font-mono">{item.date}</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-300">
                {item.changes.map((change, cIdx) => (
                  <li key={cIdx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3b82f6] shrink-0 mt-0.5" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
