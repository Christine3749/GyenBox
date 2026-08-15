import React from "react";
import {
  ShieldCheck,
  Star,
  Briefcase,
  Server,
  Landmark,
  Code2,
  User,
  EyeOff,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
  RefreshCw,
  HardDriveDownload,
} from "lucide-react";
import { CategoryId, SecurityAuditResult } from "../types";
import { CATEGORIES } from "../data/initialData";

interface SidebarProps {
  selectedCategory: CategoryId;
  onSelectCategory: (catId: CategoryId) => void;
  categoryCounts: Record<CategoryId, number>;
  auditResult: SecurityAuditResult | null;
  isAuditLoading: boolean;
  onRefreshAudit: () => void;
  onOpenAuditModal: () => void;
  onOpenBackupModal: () => void;
  onOpenSecurityAbout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  auditResult,
  isAuditLoading,
  onRefreshAudit,
  onOpenAuditModal,
  onOpenBackupModal,
  onOpenSecurityAbout,
}) => {
  const getCategoryIcon = (id: CategoryId) => {
    switch (id) {
      case "all":
        return <ShieldCheck size={17} />;
      case "favorites":
        return <Star size={17} />;
      case "work":
        return <Briefcase size={17} />;
      case "cloud":
        return <Server size={17} />;
      case "finance":
        return <Landmark size={17} />;
      case "dev":
        return <Code2 size={17} />;
      case "personal":
        return <User size={17} />;
      case "hidden":
        return <EyeOff size={17} />;
      default:
        return <ShieldCheck size={17} />;
    }
  };

  return (
    <aside className="sa-sidebar w-full md:w-64 shrink-0 flex flex-col gap-5 p-4 border-r border-slate-300 dark:border-slate-800 bg-[#F1F5F9] dark:bg-[#0A0B10] select-none font-mono transition-colors">
      {/* Category Navigation */}
      <div className="space-y-1">
        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>CATEGORIES_INDEX</span>
          <span className="text-[9px] text-[#6D5EF5] font-bold">SYS_FILTER</span>
        </div>
        <nav className="space-y-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            // Get icon color per category
            const getIconColor = () => {
              if (isSelected) return "text-[#6D5EF5]";
              switch (cat.id) {
                case "favorites":
                  return "text-rose-500 dark:text-rose-400";
                case "work":
                  return "text-sky-500 dark:text-sky-400";
                case "cloud":
                  return "text-teal-500 dark:text-teal-400";
                case "finance":
                  return "text-emerald-500 dark:text-emerald-400";
                case "dev":
                  return "text-purple-500 dark:text-purple-400";
                case "personal":
                  return "text-amber-500 dark:text-amber-400";
                default:
                  return "text-slate-500 dark:text-slate-400";
              }
            };

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`sa-nav-item ${isSelected ? "sa-nav-item--selected" : ""} w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-all ${
                  isSelected
                    ? "bg-white dark:bg-[#161724] text-slate-900 dark:text-white border-l-2 border-l-[#6D5EF5] border-y border-r border-slate-300 dark:border-slate-800 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#12131D] hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={getIconColor()}>
                    {getCategoryIcon(cat.id)}
                  </span>
                  <span>{cat.label}</span>
                </div>
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-mono rounded-sm ${
                    isSelected
                      ? "bg-[#6D5EF5] text-white"
                      : "bg-slate-200 dark:bg-[#12131D] border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Hidden Accounts Folder */}
          <button
            onClick={() => onSelectCategory("hidden")}
            className={`sa-nav-item sa-nav-item--hidden ${selectedCategory === "hidden" ? "sa-nav-item--selected" : ""} w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-all ${
              selectedCategory === "hidden"
                ? "bg-white dark:bg-[#161724] text-slate-900 dark:text-white border-l-2 border-l-amber-500 border-y border-r border-slate-300 dark:border-slate-800 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#12131D] hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <EyeOff size={16} className="text-amber-500" />
              <span>隐藏账号模式</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
              {categoryCounts["hidden"] || 0}
            </span>
          </button>
        </nav>
      </div>

      {/* Backup Quick Entry */}
      <div className="sa-backup-card p-3 rounded-sm bg-white dark:bg-[#12131D] border border-slate-300 dark:border-slate-800 space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
          <span className="flex items-center gap-1.5">
            <Database size={14} className="text-[#6D5EF5]" /> 加密数据备份
          </span>
          <span className="text-[10px] text-slate-500 font-mono">AES-256</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
          导出本地 PBKDF2 加密文件，绝不下发未加密原文。
        </p>
        <button
          onClick={onOpenBackupModal}
          className="sa-secondary-button w-full flex items-center justify-center gap-1.5 py-1.5 rounded-sm bg-slate-100 hover:bg-slate-200 dark:bg-[#161724] dark:hover:bg-[#1C1C28] border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono transition-all"
        >
          <HardDriveDownload size={13} /> [ BACKUP_ARCHIVE ]
        </button>
      </div>

      {/* AI Security Audit Summary Card (HUD Border Box) */}
      <div className="sa-audit-card mt-auto p-3.5 rounded-sm bg-white dark:bg-[#12131D] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-3 relative hud-box shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D5EF5] uppercase">
            <Sparkles size={14} />
            <span>AI_SECURITY_AUDIT</span>
          </div>
          <button
            onClick={onRefreshAudit}
            disabled={isAuditLoading}
            title="刷新体检结果"
            className="p-1 rounded-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#161724] border border-slate-300 dark:border-slate-800 transition-colors"
          >
            <RefreshCw
              size={12}
              className={isAuditLoading ? "animate-spin text-[#6D5EF5]" : ""}
            />
          </button>
        </div>

        {/* Health Score & Brief Summary */}
        <div className="flex items-center gap-3">
          <div className="sa-score-chip relative flex flex-col items-center justify-center w-11 h-11 rounded-sm bg-slate-100 dark:bg-[#161724] border border-[#6D5EF5]/50 shrink-0">
            <span className="text-sm font-bold text-[#6D5EF5] font-mono leading-none">
              {auditResult ? auditResult.healthScore : 90}
            </span>
            <span className="text-[8px] font-mono text-slate-500 uppercase mt-0.5">
              SCORE
            </span>
          </div>
          <div className="flex-1 min-w-0 font-sans">
            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {isAuditLoading
                ? "正在对非敏感元数据进行AI分析..."
                : auditResult?.summary ||
                  "3 个账号超过 90 天未使用，距离上次备份已 5 天，建议体检。"}
            </p>
          </div>
        </div>

        {/* View Details Action */}
        <button
          onClick={onOpenAuditModal}
          className="sa-audit-action w-full flex items-center justify-between px-3 py-1.5 rounded-sm bg-slate-100 dark:bg-[#161724] border border-[#6D5EF5]/40 hover:bg-slate-200 dark:hover:bg-[#1C1C28] text-xs font-mono text-[#5b4ce6] dark:text-[#887cf8] font-bold transition-all group"
        >
          <span>[ AUDIT_REPORT ]</span>
          <ArrowRight
            size={13}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>

        {/* Zero Knowledge Trust Commitment */}
        <div className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
          <Lock size={10} className="text-slate-400" />
          <span className="truncate">ZERO_KNOWLEDGE · LOCAL_ONLY</span>
        </div>
      </div>
    </aside>
  );
};
