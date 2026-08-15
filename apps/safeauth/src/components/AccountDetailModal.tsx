import React, { useState } from "react";
import { X, Check, Save, Eye, EyeOff, Star, Lock } from "lucide-react";
import { Account, CategoryId, TotpAlgorithm } from "../types";
import { CATEGORIES } from "../data/initialData";

interface AccountDetailModalProps {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSaveAccount: (updated: Account) => void;
}

export const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  isOpen,
  account,
  onClose,
  onSaveAccount,
}) => {
  const [issuer, setIssuer] = useState(account?.issuer || "");
  const [accountName, setAccountName] = useState(account?.accountName || "");
  const [categoryId, setCategoryId] = useState<CategoryId>(account?.categoryId || "work");
  const [algorithm, setAlgorithm] = useState<TotpAlgorithm>(account?.algorithm || "SHA-1");
  const [digits, setDigits] = useState<6 | 8>(account?.digits || 6);
  const [notes, setNotes] = useState(account?.notes || "");
  const [isFavorite, setIsFavorite] = useState(account?.isFavorite || false);
  const [isHidden, setIsHidden] = useState(account?.isHidden || false);
  const [showSecret, setShowSecret] = useState(false);

  // Sync state when account prop changes
  React.useEffect(() => {
    if (account) {
      setIssuer(account.issuer);
      setAccountName(account.accountName);
      setCategoryId(account.categoryId);
      setAlgorithm(account.algorithm);
      setDigits(account.digits);
      setNotes(account.notes || "");
      setIsFavorite(account.isFavorite);
      setIsHidden(account.isHidden);
      setShowSecret(false);
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAccount({
      ...account,
      issuer,
      accountName,
      categoryId,
      algorithm,
      digits,
      notes,
      isFavorite,
      isHidden,
      iconBrand: issuer.toLowerCase(),
    });
    onClose();
  };

  return (
    <div className="sa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in font-mono">
      <div className="relative w-full max-w-md bg-[#121218] border border-slate-800 rounded-sm hud-box flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#07070A]">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider">
            [ EDIT_CREDENTIAL_PROPERTIES ]
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-slate-400 hover:text-white bg-[#161622] border border-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 text-xs text-slate-300">
          <div>
            <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">服务发行方 (ISSUER)</label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 focus:outline-none focus:border-[#6D5EF5]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">账号/用户名 (ACCOUNT)</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 focus:outline-none focus:border-[#6D5EF5]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px] flex items-center justify-between">
              <span>TOTP 密钥 (SECRET_KEY)</span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showSecret ? "HIDE" : "SHOW"}</span>
              </button>
            </label>
            <input
              type={showSecret ? "text" : "password"}
              readOnly
              value={account.secret}
              className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 font-mono text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">所属分类</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                className="w-full px-2.5 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 focus:outline-none focus:border-[#6D5EF5]"
              >
                {CATEGORIES.filter((c) => c.id !== "all" && c.id !== "favorites").map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">哈希算法</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as TotpAlgorithm)}
                className="w-full px-2.5 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 focus:outline-none focus:border-[#6D5EF5]"
              >
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-512">SHA-512</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">用途说明 (NOTES)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 focus:outline-none focus:border-[#6D5EF5]"
            />
          </div>

          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-slate-800 bg-[#07070A] flex-1">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded-sm border-slate-700 bg-[#161622] text-[#6D5EF5]"
              />
              <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                <Star size={13} className="text-amber-400" /> 设为常用收藏
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-slate-800 bg-[#07070A] flex-1">
              <input
                type="checkbox"
                checked={isHidden}
                onChange={(e) => setIsHidden(e.target.checked)}
                className="rounded-sm border-slate-700 bg-[#161622] text-[#6D5EF5]"
              />
              <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                <Lock size={13} className="text-amber-500" /> 隐藏账号
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Save size={16} /> SAVE_CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
