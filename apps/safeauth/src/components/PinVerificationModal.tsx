import React, { useState } from "react";
import { Lock, X, AlertCircle } from "lucide-react";

interface PinVerificationModalProps {
  isOpen: boolean;
  storedPin: string;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  isOpen,
  storedPin,
  onClose,
  onSuccess,
  title = "二次身份鉴权验证",
  description = "查看受保护的隐藏账号需要验证您的主 PIN 码",
}) => {
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pinInput.length >= 4) return;
    const nextPin = pinInput + num;
    setPinInput(nextPin);
    setErrorMsg("");

    if (nextPin.length === 4) {
      if (nextPin === storedPin) {
        onSuccess();
        setPinInput("");
        onClose();
      } else {
        setErrorMsg("PIN 码错误");
        setTimeout(() => setPinInput(""), 500);
      }
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };

  return (
    <div className="sa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in font-mono">
      <div className="sa-modal-panel relative w-full max-w-sm bg-[#121218] border border-slate-800 rounded-sm hud-box p-6 flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-sm text-slate-400 hover:text-white bg-[#161622] border border-slate-800"
        >
          <X size={16} />
        </button>

        <div className="mb-3 p-2.5 rounded-sm bg-[#161622] text-[#6D5EF5] border border-[#6D5EF5]/40">
          <Lock size={24} />
        </div>

        <h3 className="text-sm font-bold uppercase text-white mb-1 tracking-wider">
          [ {title} ]
        </h3>
        <p className="text-xs text-slate-400 text-center mb-5 font-sans">{description}</p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-3 mb-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                pinInput.length > idx
                  ? "bg-[#6D5EF5] border-[#6D5EF5]"
                  : "bg-[#07070A] border-slate-800"
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 mb-4 flex items-center gap-1 font-mono">
            <AlertCircle size={13} /> {errorMsg}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs font-mono">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-11 rounded-sm bg-[#07070A] border border-slate-800 text-sm font-bold text-slate-100 hover:bg-[#6D5EF5] hover:text-white transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress("0")}
            className="h-11 rounded-sm bg-[#07070A] border border-slate-800 text-sm font-bold text-slate-100 hover:bg-[#6D5EF5] hover:text-white transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-11 rounded-sm bg-[#07070A] border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center uppercase"
          >
            DEL
          </button>
        </div>
      </div>
    </div>
  );
};
