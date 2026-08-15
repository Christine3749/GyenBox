import React, { useState } from "react";
import {
  X,
  Database,
  Download,
  Upload,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { Account, BackupRecord, EncryptedBackupPayload } from "../types";
import { encryptAccountsBackup, decryptAccountsBackup } from "../lib/crypto";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  backups: BackupRecord[];
  onRestoreAccounts: (restored: Account[]) => void;
  onAddBackupRecord: (rec: BackupRecord) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  accounts,
  backups,
  onRestoreAccounts,
  onAddBackupRecord,
}) => {
  const [tab, setTab] = useState<"export" | "import" | "history">("export");
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [importFilePayload, setImportFilePayload] = useState<EncryptedBackupPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!exportPassphrase || exportPassphrase.length < 6) {
      setErrorMsg("请输入至少 6 位的密码对备份文件进行 AES-256-GCM 加密");
      return;
    }

    try {
      setIsProcessing(true);
      const payload = await encryptAccountsBackup(accounts, exportPassphrase);

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `safeauth_vault_backup_${dateStr}.safeauth`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      onAddBackupRecord({
        id: `bak_${Date.now()}`,
        timestamp: Date.now(),
        accountCount: accounts.length,
        fileName: filename,
        checksum: payload.ciphertext.slice(0, 16),
      });

      setSuccessMsg(`备份导出成功！已加密导出 ${accounts.length} 个账号凭据`);
      setExportPassphrase("");
    } catch (err: any) {
      setErrorMsg("导出加密失败：" + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as EncryptedBackupPayload;
        if (parsed.algorithm !== "AES-256-GCM" || !parsed.ciphertext) {
          throw new Error("不是有效的 SafeAuth 加密备份文件");
        }
        setImportFilePayload(parsed);
        setErrorMsg("");
      } catch (err: any) {
        setErrorMsg("解析文件失败：" + err.message);
        setImportFilePayload(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFilePayload) {
      setErrorMsg("请先选择备份文件");
      return;
    }
    if (!importPassphrase) {
      setErrorMsg("请输入解密密码");
      return;
    }

    try {
      setIsProcessing(true);
      const restored = await decryptAccountsBackup(importFilePayload, importPassphrase);
      onRestoreAccounts(restored);
      setSuccessMsg(`解密成功！已恢复 ${restored.length} 个账号凭据`);
      setImportPassphrase("");
      setImportFilePayload(null);
    } catch (err: any) {
      setErrorMsg(err.message || "解密失败，请检查密码");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="sa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 animate-fade-in font-mono transition-colors">
      <div className="sa-modal-panel relative w-full max-w-lg bg-white dark:bg-[#121218] border border-slate-300 dark:border-slate-800 rounded-sm hud-box shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sa-modal-header flex items-center justify-between p-4 border-b border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-[#07070A]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-slate-200 dark:bg-[#161622] text-[#6D5EF5] border border-slate-300 dark:border-[#6D5EF5]/40">
              <Database size={18} />
            </div>
            <h2 className="text-sm font-bold uppercase text-slate-900 dark:text-white tracking-wider">
              [ ENCRYPTED_BACKUP_CENTER ]
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-[#161622] border border-slate-300 dark:border-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-[#07070A] text-xs font-bold uppercase">
          <button
            onClick={() => {
              setTab("export");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
              tab === "export"
                ? "border-[#6D5EF5] text-[#6D5EF5] bg-white dark:bg-[#121218]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Download size={14} /> EXPORT_BACKUP
          </button>
          <button
            onClick={() => {
              setTab("import");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
              tab === "import"
                ? "border-[#6D5EF5] text-[#6D5EF5] bg-white dark:bg-[#121218]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Upload size={14} /> RESTORE_BACKUP
          </button>
          <button
            onClick={() => {
              setTab("history");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
              tab === "history"
                ? "border-[#6D5EF5] text-[#6D5EF5] bg-white dark:bg-[#121218]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <FileCheck size={14} /> AUDIT_LOGS
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {errorMsg && (
            <div className="p-2.5 rounded-sm bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 font-bold flex items-center gap-2 font-mono">
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2 font-mono">
              <CheckCircle2 size={14} /> {successMsg}
            </div>
          )}

          {tab === "export" && (
            <form onSubmit={handleExport} className="space-y-3.5">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-sans text-xs">
                导出当前所有 ({accounts.length} 个) TOTP 账号及其元数据。导出前将使用您设置的独立密码及 PBKDF2‑SHA‑256（600,000 次迭代）派生 AES‑256‑GCM 密钥全盘加密。手机丢失或更换时，只有此恢复包和它的独立密码才能恢复数据；请保存到另一台设备、加密 U 盘或你信任的存储位置。
              </p>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase text-[11px]">设置加密导出密码 (PASSPHRASE)</label>
                <input
                  type="password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="至少 6 位密码 (请务必牢记)"
                  className="w-full px-3 py-2 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-xs"
              >
                <Download size={15} />
                <span>{isProcessing ? "加密打包中..." : "[ DOWNLOAD_ENCRYPTED_FILE ]"}</span>
              </button>
            </form>
          )}

          {tab === "import" && (
            <form onSubmit={handleImport} className="space-y-3.5">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-sans text-xs">
                导入包含加密凭据的 `.safeauth` 文件。请输入正确的解密密码以解密恢复账号。
              </p>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase text-[11px]">选择备份文件 (.safeauth / .json)</label>
                <input
                  type="file"
                  accept=".safeauth,.json"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-1.5 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs"
                />
              </div>

              {importFilePayload && (
                <div className="p-2.5 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-[11px] font-mono space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    CHECKSUM_OK: {importFilePayload.algorithm} ({importFilePayload.kdf})
                  </div>
                  <div className="text-slate-500">
                    CONTAINED_TOKENS: {importFilePayload.metadata?.accountCount || "未知"} UNITS
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase text-[11px]">输入解密密码 (DECRYPT_KEY)</label>
                <input
                  type="password"
                  value={importPassphrase}
                  onChange={(e) => setImportPassphrase(e.target.value)}
                  placeholder="请输入生成该备份时设定的加密密码"
                  className="w-full px-3 py-2 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing || !importFilePayload}
                className="w-full py-2.5 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50 shadow-xs"
              >
                <Upload size={15} />
                <span>{isProcessing ? "解密恢复中..." : "[ DECRYPT_AND_IMPORT ]"}</span>
              </button>
            </form>
          )}

          {tab === "history" && (
            <div className="space-y-3 font-mono">
              <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase">[ LOCAL_AUDIT_LOGS ]</h4>
              <div className="space-y-2">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-sm bg-slate-50 dark:bg-[#07070A] border border-slate-300 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-200">
                        {b.fileName}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(b.timestamp).toLocaleString("zh-CN")} · {b.accountCount} TOKENS
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-sm font-mono text-[10px] bg-slate-200 dark:bg-[#161622] border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400">
                      SHA: {b.checksum}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
