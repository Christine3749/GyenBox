import { useState, useEffect, useRef } from 'react';
import { ModelId } from '../config/models';
import { probeLocalChatGptBridge } from '../services/localBridge';

type HealthStatus = 'online' | 'checking' | 'offline';

export interface ModelHealth {
  status: HealthStatus;
  error?: string;
  authMode?: string;
}

export function useModelHealth(selectedModel: ModelId, intervalMs = 30_000, refreshKey = 0): ModelHealth {
  const [health, setHealth] = useState<ModelHealth>({ status: 'checking' });
  const checkStartRef = useRef<number>(0);
  const checkCountRef = useRef<number>(0);

  const check = async () => {
    try {
      if (selectedModel === 'chatgpt-pro') {
        const local = await probeLocalChatGptBridge(1200);
        if (local) {
          setHealth(local.health);
          checkCountRef.current = local.health.status === 'online' ? 0 : checkCountRef.current + 1;
          return;
        }

        checkCountRef.current++;
        if (checkCountRef.current >= 2) {
          setHealth({ status: 'offline', error: 'LOCAL BRIDGE OFFLINE' });
        } else {
          setHealth({ status: 'checking' });
        }
        return;
      }

      const base = window.location.protocol === 'file:' ? 'https://gsyen.com' : '';
      const r = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
      const d = await r.json();
      const modelStatus = d.models?.[selectedModel];

      // 兼容两种格式：新格式 { available: bool, error?: string } 或旧格式 boolean
      const isAvailable = typeof modelStatus === 'object'
        ? modelStatus?.available === true
        : modelStatus === true;
      const errorMsg = typeof modelStatus === 'object'
        ? modelStatus?.error
        : undefined;
      const authMode = typeof modelStatus === 'object'
        ? modelStatus?.authMode
        : undefined;

      if (isAvailable) {
        setHealth({ status: 'online', authMode });
        checkCountRef.current = 0; // Reset on success
      } else {
        checkCountRef.current++;
        if (checkCountRef.current >= 2) {
          setHealth({ status: 'offline', error: errorMsg || 'SERVICE OFFLINE' });
        } else {
          setHealth({ status: 'checking' });
        }
      }
    } catch (err) {
      checkCountRef.current++;
      if (checkCountRef.current >= 2) {
        setHealth({ status: 'offline', error: 'CONNECTION TIMEOUT' });
      } else {
        setHealth({ status: 'checking' });
      }
    }
  };

  useEffect(() => {
    checkStartRef.current = Date.now();
    checkCountRef.current = 0;
    check();
    const t = setInterval(check, intervalMs);
    return () => clearInterval(t);
  }, [selectedModel, intervalMs, refreshKey]);

  return health;
}
