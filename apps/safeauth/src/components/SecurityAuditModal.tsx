import React from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Clock,
  EyeOff,
} from "lucide-react";
import { SecurityAuditResult, SecurityRecommendation } from "../types";

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditResult: SecurityAuditResult | null;
  isLoading: boolean;
  onTriggerAction: (actionType: string) => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  auditResult,
  isLoading,
  onTriggerAction,
}) => {
  if (!isOpen) return null;

  const score = auditResult?.healthScore || 90;

  const getSeverityBadge = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
            <AlertTriangle size={11} /> 高风险
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
            <Info size={11} /> 中度建议
          </span>
        );
      case "low":
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 size={11} /> 最佳实践
          </span>
        );
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case "backup":
        return "立即导出加密备份";
      case "review_unused":
        return "查看长期未使用账号";
      case "check_hidden":
        return "去管理隐藏账号";
      default:
        return "查看安全机制说明";
    }
  };

  return (
    <div className="sa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 animate-fade-in font-mono transition-colors">
      <div className="sa-modal-panel relative w-full max-w-xl bg-white dark:bg-[#121218] border border-slate-300 dark:border-slate-800 rounded-sm hud-box shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sa-modal-header flex items-center justify-between p-4 border-b border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-[#07070A]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-slate-200 dark:bg-[#161622] text-[#6D5EF5] border border-slate-300 dark:border-[#6D5EF5]/40">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                [ SECURITY_AUDIT_REPORT ]
              </h2>
              <p className="text-[10px] text-slate-500 font-sans">
                AI 仅分析活动时间戳与结构元数据，零接触凭据明文
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-[#161622] border border-slate-300 dark:border-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="sa-modal-content p-5 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200">
          {/* Health Score Overview */}
          <div className="flex items-center gap-4 p-4 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800">
            {/* Score HUD Badge */}
            <div className="relative w-16 h-16 rounded-sm bg-slate-100 dark:bg-[#161622] border border-[#6D5EF5] flex flex-col items-center justify-center text-slate-900 dark:text-white shrink-0">
              <span className="text-xl font-mono font-bold text-[#6D5EF5]">
                {score}
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">SCORE</span>
            </div>

            <div className="flex-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                {score >= 90
                  ? "SYSTEM_HEALTH: EXCELLENT"
                  : score >= 75
                  ? "SYSTEM_HEALTH: GOOD"
                  : "SYSTEM_HEALTH: ATTENTION_REQUIRED"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {auditResult?.summary || "安全体检已根据您当前的备份频率与账号活跃度完成评估。"}
              </p>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-3 font-mono">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              [ AI_DIAGNOSTICS & RECOMMENDATIONS ({auditResult?.recommendations.length || 0}) ]
            </h4>

            <div className="space-y-2.5">
              {auditResult?.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                      {rec.title}
                    </h5>
                    {getSeverityBadge(rec.severity)}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                    {rec.description}
                  </p>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        onTriggerAction(rec.actionType);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                    >
                      <span>{getActionLabel(rec.actionType)}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Guarantee Banner */}
          <div className="p-3 rounded-sm bg-[#07070A] border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <Lock size={15} className="text-[#6D5EF5] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-sans">
              <strong className="text-slate-200 font-bold">
                绝对零知识承诺：
              </strong>
              本保险箱生成的验证码及 TOTP 密钥纯本地存储，绝不发送给 Gemini API
              或任何第三方服务器。AI 功能仅接收不含敏感信息的结构元数据。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
