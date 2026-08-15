import React from "react";
import {
  X,
  ShieldCheck,
  Lock,
  Cpu,
  FileCode,
  Key,
  ServerOff,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface SecurityAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityAboutModal: React.FC<SecurityAboutModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="sa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in font-mono">
      <div className="sa-modal-panel relative w-full max-w-2xl bg-[#121218] border border-slate-800 rounded-sm hud-box flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sa-modal-header flex items-center justify-between p-4 border-b border-slate-800 bg-[#07070A]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-[#161622] text-[#6D5EF5] border border-[#6D5EF5]/40">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-sm font-bold uppercase text-white tracking-wider">
              [ SECURITY_ARCHITECTURE_SPECIFICATION ]
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-slate-400 hover:text-white bg-[#161622] border border-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="sa-modal-content p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Commitment Highlight */}
          <div className="p-3.5 rounded-sm bg-[#07070A] border border-[#6D5EF5]/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>[ STRICT_ZERO_KNOWLEDGE_COMMITMENT ]</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 font-sans">
              TOTP 密钥（Secret Key）和生成的 6/8 位动态验证码，<strong className="text-white font-bold">绝不发送给任何服务端或外部云服务</strong>。密钥加解密与验证码计算均只在您的浏览器本地执行。
            </p>
          </div>

          {/* Diagram of Architecture */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              [ ENCRYPTION_PIPELINE & ARCHITECTURE ]
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              {/* Box 1: Local Storage */}
              <div className="p-3 rounded-sm bg-[#07070A] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                  <Key size={15} className="text-[#6D5EF5]" />
                  <span>1. CREDENTIAL_ISOLATION</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Base32 密钥仅以 AES‑256‑GCM 密文保存在本设备的浏览器存储中；主密码不会被保存或上传。
                </p>
              </div>

              {/* Box 2: Local TOTP Calc */}
              <div className="p-3 rounded-sm bg-[#07070A] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                  <Cpu size={15} className="text-emerald-400" />
                  <span>2. RFC_6238_ENGINE</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  纯 JS Web Crypto API 计算 HMAC-SHA1/256 动态验证码，无网络 API 依赖。
                </p>
              </div>

              {/* Box 3: PBKDF2 + AES-256 */}
              <div className="p-3 rounded-sm bg-[#07070A] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                  <Lock size={15} className="text-cyan-400" />
                  <span>3. AES-256-GCM</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  主保险箱与导出备份均使用 PBKDF2‑HMAC‑SHA‑256（600,000 次迭代）派生 AES‑256‑GCM 密钥。
                </p>
              </div>
            </div>
          </div>

          {/* AI Metadata Scope */}
          <div className="p-3.5 rounded-sm bg-[#07070A] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-white uppercase text-xs">
              <Sparkles size={15} className="text-[#6D5EF5]" />
              <span>[ SECURITY_AUDIT_METADATA_BOUNDARY ]</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              常驻侧边栏的“安全体检摘要”仅处理最小化的计数型元数据（如：账号总数、分类数量、长期未使用数量、离上次备份的天数）；不包含服务名称、账号名、密钥或动态验证码。
            </p>
            <div className="mt-2 p-2.5 rounded-sm bg-[#161622] border border-slate-800 font-mono text-[10px] text-slate-400">
              {`// SECURITY_AUDIT_METADATA_PAYLOAD:
{
  "totalAccounts": 9,
  "unusedAccountsCount90Days": 3,
  "daysSinceLastBackup": 5,
  "hasMasterPassword": true
}`}
            </div>
          </div>

          {/* Tech Spec List */}
          <div className="space-y-1.5 pt-1">
            <h4 className="font-bold text-white uppercase text-xs">[ COMPLIANT_STANDARDS_&_SPECIFICATIONS ]</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>RFC 6238 (TOTP: Time-Based One-Time Password Algorithm)</li>
              <li>RFC 4226 (HOTP: An HMAC-Based One-Time Password Algorithm)</li>
              <li>NIST SP 800-132 (PBKDF2 Password-Based Key Derivation)</li>
              <li>FIPS PUB 197 (Advanced Encryption Standard AES-GCM)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
