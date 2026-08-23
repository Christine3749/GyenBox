/**
 * canvasPrefsStore — iWriter 用户偏好持久化
 * 读写 localStorage，mount 时作为各 state 的初始值。
 */
import { useState, useEffect } from 'react';
import { DEFAULT_SYNTAX_PARTS, type SyntaxPartState } from '../hooks/iwriterSyntaxHighlight';

const KEY = 'gyenbox_iwriter_prefs';

export interface CanvasPrefs {
  // Editor
  dark:       boolean;
  font:       'mono' | 'quattro';
  fontSize:   number;
  lineLen:    64 | 72 | 80;
  // Writing
  focusMode:  'off' | 'sentence' | 'paragraph';
  tw:         boolean;
  syntaxHighlight: boolean;
  syntaxParts: SyntaxPartState;
  // Library
  defaultExt:    '.md' | '.txt' | '.xlsx' | '.docx' | '.pdf' | '.excalidraw' | '.canvas';
  reopenLast:    boolean;
  lastFilePath?: string;
}

const DEFAULT: CanvasPrefs = {
  dark: false, font: 'mono', fontSize: 17, lineLen: 72,
  focusMode: 'off', tw: false,
  syntaxHighlight: false, syntaxParts: DEFAULT_SYNTAX_PARTS,
  defaultExt: '.docx', reopenLast: true,
};

function _load(): CanvasPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      ...DEFAULT,
      ...saved,
      syntaxParts: { ...DEFAULT_SYNTAX_PARTS, ...(saved.syntaxParts ?? {}) },
    };
  }
  catch { return { ...DEFAULT }; }
}

let _p = _load();
const _listeners = new Set<(p: CanvasPrefs) => void>();

export const canvasPrefsStore = {
  get: () => _p,

  set(patch: Partial<CanvasPrefs>) {
    _p = {
      ..._p,
      ...patch,
      syntaxParts: patch.syntaxParts ? { ..._p.syntaxParts, ...patch.syntaxParts } : _p.syntaxParts,
    };
    try { localStorage.setItem(KEY, JSON.stringify(_p)); } catch {}
    _listeners.forEach(fn => fn(_p));
  },
};

export function useCanvasPrefs() {
  const [state, setState] = useState(_p);
  useEffect(() => {
    _listeners.add(setState);
    return () => { _listeners.delete(setState); };
  }, []);
  return state;
}
