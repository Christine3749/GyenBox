/** useCanvasMenus — Canvas 编辑器菜单数据 hook */
import { useMemo } from 'react';
import {
  EditorMode, FocusMode, MenuId, LineLen, FontChoice, MenuSpec,
} from '../components/CanvasEditorTypes';
import { SYNTAX_COLORS, type SyntaxPart, type SyntaxPartState } from './iwriterSyntaxHighlight';
import { shellPlatform } from './useShellPlatform';
import type { AuthorKind, AuthorKindState, StyleCheckKind, StyleCheckState } from '../stores/canvasPrefsStore';

const MOD = shellPlatform.isMac ? '⌘' : 'Ctrl+';
const SHIFT_MOD = shellPlatform.isMac ? '⇧⌘' : 'Shift+Ctrl+';
const STYLE_MOD = shellPlatform.isMac ? '⌥⇧⌘' : 'Alt+Shift+Ctrl+';

interface Params {
  words: number; chars: number; readMin: number;
  mode: EditorMode; dark: boolean; tw: boolean;
  focusMode: FocusMode; lineLen: LineLen; font: FontChoice;
  syntaxHighlight: boolean; syntaxParts: SyntaxPartState;
  styleCheck: boolean; styleChecks: StyleCheckState;
  authorsHighlight: boolean; authorKinds: AuthorKindState;
  docType: 'doc' | 'canvas' | 'nodes' | 'image' | 'office';
  setMode:      React.Dispatch<React.SetStateAction<EditorMode>>;
  setDark:      (v: (p: boolean) => boolean) => void;
  setTw:        (v: (p: boolean) => boolean) => void;
  setFocusMode: (m: FocusMode | ((p: FocusMode) => FocusMode)) => void;
  setSyntaxEnabled: (enabled: boolean) => void;
  toggleSyntaxPart: (part: SyntaxPart) => void;
  setStyleCheckEnabled: (enabled: boolean) => void;
  toggleStyleCheck: (kind: StyleCheckKind) => void;
  setAuthorsEnabled: (enabled: boolean) => void;
  toggleAuthorKind: (kind: AuthorKind) => void;
  setLineLen:   (v: LineLen)    => void;
  setFontSize:  (v: (p: number) => number) => void;
  setFont:      (v: FontChoice) => void;
  setActiveMenu:(v: MenuId)     => void;
  wrap:         (b: string, a: string) => void;
  formatActions: Record<string, () => void>;
  importFile:   () => void;
  exportMd:     () => void;
  printDoc:     () => void;
  createFile:   (type: 'doc' | 'canvas' | 'nodes') => void;
  onClose:      () => void;
}

export function useCanvasMenus(p: Params): MenuSpec[] {
  return useMemo<MenuSpec[]>(() => [
    { id: 'file', label: 'File', items: [
      { label: 'Import…',            shortcut: 'Ctrl+I', action: p.importFile },
      '---',
      { label: 'Export as Markdown', shortcut: 'Ctrl+E', action: p.exportMd },
      { label: 'Export as HTML',     disabled: true },
      '---',
      { label: 'Print…', shortcut: 'Ctrl+P', action: p.printDoc },
      '---',
      { label: 'Close', shortcut: 'Esc', action: () => { p.setActiveMenu(null); p.onClose(); } },
    ]},
    { id: 'edit', label: 'Edit', items: [
      { label: 'Undo',       shortcut: 'Ctrl+Z' },
      { label: 'Redo',       shortcut: 'Ctrl+Y' },
      '---',
      { label: 'Cut',        shortcut: 'Ctrl+X' },
      { label: 'Copy',       shortcut: 'Ctrl+C' },
      { label: 'Paste',      shortcut: 'Ctrl+V' },
      '---',
      { label: 'Select All', shortcut: 'Ctrl+A' },
    ]},
    { id: 'format', label: 'Format', items: [
      { label: 'Headings', icon: 'format-headings', submenu: [
        { label: 'Heading 1', shortcut: 'Ctrl+1', action: p.formatActions['format.heading-1'] },
        { label: 'Heading 2', shortcut: 'Ctrl+2', action: p.formatActions['format.heading-2'] },
        { label: 'Heading 3', shortcut: 'Ctrl+3', action: p.formatActions['format.heading-3'] },
        { label: 'Heading 4', shortcut: 'Ctrl+4', action: p.formatActions['format.heading-4'] },
        { label: 'Heading 5', shortcut: 'Ctrl+5', action: p.formatActions['format.heading-5'] },
        { label: 'Heading 6', shortcut: 'Ctrl+6', action: p.formatActions['format.heading-6'] },
      ] },
      { label: 'Lists', icon: 'format-lists', submenu: [
        { label: 'Bulleted List', action: p.formatActions['format.bullet-list'] },
        { label: 'Numbered List', action: p.formatActions['format.numbered-list'] },
        { label: 'Task List', action: p.formatActions['format.task-list'] },
      ] },
      { label: 'Blockquote', icon: 'format-blockquote', shortcut: 'Ctrl+Shift+.', action: p.formatActions['format.blockquote'] },
      { label: 'Body', icon: 'format-body', action: p.formatActions['format.body'] },
      '---',
      { label: 'Structure', icon: 'format-structure', submenu: [
        { label: 'Indent', shortcut: 'Ctrl+]', action: p.formatActions['format.indent'] },
        { label: 'Outdent', shortcut: 'Ctrl+[', action: p.formatActions['format.outdent'] },
      ] },
      '---',
      { label: 'Bold', icon: 'format-bold', shortcut: 'Ctrl+B', action: p.formatActions['format.bold'] },
      { label: 'Italic', icon: 'format-italic', shortcut: 'Ctrl+I', action: p.formatActions['format.italic'] },
      { label: 'Strikethrough', icon: 'format-strikethrough', shortcut: 'Alt+Ctrl+U', action: p.formatActions['format.strikethrough'] },
      { label: 'Highlight', icon: 'format-highlight', shortcut: 'Shift+Ctrl+U', action: p.formatActions['format.highlight'] },
      '---',
      { label: 'Code', icon: 'format-code', shortcut: 'Ctrl+J', action: p.formatActions['format.code'] },
      { label: 'Code Block', icon: 'format-code-block', shortcut: 'Shift+Ctrl+J', action: p.formatActions['format.code-block'] },
      '---',
      { label: 'Add Link', icon: 'format-link', shortcut: 'Ctrl+K', action: p.formatActions['format.add-link'] },
      { label: 'Add Wikilink', icon: 'format-wikilink', shortcut: 'Shift+Ctrl+K', action: p.formatActions['format.add-wikilink'] },
      { label: 'Add Footnote', icon: 'format-footnote', action: p.formatActions['format.add-footnote'] },
      { label: 'Add Content Block', icon: 'format-content-block', action: p.formatActions['format.add-content-block'] },
      { label: 'Add Hashtag', icon: 'format-hashtag', action: p.formatActions['format.add-hashtag'] },
      '---',
      { label: 'Add Date', icon: 'format-date', action: p.formatActions['format.add-date'] },
      { label: 'Add Table', icon: 'format-table', action: p.formatActions['format.add-table'] },
      { label: 'Add Table of Contents', icon: 'format-toc', action: p.formatActions['format.add-toc'] },
      '---',
      { label: 'Add Horizontal Rule', icon: 'format-rule', action: p.formatActions['format.add-horizontal-rule'] },
      { label: 'Add Page Break', icon: 'format-page-break', action: p.formatActions['format.add-page-break'] },
      '---',
      { label: 'Clear Styles', icon: 'format-clear', action: p.formatActions['format.clear-styles'] },
    ]},
    { id: 'focus', label: 'Focus', items: [
      { label: p.focusMode === 'off' ? 'Enable Focus Mode' : 'Disable Focus Mode', shortcut: `${MOD}D`, icon: 'focus-lines',
        action: () => { p.setFocusMode(m => m === 'off' ? 'sentence' : 'off'); p.setActiveMenu(null); } },
      { label: 'Sentence', checked: p.focusMode === 'sentence',
        action: () => { p.setFocusMode('sentence'); p.setActiveMenu(null); } },
      { label: 'Paragraph', checked: p.focusMode === 'paragraph',
        action: () => { p.setFocusMode('paragraph'); p.setActiveMenu(null); } },
      { label: 'Typewriter', checked: p.tw,
        action: () => { p.setTw(v => !v); p.setActiveMenu(null); } },
      '---',
      { label: p.syntaxHighlight ? 'Hide Syntax' : 'Show Syntax', shortcut: `${SHIFT_MOD}D`, icon: 'syntax-grid',
        action: () => p.setSyntaxEnabled(!p.syntaxHighlight) },
      { label: 'Adjectives', checked: p.syntaxParts.adjectives, color: (p.dark ? SYNTAX_COLORS.dark : SYNTAX_COLORS.light).adjectives,
        action: () => p.toggleSyntaxPart('adjectives') },
      { label: 'Nouns', checked: p.syntaxParts.nouns, color: (p.dark ? SYNTAX_COLORS.dark : SYNTAX_COLORS.light).nouns,
        action: () => p.toggleSyntaxPart('nouns') },
      { label: 'Adverbs', checked: p.syntaxParts.adverbs, color: (p.dark ? SYNTAX_COLORS.dark : SYNTAX_COLORS.light).adverbs,
        action: () => p.toggleSyntaxPart('adverbs') },
      { label: 'Verbs', checked: p.syntaxParts.verbs, color: (p.dark ? SYNTAX_COLORS.dark : SYNTAX_COLORS.light).verbs,
        action: () => p.toggleSyntaxPart('verbs') },
      { label: 'Conjunctions', checked: p.syntaxParts.conjunctions, color: (p.dark ? SYNTAX_COLORS.dark : SYNTAX_COLORS.light).conjunctions,
        action: () => p.toggleSyntaxPart('conjunctions') },
      '---',
      { label: p.styleCheck ? 'Disable Style Check' : 'Enable Style Check', shortcut: `${STYLE_MOD}D`, icon: 'style-check',
        action: () => p.setStyleCheckEnabled(!p.styleCheck) },
      { label: 'Fillers', checked: p.styleChecks.fillers, indicator: 'dash', action: () => p.toggleStyleCheck('fillers') },
      { label: 'Clichés', checked: p.styleChecks.cliches, indicator: 'dash', action: () => p.toggleStyleCheck('cliches') },
      { label: 'Redundancies', checked: p.styleChecks.redundancies, indicator: 'dash', action: () => p.toggleStyleCheck('redundancies') },
      { label: 'Custom', checked: p.styleChecks.custom, indicator: 'dash', action: () => p.toggleStyleCheck('custom') },
      '---',
      { label: p.authorsHighlight ? 'Hide Authors' : 'Show Authors', shortcut: `${SHIFT_MOD}A`, icon: 'authors',
        action: () => p.setAuthorsEnabled(!p.authorsHighlight) },
      { label: 'Human', checked: p.authorKinds.human, action: () => p.toggleAuthorKind('human') },
      { label: 'AI', checked: p.authorKinds.ai, action: () => p.toggleAuthorKind('ai') },
      { label: 'Reference', checked: p.authorKinds.reference, action: () => p.toggleAuthorKind('reference') },
    ]},
    { id: 'authors', label: 'Authors', items: [
      { label: `${p.words} Words`,       disabled: true },
      { label: `${p.chars} Characters`,  disabled: true },
      { label: `~${p.readMin} min read`, disabled: true },
      '---',
      { label: 'Set Word Goal…', disabled: true },
    ]},
    { id: 'view', label: 'View', items: [
      { label: 'Writing',
        checked: p.mode === 'write',
        action: () => { p.setMode('write'); p.setActiveMenu(null); } },
      { label: 'Preview', shortcut: 'Ctrl+P',
        checked: p.mode === 'preview',
        action: () => { p.setMode(m => m === 'preview' ? 'write' : 'preview' as EditorMode); p.setActiveMenu(null); } },
      { label: 'Split View', shortcut: 'Ctrl+Shift+P',
        checked: p.mode === 'split',
        action: () => { p.setMode(m => m === 'split' ? 'write' : 'split' as EditorMode); p.setActiveMenu(null); } },
      '---',
      { label: '64 Characters', checked: p.lineLen === 64, action: () => { p.setLineLen(64); p.setActiveMenu(null); } },
      { label: '72 Characters', checked: p.lineLen === 72, action: () => { p.setLineLen(72); p.setActiveMenu(null); } },
      { label: '80 Characters', checked: p.lineLen === 80, action: () => { p.setLineLen(80); p.setActiveMenu(null); } },
      '---',
      { label: 'iA Writer Mono',    checked: p.font === 'mono',    action: () => { p.setFont('mono');    p.setActiveMenu(null); } },
      { label: 'iA Writer Quattro', checked: p.font === 'quattro', action: () => { p.setFont('quattro'); p.setActiveMenu(null); } },
      '---',
      { label: 'Larger Text',  shortcut: 'Ctrl++', action: () => { p.setFontSize(s => Math.min(24, s + 1)); p.setActiveMenu(null); } },
      { label: 'Smaller Text', shortcut: 'Ctrl+−', action: () => { p.setFontSize(s => Math.max(13, s - 1)); p.setActiveMenu(null); } },
      '---',
      { label: 'New Document',    action: () => p.createFile('doc')    },
      { label: 'New Whiteboard',  action: () => p.createFile('canvas') },
      { label: 'New Node Canvas', action: () => p.createFile('nodes')  },
    ]},
    { id: 'help', label: 'Help', items: [
      { label: 'Keyboard Shortcuts', disabled: true },
      '---',
      { label: 'About CANVAS', disabled: true },
    ]},
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [p.words, p.chars, p.readMin, p.mode, p.dark, p.tw, p.focusMode,
    p.syntaxHighlight, p.syntaxParts, p.styleCheck, p.styleChecks,
    p.authorsHighlight, p.authorKinds, p.lineLen, p.font]);
}
