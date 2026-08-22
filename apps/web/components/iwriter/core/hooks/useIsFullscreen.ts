import { useState, useEffect } from 'react';

export function useIsFullscreen(): boolean {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const win = (window as any).electronAPI?.window;
    if (!win) return;

    // 初始状态查询
    win.isFullscreen?.().then((v: boolean) => setFullscreen(!!v)).catch(() => {});

    // 监听绿色按钮 / IPC / 快捷键触发的全屏变化（不依赖 fsTransitioning）
    const off = win.onFullscreenState?.((v: boolean) => setFullscreen(v));
    return () => { off?.(); };
  }, []);

  return fullscreen;
}
