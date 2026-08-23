/**
 * useCanvasTheme — CodeMirror 6 iA Writer 风格主题 + 扩展集
 *
 * 导出：
 *  iaWriterTheme(dark, fontSize?, fontFamily?)
 *  focusModeExt()     段落聚焦
 *  sentenceFocusExt() 行级聚焦（比段落更紧）
 *  typewriterExt()    打字机模式
 *  baseExtensions()   markdown + lineWrapping
 */
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, placeholder } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { SYNTAX_COLORS } from './iwriterSyntaxHighlight';

export const PALETTE = {
  dark:  { bg: '#181818', fg: '#D1D1CF', dim: '#3A3B3A', muted: '#70716E', sel: '#244557', caret: '#2FB7E8' },
  light: { bg: '#FFFFFF', fg: '#1A1A1A', dim: '#C8C8C8', muted: '#999999', sel: '#C5DDF8', caret: '#55AAFF' },
};

export function iaWriterTheme(dark: boolean, fontSize = 17, fontFamily?: string) {
  injectFocusCSS();
  const P  = dark ? PALETTE.dark : PALETTE.light;
  const syntax = dark ? SYNTAX_COLORS.dark : SYNTAX_COLORS.light;
  const ff = fontFamily ?? '"iA Writer Mono","Courier New","Consolas",monospace';
  return EditorView.theme({
    '&': { background: P.bg, color: P.fg, fontSize: `${fontSize}px`, fontFamily: ff, height: '100%', border: 'none !important', outline: 'none !important', boxShadow: 'none !important' },
    '&.cm-focused':  { border: 'none !important', outline: 'none !important', boxShadow: 'none !important' },
    '.cm-scroller':  { overflow: 'auto', lineHeight: '1.9' },
    '.cm-content':   { padding: '0', caretColor: P.caret },
    '.cm-line':      { padding: '0' },
    '.cm-cursor':              { borderLeft: 'none', width: '2.5px', background: P.caret, borderRadius: '99px', height: '1.496em !important', marginLeft: '0px', marginTop: '-0.248em' },
    '.cm-cursor + .cm-cursor': { display: 'none' },
    '.cm-selectionBackground, ::selection': { background: P.sel + ' !important' },
    '.cm-focused .cm-selectionBackground':  { background: P.sel },
    '.cm-header, .tok-heading': { color: P.fg, fontWeight: 'bold' },
    '.tok-heading1':             { fontSize: '1.18em' },
    '.tok-heading2':             { fontSize: '1.07em' },
    '.tok-quote, .tok-meta':     { color: dark ? '#70716E' : '#999999', fontStyle: 'italic' },
    '.tok-link, .tok-url':       { color: dark ? '#45A9D2' : '#55AAFF', textDecoration: 'none' },
    '.tok-emphasis':             { fontStyle: 'italic', color: P.fg },
    '.tok-strong':               { fontWeight: 'bold',  color: P.fg },
    '.tok-strikethrough':        { textDecoration: 'line-through', color: dark ? '#70716E' : '#999999' },
    '.tok-monospace, .tok-code': { fontFamily: 'inherit', background: dark ? '#232424' : '#F2F2F2', borderRadius: '2px', padding: '0 3px', color: P.fg },
    // iA Syntax Highlight changes only ink color. No weight, underline or
    // background is introduced, which keeps the page quiet while exposing its grammar.
    '.cm-syntax-adjective':   { color: `${syntax.adjectives} !important` },
    '.cm-syntax-noun':        { color: `${syntax.nouns} !important` },
    '.cm-syntax-adverb':      { color: `${syntax.adverbs} !important` },
    '.cm-syntax-verb':        { color: `${syntax.verbs} !important` },
    '.cm-syntax-conjunction': { color: `${syntax.conjunctions} !important` },
    '.cm-activeLine':            { background: 'transparent' },
    '.cm-gutters':               { display: 'none' },
    '.cm-activeLineGutter':      { background: 'transparent' },
  }, { dark });
}

// ─── CSS 注入（仅一次）───────────────────────────────────────────────────────
let cssInjected = false;
function injectFocusCSS() {
  if (cssInjected) return; cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    .cm-focus-dim { opacity: 0.25; transition: opacity 0.22s ease; }
    .cm-editor, .cm-editor.cm-focused, .cm-editor:focus, .cm-editor:focus-within {
      border: none !important; outline: none !important; box-shadow: none !important;
      background: inherit !important;
    }
    .cm-scroller { background: transparent !important; }
    .cm-placeholder { opacity: 0.35; font-style: italic; }
  `;
  document.head.appendChild(s);
}

const dimLine = Decoration.line({ class: 'cm-focus-dim' });
const dimText = Decoration.mark({ class: 'cm-focus-dim' });

function scrollToCursor(view: EditorView) {
  requestAnimationFrame(() => {
    const cursor = view.state.selection.main.head;
    const coords = view.coordsAtPos(cursor);
    if (!coords) return;
    let el: Element | null = view.dom.parentElement;
    while (el && el !== document.documentElement) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const rect = el.getBoundingClientRect();
        const offset = coords.top - rect.top - rect.height * 0.42;
        if (Math.abs(offset) > 8) el.scrollBy({ top: offset, behavior: 'smooth' });
        return;
      }
      el = el.parentElement;
    }
  });
}

// ─── 段落聚焦：当前段落外全暗 ───────────────────────────────────────────────
export function focusModeExt() {
  injectFocusCSS();
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(u: ViewUpdate) { if (u.selectionSet || u.docChanged) { this.decorations = this.build(u.view); if (u.selectionSet) scrollToCursor(u.view); } }
    build(view: EditorView): DecorationSet {
      const cursor = view.state.selection.main.head; const doc = view.state.doc;
      const cur = doc.lineAt(cursor).number; let s = cur, e = cur;
      while (s > 1         && doc.line(s - 1).text.trim() !== '') s--;
      while (e < doc.lines && doc.line(e + 1).text.trim() !== '') e++;
      const builder = new RangeSetBuilder<Decoration>();
      for (let i = 1; i <= doc.lines; i++) if ((i < s || i > e) && doc.line(i).text.trim() !== '') builder.add(doc.line(i).from, doc.line(i).from, dimLine);
      return builder.finish();
    }
  }, { decorations: v => v.decorations });
}

// ─── 句子聚焦（Sentence）：按标点边界，而不是按视觉行 ───────────────────────
export function sentenceFocusExt() {
  injectFocusCSS();
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(u: ViewUpdate) { if (u.selectionSet || u.docChanged) this.decorations = this.build(u.view); }
    build(view: EditorView): DecorationSet {
      const cursor = view.state.selection.main.head;
      const source = view.state.doc.toString();
      const boundary = /[.!?。！？\n]/;
      let start = Math.min(cursor, source.length);
      let end = start;
      while (start > 0 && !boundary.test(source[start - 1])) start--;
      while (start < source.length && /\s/.test(source[start])) start++;
      while (end < source.length && !boundary.test(source[end])) end++;
      if (end < source.length && source[end] !== '\n') end++;
      const builder = new RangeSetBuilder<Decoration>();
      if (start > 0) builder.add(0, start, dimText);
      if (end < source.length) builder.add(end, source.length, dimText);
      return builder.finish();
    }
  }, { decorations: v => v.decorations });
}

// ─── 打字机模式：光标始终停在视口 42% 处 ────────────────────────────────────
export function typewriterExt() {
  return ViewPlugin.fromClass(class {
    update(u: ViewUpdate) {
      if (!u.selectionSet && !u.docChanged) return;
      requestAnimationFrame(() => {
        const cursor = u.view.state.selection.main.head;
        const coords = u.view.coordsAtPos(cursor);
        if (!coords) return;
        let el: Element | null = u.view.dom.parentElement;
        while (el && el !== document.documentElement) {
          if (el.scrollHeight > el.clientHeight + 1) {
            const rect = el.getBoundingClientRect();
            const offset = coords.top - rect.top - rect.height * 0.42;
            if (Math.abs(offset) > 1) el.scrollBy({ top: offset, behavior: 'instant' });
            return;
          }
          el = el.parentElement;
        }
      });
    }
  });
}

// ─── 基础扩展 ────────────────────────────────────────────────────────────────
export function baseExtensions(placeholderText = '开始写作…') {
  return [
    markdown(),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: 'false' }),
    placeholder(placeholderText),
  ];
}
