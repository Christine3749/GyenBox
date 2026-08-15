import React, { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, LockKeyhole, Shield } from "lucide-react";

interface LockScreenProps {
  hasVault: boolean;
  onCreateVault: (passphrase: string) => Promise<void>;
  onUnlock: (passphrase: string) => Promise<void>;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  hasVault,
  onCreateVault,
  onUnlock,
}) => {
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");

    if (!hasVault) {
      if (passphrase.length < 12) {
        setErrorMsg("请设置至少 12 位的主密码。建议使用长句式密码。");
        return;
      }
      if (passphrase !== confirmation) {
        setErrorMsg("两次输入的主密码不一致。");
        return;
      }
    }

    try {
      setIsWorking(true);
      if (hasVault) {
        await onUnlock(passphrase);
      } else {
        await onCreateVault(passphrase);
      }
      setPassphrase("");
      setConfirmation("");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "无法解锁本地保险箱。");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="sa-lock-screen fixed inset-0 z-50 flex items-center justify-center bg-[#EAEFF5] dark:bg-[#060609] text-slate-900 dark:text-slate-100 select-none overflow-y-auto font-mono transition-colors p-4">
      <div className="sa-lock-panel relative w-full max-w-md p-8 bg-white dark:bg-[#11121C] border border-slate-300 dark:border-slate-800 rounded-sm hud-box shadow-2xl flex flex-col items-center">
        <div className="w-full flex items-center justify-between pb-4 mb-6 border-b border-slate-300 dark:border-slate-800 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
          <span>SYS.LOCAL_VAULT v3.0</span>
          <span className="text-[#6D5EF5] font-bold">[ {hasVault ? "LOCKED" : "INITIALIZE"} ]</span>
        </div>

        <div className="mb-4 p-3.5 rounded-sm bg-[#6D5EF5]/10 border border-[#6D5EF5]/40 text-[#6D5EF5]">
          {hasVault ? <LockKeyhole className="w-8 h-8 stroke-[2]" /> : <Shield className="w-8 h-8 stroke-[2]" />}
        </div>

        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-1 uppercase">
          SafeAuth Terminal Vault
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 text-center leading-relaxed font-sans">
          {hasVault
            ? "输入主密码以在本设备上解密保险箱。密码和 TOTP 密钥不会离开浏览器。"
            : "创建主密码以加密本设备上的保险箱。密码无法找回，请妥善保管。"}
        </p>

        <form className="w-full space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">MASTER_PASSPHRASE</span>
            <input
              autoComplete={hasVault ? "current-password" : "new-password"}
              autoFocus
              className="w-full px-3 py-2.5 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder={hasVault ? "输入主密码" : "至少 12 位，建议使用长句"}
              type="password"
              value={passphrase}
            />
          </label>

          {!hasVault && (
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">CONFIRM_PASSPHRASE</span>
              <input
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="再次输入主密码"
                type="password"
                value={confirmation}
              />
            </label>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5 font-bold pt-1">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {errorMsg}
            </p>
          )}

          <button
            className="sa-pin-key w-full min-h-11 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] disabled:opacity-60 font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider mt-2"
            disabled={isWorking || !passphrase}
            type="submit"
          >
            <KeyRound size={16} />
            {isWorking ? "正在处理…" : hasVault ? "[ UNLOCK_LOCAL_VAULT ]" : "[ CREATE_ENCRYPTED_VAULT ]"}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 w-full flex gap-2 text-[10px] text-slate-500 leading-relaxed">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          AES‑256‑GCM · PBKDF2‑SHA‑256 · 600,000 ITERATIONS · DEVICE_LOCAL_ONLY
        </div>
      </div>
    </div>
  );
};
