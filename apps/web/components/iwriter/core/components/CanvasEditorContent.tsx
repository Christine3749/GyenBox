/**
 * CanvasEditorContent — iA Writer 精确复刻
 * 行宽三档、字号调节、三级 Focus、字体切换、Chrome auto-hide
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CanvasDrawEditor } from './CanvasDrawEditor';
import { CanvasNodeEditor, type CanvasNodeEditorRef } from './CanvasNodeEditor';
import { CanvasChrome } from './CanvasChrome';
import {
  DARK, LIGHT, CHROME_H, MAC_TITLE_H, MAC_TRAFFIC_LIGHT_INSET, TITLE_H, isElectron,
  getMacTitlebarInsets,
  EditorMode, FocusMode, MenuId, LineLen, FontChoice,
} from './CanvasEditorTypes';
import { useCanvasMenus } from '../hooks/useCanvasMenus';
import { useCanvasFileOps } from '../hooks/useCanvasFileOps';
import type { EditorView } from '@codemirror/view';
import { canvasStore } from '../stores/canvasStore';
import { iaWriterTheme, focusModeExt, sentenceFocusExt, typewriterExt, baseExtensions } from '../hooks/useCanvasTheme';
import { syntaxHighlightExt, type SyntaxPart } from '../hooks/iwriterSyntaxHighlight';
import { CanvasWriterPane } from './CanvasWriterPane';
import { CanvasStatsPill } from './CanvasStatsPill';
import { CanvasLibrary } from './CanvasLibrary';
import { CanvasDocList, invalidatePrefetch } from './CanvasDocList';
import type { FileEntry } from '../hooks/useFileSystem';
import { fsAdapter } from '../hooks/useFileSystem';
import { libraryStore } from '../stores/canvasLibraryStore';
import { useCanvasPanelWidths } from '../hooks/useCanvasPanelWidths';
import { ImageViewer } from './ImageViewer';
import { OfficeViewer } from './OfficeViewer';
import { canvasPrefsStore } from '../stores/canvasPrefsStore';
import type { CanvasPrefs } from '../stores/canvasPrefsStore';
import { CanvasSettings } from './CanvasSettings';
import { useCanvasCreateFile } from '../hooks/useCanvasCreateFile';
import { useIsFullscreen } from '../hooks/useIsFullscreen';

interface Props { docId: string | undefined; onClose: () => void; }

const _infer = (d: {type?:string;content?:string}|null|undefined): 'doc'|'canvas'|'nodes'|'image'|'office' => {
  if (d?.type && d.type !== 'doc') return d.type as any;
  try { const p=JSON.parse(d?.content?.trim()??''); if('elements'in p||p.type==='excalidraw') return 'canvas'; if('nodes'in p&&'edges'in p) return 'nodes'; } catch {} return 'doc';
};

const NATIVE_MENU_TARGETS: Record<string, [Exclude<MenuId, null>, string]> = {
  'file.import': ['file', 'Import…'],
  'file.export-markdown': ['file', 'Export as Markdown'],
  'file.print': ['file', 'Print…'],
  'file.close': ['file', 'Close'],
  'format.heading-1': ['format', 'Heading 1'],
  'format.heading-2': ['format', 'Heading 2'],
  'format.heading-3': ['format', 'Heading 3'],
  'format.bold': ['format', 'Bold'],
  'format.italic': ['format', 'Italic'],
  'format.code': ['format', 'Code'],
  'format.blockquote': ['format', 'Blockquote'],
  'format.bullet-list': ['format', 'Bullet List'],
  'focus.paragraph': ['focus', 'Paragraph Focus'],
  'focus.sentence': ['focus', 'Sentence Focus'],
  'focus.none': ['focus', 'No Focus'],
  'focus.typewriter': ['focus', 'Typewriter Mode'],
  'view.writing': ['view', 'Writing'],
  'view.preview': ['view', 'Preview'],
  'view.split': ['view', 'Split View'],
  'view.line-64': ['view', '64 Characters'],
  'view.line-72': ['view', '72 Characters'],
  'view.line-80': ['view', '80 Characters'],
  'view.font-mono': ['view', 'iA Writer Mono'],
  'view.font-quattro': ['view', 'iA Writer Quattro'],
  'view.text-larger': ['view', 'Larger Text'],
  'view.text-smaller': ['view', 'Smaller Text'],
};

export function CanvasEditorContent({ docId, onClose }: Props) {
  const stored = docId ? canvasStore.getById(docId) : null;

  const [title,         setTitle]         = useState(stored?.title   ?? '');
  const [content,       setContent]       = useState(stored?.content ?? '');
  const [mode,          setMode]          = useState<EditorMode>('write');
  const [dark,          setDark]          = useState(canvasPrefsStore.get().dark);
  const [tw,            setTw]            = useState(canvasPrefsStore.get().tw);
  const [focusMode,     setFocusMode]     = useState<FocusMode>(canvasPrefsStore.get().focusMode);
  const [syntaxHighlight, setSyntaxHighlight] = useState(canvasPrefsStore.get().syntaxHighlight);
  const [syntaxParts, setSyntaxParts] = useState(canvasPrefsStore.get().syntaxParts);
  const [docType,       setDocType]       = useState<'doc'|'canvas'|'nodes'|'image'|'office'>(() => _infer(stored));
  const [chromeVisible, setChromeVisible] = useState(true);
  const [lineLen,       setLineLen]       = useState<LineLen>(canvasPrefsStore.get().lineLen);
  const [fontSize,      setFontSize]      = useState(canvasPrefsStore.get().fontSize);
  const [font,          setFont]          = useState<FontChoice>(canvasPrefsStore.get().font);
  const [titleEdit,     setTitleEdit]     = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [activeFsFile,  setActiveFsFile]  = useState<FileEntry | null>(null);
  const [editorFade,       setEditorFade]       = useState(1);
  const [canvasEverActive, setCanvasEverActive] = useState(docType === 'canvas');
  const [nodesEverActive,  setNodesEverActive]  = useState(docType === 'nodes');
  const [macTrafficLights, setMacTrafficLights] = useState(false);
  const fullscreen = useIsFullscreen();

  useEffect(() => {
    const api = (window as any).electronAPI;
    setMacTrafficLights(api?.isElectron === true && api?.platform === 'darwin');
  }, []);

  const [activeMenu, _setActiveMenu] = useState<MenuId>(null);
  const activeMenuRef  = useRef<MenuId>(null);
  const editorRef      = useRef<{ view: EditorView } | null>(null);
  const saveRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fsSelectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeEditorRef  = useRef<CanvasNodeEditorRef>(null);
  const menuBarRef     = useRef<HTMLDivElement>(null);
  const hideTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef  = useRef<HTMLInputElement>(null);
  const titleBarRef    = useRef<HTMLDivElement>(null);

  const handleViewportChange = useCallback((vp: { x: number; y: number; zoom: number }) => {
    const el = titleBarRef.current;
    if (!el) return;
    const gap = 24 * vp.zoom;
    const px = ((vp.x % gap) + gap) % gap;
    const py = ((vp.y % gap) + gap) % gap;
    el.style.backgroundPositionX = `${px}px`;
    el.style.backgroundPositionY = `${py - TITLE_H}px`;
    el.style.backgroundSize = `${gap}px ${gap}px`;
  }, []);

  const { libW, doclistW } = useCanvasPanelWidths();
  const sidebarWidth = libW + doclistW;
  const titlebarInsets = getMacTitlebarInsets(macTrafficLights, fullscreen, sidebarOpen);
  const nativeMacChrome = macTrafficLights;
  const titlebarHeight = nativeMacChrome ? MAC_TITLE_H : TITLE_H;
  const chromeHeight = nativeMacChrome ? MAC_TITLE_H : CHROME_H;
  const effectiveChromeVisible = !fullscreen || chromeVisible;
  const effectiveTitlebarHeight = effectiveChromeVisible ? titlebarHeight : 0;
  const effectiveChromeHeight = effectiveChromeVisible ? chromeHeight : 0;
  const macToggleLeft = sidebarOpen
    ? libW - 48
    : (fullscreen ? 8 : MAC_TRAFFIC_LIGHT_INSET + 8);
  const displayTitle = activeFsFile?.name
    ?? `${title || '无标题'}${docType === 'canvas' ? '.excalidraw' : docType === 'nodes' ? '.canvas' : docType === 'doc' ? '.md' : ''}`;

  const P          = dark ? DARK : LIGHT;
  const fontFamily = font === 'mono'
    ? '"iA Writer Mono","Courier New",monospace'
    : '"iA Writer Quattro","Georgia","Times New Roman",serif';

  const words     = content.trim().split(/\s+/).filter(Boolean).length;
  const chars     = content.length;
  const sentences = content.trim() ? (content.match(/[.!?。！？]+/g) ?? []).length : 0;
  const readSec   = Math.round((words / 200) * 60);
  const readMin   = Math.max(1, Math.ceil(readSec / 60));

  /* ── chrome auto-hide ── */
  const showChrome = useCallback(() => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    setChromeVisible(true);
  }, []);

  const setActiveMenu = useCallback((v: MenuId | ((p: MenuId) => MenuId)) => {
    const next = typeof v === 'function' ? v(activeMenuRef.current) : v;
    activeMenuRef.current = next; _setActiveMenu(next);
    if (next !== null) showChrome();
  }, [showChrome]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!fullscreen) return;
    if (e.clientY <= 40) { showChrome(); return; }
    if (activeMenuRef.current) return;
    if (!hideTimerRef.current) {
      hideTimerRef.current = setTimeout(() => {
        if (!activeMenuRef.current) setChromeVisible(false);
        hideTimerRef.current = null;
      }, 1000);
    }
  }, [fullscreen, showChrome]);

  useEffect(() => {
    if (!fullscreen) showChrome();
  }, [fullscreen, showChrome]);

  useEffect(() => { document.addEventListener('mouseleave', showChrome); return () => document.removeEventListener('mouseleave', showChrome); }, [showChrome]);
  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  const save = useCallback((t: string, c: string) => {
    if (!docId) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => canvasStore.update(docId, { title: t, content: c }), 600);
  }, [docId]);

  const onTitleChange = useCallback((v: string) => { setTitle(v); save(v, content); }, [content, save]);
  const onContent     = useCallback((v: string) => {
    setContent(v); save(title, v);
    if (activeFsFile) { fsAdapter.writeFile(activeFsFile, v).catch(() => {}); if (activeFsFile.path) invalidatePrefetch(activeFsFile.path); }
  }, [title, save, activeFsFile]);

  const onFsFileSelect = useCallback((entry: FileEntry, text: string) => {
    if (fsSelectTimer.current) clearTimeout(fsSelectTimer.current);
    setEditorFade(0);
    fsSelectTimer.current = setTimeout(() => {
      fsSelectTimer.current = null;
      setActiveFsFile(entry); setContent(text); setTitle(entry.name.replace(/\.[^.]+$/, ''));
      const t = /\.excalidraw$/i.test(entry.name)?'canvas':/\.canvas$/i.test(entry.name)?'nodes':/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(entry.name)?'image':/\.(docx|xlsx|pptx|pdf)$/i.test(entry.name)?'office':'doc';
      setDocType(t); if(t==='canvas') setCanvasEverActive(true); if(t==='nodes') setNodesEverActive(true);
      if (docId && /\.(md|txt|canvas)$/i.test(entry.name)) canvasStore.update(docId, { content: text });
      setEditorFade(1);
    }, 80);
  }, [docId]);

  const handleCreateFile = useCanvasCreateFile({
    setDocType, setCanvasEverActive, setNodesEverActive,
    setActiveFsFile, setContent, setTitle, onFsFileSelect,
  });

  const handleDocListBack = useCallback(async () => {
    const { navStack } = libraryStore.get();
    if (navStack.length > 0) await libraryStore.popNav(); else libraryStore.clearFolder();
  }, []);

  const handlePrefsChange = useCallback((p: Partial<CanvasPrefs>) => {
    canvasPrefsStore.set(p); if(p.dark!==undefined)setDark(p.dark); if(p.font!==undefined)setFont(p.font as FontChoice); if(p.fontSize!==undefined)setFontSize(p.fontSize); if(p.lineLen!==undefined)setLineLen(p.lineLen as LineLen); if(p.focusMode!==undefined)setFocusMode(p.focusMode as FocusMode); if(p.tw!==undefined)setTw(p.tw); if(p.syntaxHighlight!==undefined)setSyntaxHighlight(p.syntaxHighlight); if(p.syntaxParts!==undefined)setSyntaxParts(p.syntaxParts);
  }, []);

  /* ── extensions ── */
  const extensions = useMemo(() => [
    ...baseExtensions(),
    iaWriterTheme(dark, fontSize, fontFamily),
    ...(focusMode === 'paragraph' ? [focusModeExt()]     : []),
    ...(focusMode === 'sentence'  ? [sentenceFocusExt()] : []),
    ...(tw ? [typewriterExt()] : []),
    ...(syntaxHighlight ? [syntaxHighlightExt(syntaxParts)] : []),
  ], [dark, focusMode, tw, syntaxHighlight, syntaxParts, fontSize, fontFamily]);

  useEffect(() => { if (docId && docType !== (stored?.type ?? 'doc')) canvasStore.update(docId, { type: docType }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sync = () => {
      const d = docId ? canvasStore.getById(docId) : null; if (!d) return;
      setTitle(d.title); setContent(d.content); const t = _infer(d); setDocType(t); if (t !== (d.type ?? 'doc')) canvasStore.update(d.id, { type: t });
    };
    window.addEventListener('canvas-updated', sync); return () => window.removeEventListener('canvas-updated', sync);
  }, [docId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (titleEdit) { setTitleEdit(false); return; } if (activeMenuRef.current) { setActiveMenu(null); return; } onClose(); return; }
      const mod = e.metaKey || e.ctrlKey; if (!mod) return;
      if (!e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setMode(m => m === 'preview' ? 'write' : 'preview'); }
      if (e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setMode(m => m === 'split' ? 'write' : 'split'); }
      if (e.shiftKey && e.key.toLowerCase() === 't') { e.preventDefault(); setTw(v => !v); }
      if (e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); setFocusMode(m => m === 'off' ? 'paragraph' : m === 'paragraph' ? 'sentence' : 'off'); }
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (e.shiftKey) setSyntaxHighlight(value => !value);
        else setFocusMode(value => value === 'off' ? 'sentence' : 'off');
      }
      if (e.key === '=' || e.key === '+') { e.preventDefault(); setFontSize(s => Math.min(24, s + 1)); } if (e.key === '-') { e.preventDefault(); setFontSize(s => Math.max(13, s - 1)); }
    };
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
  }, [onClose, setActiveMenu, titleEdit]);

  useEffect(() => {
    if (!activeMenu) return;
    const fn = (e: MouseEvent) => { if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) setActiveMenu(null); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [activeMenu, setActiveMenu]);

  useEffect(() => { if (titleEdit) titleInputRef.current?.select(); }, [titleEdit]);

  useEffect(() => { const t = setTimeout(() => editorRef.current?.view?.focus(), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { if (docType === 'canvas') setCanvasEverActive(true); if (docType === 'nodes') setNodesEverActive(true); }, [docType]);

  const handleSidebarTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'width') return;
    requestAnimationFrame(() => editorRef.current?.view?.requestMeasure());
  }, []);

  /* ── helpers ── */
  const wrap = useCallback((b: string, a: string) => {
    const view = editorRef.current?.view; if (!view) return;
    const { from, to } = view.state.selection.main; const sel = view.state.sliceDoc(from, to);
    view.dispatch({ changes: { from, to, insert: b + sel + a }, selection: { anchor: from + b.length, head: from + b.length + sel.length } });
    view.focus(); setActiveMenu(null);
  }, [setActiveMenu]);

  const transformSelection = useCallback((
    transform: (source: string) => string,
    expandToLines = false,
  ) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const selection = view.state.selection.main;
    let from = selection.from;
    let to = selection.to;
    if (expandToLines) {
      from = view.state.doc.lineAt(from).from;
      to = view.state.doc.lineAt(to).to;
    }
    const source = view.state.sliceDoc(from, to);
    const insert = transform(source);
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from, head: from + insert.length },
    });
    view.focus();
    setActiveMenu(null);
  }, [setActiveMenu]);

  const nativeFormatActions = useMemo<Record<string, () => void>>(() => {
    const linePrefix = (prefix: string) => () => transformSelection(source =>
      source.split('\n').map(line => `${prefix}${line}`).join('\n'), true);
    const stripBlockStyle = (source: string) => source.replace(
      /^(?:#{1,6}|>|[-+*]|\d+\.|- \[[ xX]\])\s+/gm,
      '',
    );
    return {
      'format.heading-1': linePrefix('# '),
      'format.heading-2': linePrefix('## '),
      'format.heading-3': linePrefix('### '),
      'format.heading-4': linePrefix('#### '),
      'format.heading-5': linePrefix('##### '),
      'format.heading-6': linePrefix('###### '),
      'format.bullet-list': linePrefix('- '),
      'format.numbered-list': () => transformSelection(source =>
        source.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n'), true),
      'format.task-list': linePrefix('- [ ] '),
      'format.blockquote': linePrefix('> '),
      'format.body': () => transformSelection(stripBlockStyle, true),
      'format.indent': linePrefix('  '),
      'format.outdent': () => transformSelection(source => source.replace(/^ {1,2}/gm, ''), true),
      'format.bold': () => wrap('**', '**'),
      'format.italic': () => wrap('*', '*'),
      'format.strikethrough': () => wrap('~~', '~~'),
      'format.highlight': () => wrap('==', '=='),
      'format.code': () => wrap('`', '`'),
      'format.code-block': () => wrap('```\n', '\n```'),
      'format.add-link': () => wrap('[', '](https://)'),
      'format.add-wikilink': () => wrap('[[', ']]'),
      'format.add-footnote': () => wrap('[^', ']'),
      'format.add-content-block': () => wrap('![[', ']]'),
      'format.add-hashtag': () => wrap('#', ''),
      'format.add-date': () => wrap(new Intl.DateTimeFormat('en-CA').format(new Date()), ''),
      'format.add-table': () => wrap('\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n', ''),
      'format.add-toc': () => wrap('\n[TOC]\n', ''),
      'format.add-horizontal-rule': () => wrap('\n---\n', ''),
      'format.add-page-break': () => wrap('\n<div style="page-break-after: always;"></div>\n', ''),
      'format.clear-styles': () => transformSelection(source => stripBlockStyle(source)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/(?:\*\*|__|~~|==|`)/g, '')
        .replace(/\*([^*]+)\*/g, '$1'), true),
    };
  }, [transformSelection, wrap]);

  useEffect(() => {
    // macOS receives these through the native application menu. Windows and
    // the browser shell use the same command table directly so behavior stays identical.
    if (macTrafficLights) return;
    const onFormatShortcut = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      let command: string | undefined;
      if (!event.shiftKey && !event.altKey && /^[1-6]$/.test(key)) command = `format.heading-${key}`;
      else if (key === 'b' && !event.shiftKey) command = 'format.bold';
      else if (key === 'i' && !event.shiftKey) command = 'format.italic';
      else if (key === 'u' && event.shiftKey && !event.altKey) command = 'format.highlight';
      else if (key === 'u' && event.altKey) command = 'format.strikethrough';
      else if (key === 'j' && event.shiftKey) command = 'format.code-block';
      else if (key === 'j') command = 'format.code';
      else if (key === 'k' && event.shiftKey) command = 'format.add-wikilink';
      else if (key === 'k') command = 'format.add-link';
      else if (key === '.' && event.shiftKey) command = 'format.blockquote';
      else if (key === ']') command = 'format.indent';
      else if (key === '[') command = 'format.outdent';
      if (!command) return;
      event.preventDefault();
      nativeFormatActions[command]?.();
    };
    window.addEventListener('keydown', onFormatShortcut);
    return () => window.removeEventListener('keydown', onFormatShortcut);
  }, [macTrafficLights, nativeFormatActions]);

  const setSyntaxEnabled = useCallback((enabled: boolean) => {
    setSyntaxHighlight(enabled);
    canvasPrefsStore.set({ syntaxHighlight: enabled });
    setActiveMenu(null);
  }, [setActiveMenu]);

  const toggleSyntaxPart = useCallback((part: SyntaxPart) => {
    setSyntaxParts(current => {
      const next = { ...current, [part]: !current[part] };
      canvasPrefsStore.set({ syntaxParts: next });
      return next;
    });
    setActiveMenu(null);
  }, [setActiveMenu]);

  const nativeFocusActions = useMemo<Record<string, () => void>>(() => ({
    'focus.toggle': () => setFocusMode(mode => mode === 'off' ? 'sentence' : 'off'),
    'focus.sentence': () => setFocusMode('sentence'),
    'focus.paragraph': () => setFocusMode('paragraph'),
    'focus.typewriter': () => setTw(value => !value),
    'focus.syntax-toggle': () => setSyntaxEnabled(!syntaxHighlight),
    'focus.syntax-adjectives': () => toggleSyntaxPart('adjectives'),
    'focus.syntax-nouns': () => toggleSyntaxPart('nouns'),
    'focus.syntax-adverbs': () => toggleSyntaxPart('adverbs'),
    'focus.syntax-verbs': () => toggleSyntaxPart('verbs'),
    'focus.syntax-conjunctions': () => toggleSyntaxPart('conjunctions'),
  }), [setSyntaxEnabled, syntaxHighlight, toggleSyntaxPart]);

  const { exportMd, importFile, printDoc } = useCanvasFileOps({ title, content, onTitleChange, onContent, setActiveMenu });

  /* ── menus ── */
  const menus = useCanvasMenus({ words, chars, readMin, mode, dark, tw, focusMode,
    syntaxHighlight, syntaxParts, lineLen, font, docType,
    setMode, setDark, setTw, setFocusMode, setSyntaxEnabled, toggleSyntaxPart,
    setLineLen, setFontSize, setFont, setActiveMenu, wrap, importFile, exportMd,
    formatActions: nativeFormatActions,
    printDoc, createFile: handleCreateFile, onClose });

  useEffect(() => {
    const menuApi = (window as any).electronAPI?.menu;
    menuApi?.setState?.({ focusMode, typewriter: tw, syntaxHighlight, syntaxParts });
    canvasPrefsStore.set({ focusMode, tw, syntaxHighlight, syntaxParts });
  }, [focusMode, syntaxHighlight, syntaxParts, tw]);

  useEffect(() => {
    const menuApi = (window as any).electronAPI?.menu;
    if (!menuApi?.onCommand) return;

    return menuApi.onCommand((command: string) => {
      if (command === 'view.toggle-library') {
        setSidebarOpen(open => !open);
        return;
      }

      const nativeFormatAction = nativeFormatActions[command];
      if (nativeFormatAction) {
        nativeFormatAction();
        return;
      }

      const nativeFocusAction = nativeFocusActions[command];
      if (nativeFocusAction) {
        nativeFocusAction();
        return;
      }

      const target = command === 'focus.theme'
        ? menus.find(menu => menu.id === 'focus')?.items.find(item =>
            item !== '---' && (item.label === 'Day Mode' || item.label === 'Night Mode'))
        : (() => {
            const mapping = NATIVE_MENU_TARGETS[command];
            if (!mapping) return undefined;
            const [menuId, label] = mapping;
            return menus.find(menu => menu.id === menuId)?.items.find(item =>
              item !== '---' && item.label === label);
          })();

      if (target && target !== '---' && !target.disabled) target.action?.();
    });
  }, [menus, nativeFocusActions, nativeFormatActions]);

  const chromeStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    transform: effectiveChromeVisible ? 'translateY(0)' : `translateY(-${chromeHeight + 4}px)`,
    opacity:   effectiveChromeVisible ? 1 : 0,
    transition: effectiveChromeVisible
      ? 'transform 0.24s cubic-bezier(0.16,1,0.3,1),opacity 0.18s ease'
      : 'transform 0.3s cubic-bezier(0.55,0,1,0.45),opacity 0.22s ease',
    pointerEvents: effectiveChromeVisible ? 'auto' : 'none',
  };

  return createPortal(
    <div className="fixed inset-0 z-50" style={{ background: docType === 'nodes' ? '#EEEDF6' : P.bg, color:P.fg, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      onClick={() => setActiveMenu(null)} onMouseMove={handleMouseMove}>

      <div style={{ position:'absolute', inset:0, overflow:'hidden', display:'flex' }}>
        {/* One dock owns both navigation columns.  A single width transition
            avoids two competing reflows and keeps the editor's motion coherent. */}
        <div className="iwriter-sidebar-dock"
          data-open={sidebarOpen ? 'true' : 'false'}
          aria-hidden={!sidebarOpen}
          onTransitionEnd={handleSidebarTransitionEnd}
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}>
          <div className="iwriter-sidebar-dock-content" data-open={sidebarOpen ? 'true' : 'false'}
            style={{ width: sidebarWidth }}>
            <CanvasLibrary open P={P} dark={dark} onSettings={() => setSettingsOpen(true)}
              nodesMode={docType === 'nodes'}
              titlebarInset={titlebarInsets.library} titlebarHeight={effectiveTitlebarHeight}
              nativeMacChrome={nativeMacChrome} />
            <CanvasDocList open onFileSelect={onFsFileSelect} P={P} dark={dark}
              onBack={handleDocListBack} onNew={() => handleCreateFile('doc')} nodesMode={docType === 'nodes'}
              titlebarHeight={effectiveTitlebarHeight} nativeMacChrome={nativeMacChrome} />
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', height:'100%' }}>
          <div style={{ display: docType === 'doc' ? 'flex' : 'none', width:'100%', height:'100%' }}>
            <CanvasWriterPane content={content} onContent={onContent} extensions={extensions}
              P={P} mode={mode} fontFamily={fontFamily} fontSize={fontSize} dark={dark}
              lineLen={lineLen} editorFade={editorFade} editorRef={editorRef}
              topInset={effectiveChromeHeight + (effectiveChromeHeight ? 1 : 0)} />
          </div>
          {docId && canvasEverActive && (
            <div style={{ visibility: docType === 'canvas' ? 'visible' : 'hidden', pointerEvents: docType === 'canvas' ? 'auto' : 'none', position: 'absolute', inset: 0, paddingTop: effectiveChromeHeight + (effectiveChromeHeight ? 1 : 0), transition: 'padding-top 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
              <CanvasDrawEditor docId={docId} dark={dark} />
            </div>
          )}
          {docId && nodesEverActive && (
            <div style={{ visibility: docType === 'nodes' ? 'visible' : 'hidden', pointerEvents: docType === 'nodes' ? 'auto' : 'none', position: 'absolute', inset: 0, display: 'flex' }}>
              <CanvasNodeEditor key={activeFsFile?.path ?? docId} ref={nodeEditorRef} docId={docId} dark={dark} onViewportChange={handleViewportChange} />
            </div>
          )}
          <div style={{ display: docType === 'image' ? 'flex' : 'none', width:'100%', height:'100%', paddingTop: effectiveChromeHeight, transition: 'padding-top 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
            {activeFsFile && <ImageViewer entry={activeFsFile} P={P} />}
          </div>
          <div style={{ display: docType === 'office' ? 'flex' : 'none', width:'100%', height:'100%', paddingTop: effectiveChromeHeight, transition: 'padding-top 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
            {activeFsFile && <OfficeViewer entry={activeFsFile} P={P} dark={dark} />}
          </div>

          {/* The titlebar lives inside the flexing main surface, so it follows
              the dock naturally instead of running a second left animation. */}
          {isElectron && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0,
              height: titlebarHeight, zIndex: 5,
              WebkitAppRegion: 'drag', pointerEvents: 'none' } as React.CSSProperties} />
          )}

          <div style={chromeStyle}>
            <CanvasChrome title={title} displayTitle={displayTitle} titleEdit={titleEdit} onTitleChange={onTitleChange}
              setTitleEdit={setTitleEdit} titleInputRef={titleInputRef}
              menus={menus} activeMenu={activeMenu} setActiveMenu={setActiveMenu}
              mode={mode} setMode={setMode} docType={docType}
              onClose={onClose}
              sidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen(o => !o)}
              P={P} dark={dark} onMouseEnter={showChrome} menuBarRef={menuBarRef}
              titleBarRef={titleBarRef} trafficLightInset={titlebarInsets.chrome}
              titlebarHeight={titlebarHeight} nativeMacChrome={nativeMacChrome} />
          </div>

          <div style={{ position:'absolute', top:0, left:0, right:0, height:8, zIndex:30,
            pointerEvents: effectiveChromeVisible ? 'none' : 'auto' }} onMouseEnter={showChrome} />
        </div>
      </div>

      {/* One persistent macOS toggle follows the dock. It is never remounted,
          so pointer feedback and icon position stay continuous. */}
      {nativeMacChrome && (
        <button type="button" className="iwriter-sidebar-toggle"
          data-theme={dark ? 'dark' : 'light'}
          aria-label={sidebarOpen ? 'Hide Library' : 'Show Library'}
          aria-expanded={sidebarOpen}
          title={sidebarOpen ? 'Hide Library' : 'Show Library'}
          onMouseDown={e => e.preventDefault()}
          onClick={e => { e.stopPropagation(); setSidebarOpen(open => !open); }}
          style={{
            left: macToggleLeft,
            top: effectiveChromeVisible ? (titlebarHeight - 40) / 2 : -44,
            opacity: effectiveChromeVisible ? 1 : 0,
            pointerEvents: effectiveChromeVisible ? 'auto' : 'none',
            color: P.menuFg,
            background: dark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.48)',
            borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,36,0.085)',
          } as React.CSSProperties}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35">
            <rect x="1.5" y="2" width="13" height="12" rx="2" />
            <path d="M6 2v12" />
          </svg>
        </button>
      )}

      {docType === 'doc' && <CanvasStatsPill words={words} chars={chars} sentences={sentences} readSec={readSec} P={P} dark={dark} />}
      {settingsOpen && <CanvasSettings prefs={canvasPrefsStore.get()} onChange={handlePrefsChange} onClose={() => setSettingsOpen(false)} P={P} dark={dark} />}
    </div>,
    document.body
  );
}
