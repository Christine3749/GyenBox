import { useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import { useAi } from '../context/AiContext';

export function AiSettingsModal({ onClose }: { onClose: () => void }) {
  const { config, saveConfig, clearConfig } = useAi();
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const save = () => {
    saveConfig({ apiKey, model });
    setStatus('idle');
    setMessage('');
  };

  const test = async () => {
    saveConfig({ apiKey, model });
    setStatus('testing');
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gyenbox-ai-key': apiKey.trim() }, body: JSON.stringify({ action: 'health', model: model.trim() || 'gemini-2.0-flash', payload: {} }) });
      const payload = await response.json().catch(() => null) as { ok?: boolean; error?: { message?: string } } | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? '连接失败');
      setStatus('ok');
      setMessage('连接成功');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '连接失败');
    }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
    <section className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-2"><span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-300"><KeyRound className="h-5 w-5" /></span><div><h2 className="font-bold">Keep AI 设置</h2><p className="text-xs text-zinc-500">使用你自己的 Gemini API Token</p></div></div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Gemini API Token<input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" autoComplete="off" placeholder="AIza…" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" /></label>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">模型<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gemini-2.0-flash" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" /></label>
        <div className="flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Token 仅保存在此浏览器，不同步至 GyenBox，也不会写入服务器日志。清除浏览器数据或点击“移除 Token”即可删除。</span></div>
        {message && <div className={`flex items-center gap-2 text-xs ${status === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{status === 'ok' && <CheckCircle2 className="h-4 w-4" />}{message}</div>}
      </div>
      <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"><button onClick={() => { clearConfig(); setApiKey(''); setStatus('idle'); setMessage(''); }} className="text-xs font-medium text-rose-600 hover:underline">移除 Token</button><div className="flex gap-2"><button onClick={save} className="rounded-xl px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-700">保存</button><button disabled={!apiKey.trim() || status === 'testing'} onClick={test} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{status === 'testing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}测试连接</button></div></footer>
    </section>
  </div>;
}
