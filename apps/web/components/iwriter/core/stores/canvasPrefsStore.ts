/**
 * canvasPrefsStore — iWriter 用户偏好持久化
 * 读写 localStorage，mount 时作为各 state 的初始值。
 */
import { useState, useEffect } from 'react';
import { DEFAULT_SYNTAX_PARTS, type SyntaxPartState } from '../hooks/iwriterSyntaxHighlight';

export type StyleCheckKind = 'fillers' | 'cliches' | 'redundancies' | 'custom';
export type AuthorKind = 'human' | 'ai' | 'reference';
export type StyleCheckState = Record<StyleCheckKind, boolean>;
export type AuthorKindState = Record<AuthorKind, boolean>;

export const DEFAULT_STYLE_CHECKS: StyleCheckState = {
  fillers: false, cliches: false, redundancies: false, custom: false,
};
export const DEFAULT_AUTHOR_KINDS: AuthorKindState = {
  human: true, ai: true, reference: true,
};

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
  styleCheck: boolean;
  styleChecks: StyleCheckState;
  authorsHighlight: boolean;
  authorKinds: AuthorKindState;
  // Library
  defaultExt:    '.md' | '.txt' | '.xlsx' | '.docx' | '.pdf' | '.excalidraw' | '.canvas';
  reopenLast:    boolean;
  lastFilePath?: string;
}

const DEFAULT: CanvasPrefs = {
  dark: false, font: 'mono', fontSize: 17, lineLen: 72,
  focusMode: 'off', tw: false,
  syntaxHighlight: false, syntaxParts: DEFAULT_SYNTAX_PARTS,
  styleCheck: false, styleChecks: DEFAULT_STYLE_CHECKS,
  authorsHighlight: true, authorKinds: DEFAULT_AUTHOR_KINDS,
  defaultExt: '.docx', reopenLast: true,
};

function _load(): CanvasPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      ...DEFAULT,
      ...saved,
      syntaxParts: { ...DEFAULT_SYNTAX_PARTS, ...(saved.syntaxParts ?? {}) },
      styleChecks: { ...DEFAULT_STYLE_CHECKS, ...(saved.styleChecks ?? {}) },
      authorKinds: { ...DEFAULT_AUTHOR_KINDS, ...(saved.authorKinds ?? {}) },
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
      styleChecks: patch.styleChecks ? { ..._p.styleChecks, ...patch.styleChecks } : _p.styleChecks,
      authorKinds: patch.authorKinds ? { ..._p.authorKinds, ...patch.authorKinds } : _p.authorKinds,
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
