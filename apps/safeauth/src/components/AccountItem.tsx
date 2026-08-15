import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Star,
  Eye,
  EyeOff,
  MoreVertical,
  Lock,
  Clock,
  ShieldAlert,
  Info,
  Edit2,
  Trash2,
} from "lucide-react";
import { Account, ViewMode } from "../types";
import { BrandIcon } from "./BrandIcon";
import {
  generateTOTP,
  formatTotpCode,
  getTimeRemaining,
} from "../lib/totp";

interface AccountItemProps {
  account: Account;
  viewMode: ViewMode;
  onCopyCode: (code: string, accountName: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleHide: (id: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onRequirePinToUnlockHidden: (account: Account) => void;
  isUnlockedInSession?: boolean;
}

const getCategoryTheme = (categoryId: string) => {
  switch (categoryId) {
    case "favorites":
      return {
        categoryClass: "sa-account-card--favorite",
        label: "重点收藏",
        bgGradient: "bg-rose-50/80 dark:bg-rose-950/25 hover:bg-rose-100/70 dark:hover:bg-rose-950/40",
        bgGradientExpanded: "bg-rose-100/90 dark:bg-rose-950/50",
        cardBorder: "border-rose-200 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700/60",
        titleText: "text-rose-950 dark:text-rose-100",
        subText: "text-rose-700/80 dark:text-rose-300/80",
        badgeTag: "bg-rose-100/90 text-rose-800 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-800/60",
        codeBox: "bg-rose-100/80 dark:bg-rose-900/35 border-rose-200/90 dark:border-rose-800/50 text-rose-950 dark:text-rose-100",
        copyBtn: "bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500 dark:hover:bg-rose-600",
        progressColor: "bg-rose-500",
        dotColor: "bg-rose-500",
      };
    case "work":
      return {
        categoryClass: "sa-account-card--work",
        label: "工作办公",
        bgGradient: "bg-sky-50/80 dark:bg-sky-950/25 hover:bg-sky-100/70 dark:hover:bg-sky-950/40",
        bgGradientExpanded: "bg-sky-100/90 dark:bg-sky-950/50",
        cardBorder: "border-sky-200 dark:border-sky-900/50 hover:border-sky-300 dark:hover:border-sky-700/60",
        titleText: "text-sky-950 dark:text-sky-100",
        subText: "text-sky-700/80 dark:text-sky-300/80",
        badgeTag: "bg-sky-100/90 text-sky-800 border-sky-200 dark:bg-sky-900/60 dark:text-sky-200 dark:border-sky-800/60",
        codeBox: "bg-sky-100/80 dark:bg-sky-900/35 border-sky-200/90 dark:border-sky-800/50 text-sky-950 dark:text-sky-100",
        copyBtn: "bg-sky-600 hover:bg-sky-700 text-white dark:bg-sky-500 dark:hover:bg-sky-600",
        progressColor: "bg-sky-500",
        dotColor: "bg-sky-500",
      };
    case "cloud":
      return {
        categoryClass: "sa-account-card--cloud",
        label: "云服务",
        bgGradient: "bg-teal-50/80 dark:bg-teal-950/25 hover:bg-teal-100/70 dark:hover:bg-teal-950/40",
        bgGradientExpanded: "bg-teal-100/90 dark:bg-teal-950/50",
        cardBorder: "border-teal-200 dark:border-teal-900/50 hover:border-teal-300 dark:hover:border-teal-700/60",
        titleText: "text-teal-950 dark:text-teal-100",
        subText: "text-teal-700/80 dark:text-teal-300/80",
        badgeTag: "bg-teal-100/90 text-teal-800 border-teal-200 dark:bg-teal-900/60 dark:text-teal-200 dark:border-teal-800/60",
        codeBox: "bg-teal-100/80 dark:bg-teal-900/35 border-teal-200/90 dark:border-teal-800/50 text-teal-950 dark:text-teal-100",
        copyBtn: "bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600",
        progressColor: "bg-teal-500",
        dotColor: "bg-teal-500",
      };
    case "finance":
      return {
        categoryClass: "sa-account-card--finance",
        label: "金融理财",
        bgGradient: "bg-emerald-50/80 dark:bg-emerald-950/25 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40",
        bgGradientExpanded: "bg-emerald-100/90 dark:bg-emerald-950/50",
        cardBorder: "border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700/60",
        titleText: "text-emerald-950 dark:text-emerald-100",
        subText: "text-emerald-700/80 dark:text-emerald-300/80",
        badgeTag: "bg-emerald-100/90 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-800/60",
        codeBox: "bg-emerald-100/80 dark:bg-emerald-900/35 border-emerald-200/90 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-100",
        copyBtn: "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600",
        progressColor: "bg-emerald-500",
        dotColor: "bg-emerald-500",
      };
    case "dev":
      return {
        categoryClass: "sa-account-card--dev",
        label: "开发运维",
        bgGradient: "bg-purple-50/80 dark:bg-purple-950/25 hover:bg-purple-100/70 dark:hover:bg-purple-950/40",
        bgGradientExpanded: "bg-purple-100/90 dark:bg-purple-950/50",
        cardBorder: "border-purple-200 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-700/60",
        titleText: "text-purple-950 dark:text-purple-100",
        subText: "text-purple-700/80 dark:text-purple-300/80",
        badgeTag: "bg-purple-100/90 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-200 dark:border-purple-800/60",
        codeBox: "bg-purple-100/80 dark:bg-purple-900/35 border-purple-200/90 dark:border-purple-800/50 text-purple-950 dark:text-purple-100",
        copyBtn: "bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600",
        progressColor: "bg-purple-500",
        dotColor: "bg-purple-500",
      };
    case "personal":
      return {
        categoryClass: "sa-account-card--personal",
        label: "个人社交",
        bgGradient: "bg-amber-50/80 dark:bg-amber-950/25 hover:bg-amber-100/70 dark:hover:bg-amber-950/40",
        bgGradientExpanded: "bg-amber-100/90 dark:bg-amber-950/50",
        cardBorder: "border-amber-200 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700/60",
        titleText: "text-amber-950 dark:text-amber-100",
        subText: "text-amber-700/80 dark:text-amber-300/80",
        badgeTag: "bg-amber-100/90 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-800/60",
        codeBox: "bg-amber-100/80 dark:bg-amber-900/35 border-amber-200/90 dark:border-amber-800/50 text-amber-950 dark:text-amber-100",
        copyBtn: "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600",
        progressColor: "bg-amber-500",
        dotColor: "bg-amber-500",
      };
    default:
      return {
        categoryClass: "sa-account-card--default",
        label: "通用",
        bgGradient: "bg-slate-50/80 dark:bg-[#11121C] hover:bg-slate-100/70 dark:hover:bg-[#161724]",
        bgGradientExpanded: "bg-slate-100 dark:bg-[#161724]",
        cardBorder: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
        titleText: "text-slate-900 dark:text-slate-100",
        subText: "text-slate-600 dark:text-slate-400",
        badgeTag: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        codeBox: "bg-slate-200/80 dark:bg-[#07070A] border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white",
        copyBtn: "bg-[#6D5EF5] hover:bg-[#5b4ce6] text-white",
        progressColor: "bg-[#6D5EF5]",
        dotColor: "bg-[#6D5EF5]",
      };
  }
};

export const AccountItem: React.FC<AccountItemProps> = ({
  account,
  viewMode,
  onCopyCode,
  onToggleFavorite,
  onToggleHide,
  onEdit,
  onDelete,
  onRequirePinToUnlockHidden,
  isUnlockedInSession = false,
}) => {
  const [totpCode, setTotpCode] = useState<string>("******");
  const [remainingSec, setRemainingSec] = useState<number>(30);
  const [progressPct, setProgressPct] = useState<number>(100);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedRecently, setCopiedRecently] = useState<boolean>(false);

  const isHiddenLocked = account.isHidden && !isUnlockedInSession;

  // Calculate TOTP and countdown loop
  useEffect(() => {
    if (isHiddenLocked) return;

    let isMounted = true;

    const updateCode = async () => {
      const code = await generateTOTP(
        account.secret,
        account.period || 30,
        account.digits || 6,
        account.algorithm || "SHA-1"
      );
      const { remaining, percentage } = getTimeRemaining(account.period || 30);

      if (isMounted) {
        setTotpCode(code);
        setRemainingSec(remaining);
        setProgressPct(percentage);
      }
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [account.secret, account.period, account.digits, account.algorithm, isHiddenLocked]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHiddenLocked) {
      onRequirePinToUnlockHidden(account);
      return;
    }
    onCopyCode(totpCode, account.issuer);
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 2000);
  };

  const handleCardClick = () => {
    if (isHiddenLocked) {
      onRequirePinToUnlockHidden(account);
    } else {
      setIsExpanded((prev) => !prev);
    }
  };

  const formattedCode = formatTotpCode(totpCode);
  const isExpiringSoon = remainingSec <= 5; // Semantic warning when < 5s
  const theme = getCategoryTheme(account.categoryId);

  // Ring stroke calculation
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  // Render Compact List View (DEFAULT)
  if (viewMode === "compact_list") {
    return (
      <div
        onClick={handleCardClick}
        className={`sa-account-card ${theme.categoryClass} ${isExpanded ? "is-expanded" : ""} group relative rounded-sm transition-all duration-150 border cursor-pointer select-none ${theme.cardBorder} ${
          isExpanded
            ? `${theme.bgGradientExpanded} my-2 p-4 shadow-sm`
            : `${theme.bgGradient} my-1 p-3 shadow-xs`
        }`}
      >
        {/* Main Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand Icon & Titles */}
          <div className="flex items-center gap-3 min-w-0">
            <BrandIcon
              brand={account.iconBrand || account.issuer}
              categoryId={account.categoryId}
              size={18}
              className="sa-account-icon"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`sa-account-title text-xs sm:text-sm font-bold tracking-tight truncate font-mono uppercase ${theme.titleText}`}>
                  {account.issuer}
                </h3>
                <span className={`sa-account-badge px-1.5 py-0.2 text-[9px] font-mono rounded-xs border uppercase font-bold shrink-0 ${theme.badgeTag}`}>
                  {theme.label}
                </span>
                {account.isFavorite && (
                  <Star
                    size={12}
                    className="text-amber-400 fill-amber-400 shrink-0"
                  />
                )}
                {account.isHidden && (
                  <span className="px-1 py-0.2 text-[9px] font-mono rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                    LOCKED
                  </span>
                )}
              </div>
              <p className={`sa-account-subtitle text-xs truncate mt-0.5 font-mono ${theme.subText}`}>
                {account.accountName}
              </p>
            </div>
          </div>

          {/* Right: Code & Countdown / Action */}
          {isHiddenLocked ? (
            /* Hidden State Placeholder */
            <div className="sa-account-lock flex items-center gap-2 px-2.5 py-1 rounded-sm bg-amber-50 dark:bg-[#07070A] border border-amber-200 dark:border-slate-800 text-xs font-mono text-amber-700 dark:text-amber-400">
              <Lock size={12} className="text-amber-500" />
              <span>[ VAULT_LOCKED ]</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Unexpanded Compact Code View */}
              {!isExpanded && (
                <div className="flex items-center gap-3">
                  <span className={`sa-account-code text-sm sm:text-base font-mono font-bold tracking-widest ${theme.titleText}`}>
                    {formattedCode}
                  </span>

                  {/* Compact Expiration Status */}
                  <div
                    className={`sa-account-dot ${isExpiringSoon ? "is-expiring" : ""} w-2 h-2 rounded-sm transition-colors ${
                      isExpiringSoon ? "bg-rose-500 animate-pulse" : theme.dotColor
                    }`}
                    title={`剩余 ${remainingSec} 秒`}
                  />

                  {/* Copy Button */}
                  <button
                    onClick={handleCopy}
                    className={`sa-account-copy p-1.5 rounded-sm border transition-colors ${theme.codeBox} hover:opacity-90`}
                    title="复制验证码"
                  >
                    {copiedRecently ? (
                      <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expanded View (User Triggered) */}
        {isExpanded && !isHiddenLocked && (
          <div className="sa-account-expanded mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 space-y-3.5 animate-fade-in font-mono">
            {/* Focus Big TOTP Code Display */}
            <div className={`sa-account-code-box flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3.5 rounded-sm border ${theme.codeBox}`}>
              {/* Big OTP Code */}
              <div className="flex flex-col">
                <span className={`text-[10px] uppercase font-bold tracking-widest opacity-70 mb-1`}>
                  LIVE_TOTP_CODE [CYCLE: 30S]
                </span>
                <span className={`sa-account-code text-2xl sm:text-3xl font-mono font-bold tracking-widest select-all ${theme.titleText}`}>
                  {formattedCode}
                </span>
              </div>

              {/* Linear Tech Progress Meter + Copy Action */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Horizontal Segmented Progress Bar */}
                <div className="flex flex-col items-end gap-1">
                  <div className="w-28 sm:w-36 h-2 bg-black/10 dark:bg-black/30 border border-slate-300 dark:border-slate-800 rounded-none overflow-hidden p-0.5 flex">
                    <div
                    className={`sa-account-progress ${isExpiringSoon ? "is-expiring" : ""} h-full transition-all duration-1000 linear ${
                        isExpiringSoon ? "bg-rose-500" : theme.progressColor
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isExpiringSoon ? "text-rose-500 dark:text-rose-400" : theme.subText
                    }`}
                  >
                    EXPIRE IN {remainingSec}S
                  </span>
                </div>

                {/* Big Copy Button */}
                <button
                  onClick={handleCopy}
                  className={`sa-account-copy-primary flex items-center gap-1.5 px-3 py-2 rounded-sm ${theme.copyBtn} active:scale-95 transition-all text-xs font-mono font-bold shadow-xs`}
                >
                  {copiedRecently ? (
                    <>
                      <Check size={14} /> COPIED!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> COPY_CODE
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Metadata & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              {/* Technical Tags */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                <span className="px-1.5 py-0.5 rounded-sm bg-slate-200 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {account.algorithm}
                </span>
                <span className="px-1.5 py-0.5 rounded-sm bg-slate-200 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  DIGITS: {account.digits}
                </span>
                {account.notes && (
                  <span className="text-slate-500 truncate max-w-xs" title={account.notes}>
                    NOTE: {account.notes}
                  </span>
                )}
              </div>

              {/* Item Action Controls */}
              <div className="flex items-center gap-1 font-mono">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(account.id);
                  }}
                  className={`p-1.5 rounded-sm bg-slate-100 dark:bg-[#161622] border border-slate-300 dark:border-slate-800 transition-colors ${
                    account.isFavorite ? "text-amber-500 dark:text-amber-400 border-amber-300 dark:border-amber-500/40" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  title={account.isFavorite ? "取消收藏" : "设为收藏"}
                >
                  <Star size={13} fill={account.isFavorite ? "currentColor" : "none"} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHide(account.id);
                  }}
                  className="p-1.5 rounded-sm bg-slate-100 dark:bg-[#161622] border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  title={account.isHidden ? "取消隐藏" : "标记为隐藏"}
                >
                  {account.isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(account);
                  }}
                  className="p-1.5 rounded-sm bg-slate-100 dark:bg-[#161622] border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="编辑设置"
                >
                  <Edit2 size={13} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(account.id);
                  }}
                  className="p-1.5 rounded-sm bg-slate-100 dark:bg-[#161622] border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors"
                  title="删除账号"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Grid View
  return (
    <div
      onClick={handleCardClick}
        className={`sa-account-card ${theme.categoryClass} group relative flex flex-col justify-between p-4 rounded-sm ${theme.cardBorder} ${theme.bgGradient} transition-all cursor-pointer font-mono select-none shadow-xs hover:shadow-md`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandIcon
            brand={account.iconBrand || account.issuer}
            categoryId={account.categoryId}
            size={20}
            className="sa-account-icon"
          />

          <div className="min-w-0">
            <h3 className={`sa-account-title text-xs font-bold tracking-tight truncate uppercase ${theme.titleText}`}>
              {account.issuer}
            </h3>
            <p className={`sa-account-subtitle text-[11px] truncate mt-0.5 ${theme.subText}`}>
              {account.accountName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`sa-account-badge px-1.5 py-0.5 text-[9px] font-mono rounded-xs border uppercase font-bold ${theme.badgeTag}`}>
            {theme.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(account.id);
            }}
            className={`p-1 rounded-sm ${
              account.isFavorite ? "text-amber-500 dark:text-amber-400" : "text-slate-400 dark:text-slate-600"
            }`}
          >
            <Star size={14} fill={account.isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Code Section */}
      {isHiddenLocked ? (
        <div className="sa-account-lock my-3 py-3 px-2 rounded-sm bg-amber-50 dark:bg-[#07070A] border border-amber-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs font-mono text-amber-700 dark:text-amber-400">
          <Lock size={13} />
          <span>[ VAULT_LOCKED ]</span>
        </div>
      ) : (
        <div className={`sa-account-code-box my-2 p-3 rounded-sm border flex items-center justify-between ${theme.codeBox}`}>
          <span className={`sa-account-code text-lg font-mono font-bold tracking-widest ${theme.titleText}`}>
            {formattedCode}
          </span>

          <button
            onClick={handleCopy}
            className={`sa-account-copy-primary p-1.5 rounded-sm ${theme.copyBtn} transition-all shadow-xs`}
            title="复制验证码"
          >
            {copiedRecently ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className={`flex items-center justify-between pt-1 text-[10px] font-mono ${theme.subText}`}>
        <span>{account.algorithm}</span>
        {!isHiddenLocked && (
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-sm ${
                isExpiringSoon ? "bg-rose-500 animate-pulse" : theme.dotColor
              }`}
            />
            <span>{remainingSec}S</span>
          </div>
        )}
      </div>
    </div>
  );
};
