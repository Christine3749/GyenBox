'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AiConfig = { apiKey: string; model: string };
type AiContextValue = {
  configured: boolean;
  config: AiConfig;
  saveConfig: (next: AiConfig) => void;
  clearConfig: () => void;
  request: <T>(action: string, payload: unknown) => Promise<T>;
};

const STORAGE_KEY = 'gyen_keep_ai_config_v1';
const DEFAULT_CONFIG: AiConfig = { apiKey: '', model: 'gemini-2.0-flash' };
const AiContext = createContext<AiContextValue | null>(null);

export function AiProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AiConfig> | null;
      if (saved?.apiKey || saved?.model) setConfig({ apiKey: saved.apiKey ?? '', model: saved.model ?? DEFAULT_CONFIG.model });
    } catch {
      // A broken local preference must never stop Keep from opening.
    }
  }, []);

  const saveConfig = useCallback((next: AiConfig) => {
    const cleaned = { apiKey: next.apiKey.trim(), model: next.model.trim() || DEFAULT_CONFIG.model };
    setConfig(cleaned);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }, []);

  const clearConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const request = useCallback(async <T,>(action: string, payload: unknown): Promise<T> => {
    if (!config.apiKey) throw new Error('AI_TOKEN_REQUIRED');
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gyenbox-ai-key': config.apiKey },
      body: JSON.stringify({ action, model: config.model, payload }),
    });
    const envelope = await response.json().catch(() => null) as { ok?: boolean; data?: T; error?: { message?: string } } | null;
    if (!response.ok || !envelope?.ok || envelope.data === undefined) throw new Error(envelope?.error?.message ?? 'AI request failed');
    return envelope.data;
  }, [config]);

  const value = useMemo(() => ({ configured: Boolean(config.apiKey), config, saveConfig, clearConfig, request }), [config, saveConfig, clearConfig, request]);
  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi() {
  const context = useContext(AiContext);
  if (!context) throw new Error('useAi must be used inside AiProvider');
  return context;
}
