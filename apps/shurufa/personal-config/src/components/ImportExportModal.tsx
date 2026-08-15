import React, { useState } from 'react';
import { GYConfig } from '../types';
import { Download, Upload, Copy, Check, X, Code } from 'lucide-react';

interface ImportExportModalProps {
  mode: 'export' | 'import' | null;
  config: GYConfig;
  onClose: () => void;
  onImportConfig: (parsedConfig: GYConfig) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  mode,
  config,
  onClose,
  onImportConfig,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [pasteJson, setPasteJson] = useState('');

  if (!mode) return null;

  const jsonString = JSON.stringify(config, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    onShowToast('配置 JSON 已复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GY_Shurufa_Config_rev${config.revision}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('配置文件已开始下载', 'success');
  };

  const handleApplyImport = () => {
    try {
      const parsed = JSON.parse(pasteJson);
      if (!parsed.appearance || !parsed.behavior) {
        throw new Error('无效的 GY 输入法配置结构');
      }
      onImportConfig(parsed);
      onShowToast('配置已成功导入并刷新！', 'success');
      onClose();
    } catch (err: any) {
      onShowToast(`导入失败: ${err.message || 'JSON 格式解析错误'}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-[#27272a] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'export' ? (
          <>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#fafafa] flex items-center gap-2">
                <Download className="w-5 h-5 text-[#3b82f6]" />
                导出当前 GY 输入法配置
              </h3>
              <p className="text-xs text-[#71717a]">
                您可以直接复制以下 JSON 文本，或下载为 .json 备份文件在其他隔离设备上导入。
              </p>
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={jsonString}
                className="w-full h-64 bg-[#09090b] border border-[#27272a] rounded-lg p-3 font-mono text-[11px] text-[#3b82f6] focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[#27272a] hover:bg-[#27272a] text-slate-200 text-xs font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制 JSON'}
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-medium"
              >
                <Download className="w-4 h-4" />
                下载备份 JSON 文件
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#fafafa] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#22c55e]" />
                导入外部 JSON 配置文件
              </h3>
              <p className="text-xs text-[#71717a]">
                粘贴导出的配置文件 JSON 字符串，系统将自动校验结构并升级本地版本。
              </p>
            </div>

            <textarea
              placeholder="请在此粘贴 GY_Shurufa_Config.json 内容..."
              value={pasteJson}
              onChange={(e) => setPasteJson(e.target.value)}
              className="w-full h-64 bg-[#09090b] border border-[#27272a] rounded-lg p-3 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-[#3b82f6] resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded border border-[#27272a] hover:bg-[#27272a] text-slate-300 text-xs font-medium"
              >
                取消
              </button>

              <button
                onClick={handleApplyImport}
                disabled={!pasteJson.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#22c55e] hover:bg-emerald-600 text-white text-xs font-medium disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                确认解析并覆盖配置
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
