import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Download,
  Trash2
} from 'lucide-react';

interface PrivacyViewProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onShowToast }) => {
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [confirmClearCloud, setConfirmClearCloud] = useState(false);
  const [confirmClearLocal, setConfirmClearLocal] = useState(false);

  const handleToggleCloudSync = () => {
    const next = !cloudSyncEnabled;
    setCloudSyncEnabled(next);
    onShowToast(next ? '已开启云端个人词频同步' : '已关闭云端个人词频同步，进入纯离线模式', 'info');
  };

  const handleClearCloudData = () => {
    setConfirmClearCloud(false);
    onShowToast('云端个人词频记录已安全清空！', 'success');
  };

  const handleClearLocalData = () => {
    setConfirmClearLocal(false);
    onShowToast('本机学习历史与临时频次记录已安全重置！', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-[#11131c] border border-[#222532] rounded-md space-y-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              隐私安全与数据独立声明
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              GyenBox 坚守“不收集键盘原始日志”、“私密词条不公开”的核心安全准则。
            </p>
          </div>
        </div>

        {/* Zero Keylogger Pledge Box */}
        <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-md text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>无原始键盘日志 (Zero Keylogger) 承诺</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            GY 输入法绝不会记录或上传你的任何原始键盘按键序列（Keystrokes）。仅在你明确确认、收藏或授权同步的词条上，才会对其词频计数与首选次序进行局部加密存储。
          </p>
        </div>
      </div>

      {/* Control Switches */}
      <div className="bg-[#11131c] border border-[#222532] rounded-md p-4 space-y-3">
        <h2 className="text-xs font-bold text-zinc-200 border-b border-[#222532] pb-2 font-mono">
          词频同步与隐私控制开关
        </h2>

        <div className="space-y-3 text-xs">
          {/* Switch 1 */}
          <div className="flex items-center justify-between p-3 bg-[#161824] border border-[#222532] rounded-md">
            <div className="space-y-0.5">
              <div className="font-bold text-zinc-200">个人词频云端加密同步</div>
              <p className="text-[11px] text-zinc-400">
                开启后将在你的多台电脑和移动端之间安全对齐常用词顺序。关闭后仅在本机独立保存。
              </p>
            </div>
            <button
              onClick={handleToggleCloudSync}
              className={`w-11 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                cloudSyncEnabled ? 'bg-blue-600 justify-end' : 'bg-[#272a38] justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Switch 2 */}
          <div className="flex items-center justify-between p-3 bg-[#161824] border border-[#222532] rounded-md">
            <div className="space-y-0.5">
              <div className="font-bold text-zinc-200">导出个人词库备份文件</div>
              <p className="text-[11px] text-zinc-400">
                随时将你积累的专属词库导出为本地 JSON、CSV 或 TXT 文件，方便离线归档。
              </p>
            </div>
            <button
              onClick={() => onShowToast('可在【我的词库】页面随时进行三格式离线导出', 'info')}
              className="px-3 py-1.5 bg-[#181a26] hover:bg-[#202230] text-zinc-200 rounded border border-[#272a38] text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>下载归档包</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dangerous Operations / Reset */}
      <div className="bg-[#11131c] border border-[#222532] rounded-md p-4 space-y-3">
        <h2 className="text-xs font-bold text-rose-400 border-b border-[#222532] pb-2 font-mono">
          数据清除与危险区域 (二次确认)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Clear Cloud */}
          <div className="p-3 bg-[#161824] border border-[#222532] rounded-md space-y-2 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>清除云端个人词频记录</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                擦除存储在 GyenBox 云端服务器上的全部个人词频权重，恢复默认初始算法。
              </p>
            </div>

            {confirmClearCloud ? (
              <div className="p-2 bg-rose-950/40 border border-rose-900/60 rounded space-y-2">
                <span className="text-[11px] text-rose-300 font-bold block">确认擦除云端所有词频？</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearCloudData}
                    className="px-3 py-1 bg-rose-600 text-white font-bold rounded text-[11px]"
                  >
                    确认清除
                  </button>
                  <button
                    onClick={() => setConfirmClearCloud(false)}
                    className="px-3 py-1 bg-[#181a26] text-zinc-300 rounded text-[11px] border border-[#272a38]"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClearCloud(true)}
                className="w-full py-1.5 bg-[#0c0d10] hover:bg-rose-950/30 text-rose-400 border border-[#272a38] hover:border-rose-900/40 rounded font-medium transition-colors"
              >
                清空云端词频数据
              </button>
            )}
          </div>

          {/* Clear Local */}
          <div className="p-3 bg-[#161824] border border-[#222532] rounded-md space-y-2 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>清除本机学习历史</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                重置本台电脑本地打字学习缓存，不影响公共基础词库与高频固定词。
              </p>
            </div>

            {confirmClearLocal ? (
              <div className="p-2 bg-rose-950/40 border border-rose-900/60 rounded space-y-2">
                <span className="text-[11px] text-rose-300 font-bold block">确认重置本机学习历史？</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearLocalData}
                    className="px-3 py-1 bg-rose-600 text-white font-bold rounded text-[11px]"
                  >
                    确认重置
                  </button>
                  <button
                    onClick={() => setConfirmClearLocal(false)}
                    className="px-3 py-1 bg-[#181a26] text-zinc-300 rounded text-[11px] border border-[#272a38]"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClearLocal(true)}
                className="w-full py-1.5 bg-[#0c0d10] hover:bg-rose-950/30 text-rose-400 border border-[#272a38] hover:border-rose-900/40 rounded font-medium transition-colors"
              >
                重置本机打字缓存
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
