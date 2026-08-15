import React, { useState } from "react";
import { X, QrCode, Key, Shield, AlertCircle, Upload, Check } from "lucide-react";
import jsQR from "jsqr";
import { Account, CategoryId, TotpAlgorithm } from "../types";
import { isValidBase32 } from "../lib/totp";
import { CATEGORIES } from "../data/initialData";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (newAcc: Omit<Account, "id" | "createdAt">) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAddAccount,
}) => {
  const [tab, setTab] = useState<"manual" | "qrcode">("manual");
  const [issuer, setIssuer] = useState("");
  const [accountName, setAccountName] = useState("");
  const [secret, setSecret] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("work");
  const [algorithm, setAlgorithm] = useState<TotpAlgorithm>("SHA-1");
  const [digits, setDigits] = useState<6 | 8>(6);
  const [notes, setNotes] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const [error, setError] = useState("");
  const [qrStatus, setQrStatus] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!issuer.trim()) {
      setError("请输入服务发行方名称 (例如: Google, GitHub)");
      return;
    }
    if (!accountName.trim()) {
      setError("请输入账号邮箱或用户名");
      return;
    }
    if (!secret.trim() || !isValidBase32(secret)) {
      setError("请输入有效的 Base32 TOTP 密钥 (如: JBSWY3DPEHPK3PXP)");
      return;
    }

    onAddAccount({
      issuer: issuer.trim(),
      accountName: accountName.trim(),
      secret: secret.trim().toUpperCase(),
      categoryId,
      algorithm,
      digits,
      period: 30,
      isFavorite: false,
      isHidden,
      notes: notes.trim(),
      iconBrand: issuer.toLowerCase(),
      lastUsedTimestamp: Date.now(),
    });

    // Reset & Close
    setIssuer("");
    setAccountName("");
    setSecret("");
    setNotes("");
    setError("");
    onClose();
  };

  const handleQrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("二维码图片不能超过 10 MB");
      return;
    }

    try {
      setError("");
      setQrStatus("正在本地解析…");
      const image = await createImageBitmap(file);
      const maxSize = 2048;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("浏览器无法读取该图片");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
      if (!decoded) throw new Error("未识别到有效的 OTPAuth 二维码");

      const otpUrl = new URL(decoded.data);
      if (otpUrl.protocol !== "otpauth:" || otpUrl.hostname.toLowerCase() !== "totp") {
        throw new Error("该二维码不是 TOTP OTPAuth 格式");
      }

      const parsedSecret = (otpUrl.searchParams.get("secret") || "").replace(/\s/g, "").toUpperCase();
      if (!isValidBase32(parsedSecret)) throw new Error("二维码中缺少有效的 Base32 密钥");

      const label = decodeURIComponent(otpUrl.pathname.replace(/^\//, ""));
      const separator = label.indexOf(":");
      const parsedIssuer = otpUrl.searchParams.get("issuer") || (separator >= 0 ? label.slice(0, separator) : label) || "TOTP";
      const parsedAccount = separator >= 0 ? label.slice(separator + 1) : label;
      const algorithmMap: Record<string, TotpAlgorithm> = {
        SHA1: "SHA-1",
        "SHA-1": "SHA-1",
        SHA256: "SHA-256",
        "SHA-256": "SHA-256",
        SHA512: "SHA-512",
        "SHA-512": "SHA-512",
      };
      const parsedDigits = Number(otpUrl.searchParams.get("digits"));

      setIssuer(parsedIssuer);
      setAccountName(parsedAccount || parsedIssuer);
      setSecret(parsedSecret);
      setAlgorithm(algorithmMap[(otpUrl.searchParams.get("algorithm") || "SHA1").toUpperCase()] || "SHA-1");
      setDigits(parsedDigits === 8 ? 8 : 6);
      setTab("manual");
      setQrStatus("已在本地解析");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "二维码解析失败");
      setQrStatus("");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="sa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 animate-fade-in font-mono transition-colors">
      <div className="sa-modal-panel relative w-full max-w-lg bg-white dark:bg-[#121218] border border-slate-300 dark:border-slate-800 rounded-sm hud-box shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sa-modal-header flex items-center justify-between p-4 border-b border-slate-300 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-slate-100 dark:bg-[#161622] text-[#6D5EF5] border border-slate-300 dark:border-[#6D5EF5]/40">
              <Key size={16} />
            </div>
            <h2 className="text-sm font-bold uppercase text-slate-900 dark:text-white tracking-wider">
              [ ADD_TOTP_ACCOUNT ]
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#161622] border border-slate-300 dark:border-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-[#07070A]">
          <button
            onClick={() => setTab("manual")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-2 border-b-2 transition-all ${
              tab === "manual"
                ? "border-[#6D5EF5] text-[#6D5EF5] bg-white dark:bg-[#121218]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Key size={14} /> MANUAL_INPUT
          </button>
          <button
            onClick={() => setTab("qrcode")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-2 border-b-2 transition-all ${
              tab === "qrcode"
                ? "border-[#6D5EF5] text-[#6D5EF5] bg-white dark:bg-[#121218]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <QrCode size={14} /> IMPORT_QRCODE
          </button>
        </div>

        {/* Body Form */}
        <div className="sa-modal-content p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {error && (
            <div className="p-2.5 rounded-sm bg-rose-950/80 border border-rose-500/40 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {tab === "qrcode" ? (
            <div className="py-8 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-sm bg-[#07070A] text-center p-4">
              <Upload className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-xs font-bold text-slate-200 mb-1">
                拖拽二维码图片到此处，或点击上传
              </p>
              <p className="text-slate-500 text-[10px] mb-4">
                支持标准 OTPAuth QR Code 图像解析 (全过程离线处理)
              </p>
              <label className="cursor-pointer px-3.5 py-1.5 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] font-bold transition-all">
                <span>{qrStatus || "选择图片解析"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrScan}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Issuer */}
              <div>
                <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">发行方 (ISSUER)</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="如: Google, GitHub, AWS, Stripe"
                  className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
                />
              </div>

              {/* Account / Username */}
              <div>
                <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">账号/用户名 (ACCOUNT)</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="如: user@gmail.com 或 alex_dev"
                  className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
                />
              </div>

              {/* Secret Key */}
              <div>
                <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">密钥 (BASE32_SECRET)</label>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="如: JBSWY3DPEHPK3PXP"
                  className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
                />
              </div>

              {/* Category & Algorithm */}
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
                  <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">HMAC 哈希算法</label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as TotpAlgorithm)}
                    className="w-full px-2.5 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 focus:outline-none focus:border-[#6D5EF5]"
                  >
                    <option value="SHA-1">SHA-1 (标准)</option>
                    <option value="SHA-256">SHA-256</option>
                    <option value="SHA-512">SHA-512</option>
                  </select>
                </div>
              </div>

              {/* Digits & Hidden */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">验证码位数</label>
                  <div className="flex gap-2">
                    {[6, 8].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setDigits(d as 6 | 8)}
                        className={`flex-1 py-1.5 rounded-sm font-mono text-xs border transition-all ${
                          digits === d
                            ? "border-[#6D5EF5] bg-[#6D5EF5] text-white font-bold"
                            : "border-slate-800 bg-[#07070A] text-slate-400"
                        }`}
                      >
                        {d} 位
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 rounded-sm border border-slate-800 bg-[#07070A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHidden}
                      onChange={(e) => setIsHidden(e.target.checked)}
                      className="rounded-sm border-slate-700 bg-[#161622] text-[#6D5EF5] focus:ring-[#6D5EF5]"
                    />
                    <span className="font-bold text-slate-300">标记为隐藏账号</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-400 mb-1 uppercase text-[11px]">用途说明 (NOTES)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="如: 生产环境主服务器认证"
                  className="w-full px-3 py-2 rounded-sm bg-[#07070A] border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#6D5EF5]"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-sm bg-[#6D5EF5] text-white hover:bg-[#5b4ce6] font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Check size={16} /> SAVE_TO_VAULT
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
