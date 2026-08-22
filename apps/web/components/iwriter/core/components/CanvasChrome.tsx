/**
 * CanvasChrome — 编辑区顶栏（iA Writer 精确复刻）
 * Library/DocList 头部已移入各自面板，Chrome 只负责编辑区
 */
import { useRef } from 'react';
import { Dropdown } from './CanvasEditorUI';
import { WinCtrlButton, SidebarIcon, PreviewIcon } from '../gsyen-designer';
import { useIsMaximized } from '../hooks/useIsMaximized';
import {
  Palette, MenuSpec, MenuId, EditorMode,
  TITLE_H, MENU_H, SYS_FONT, isElectron,
} from './CanvasEditorTypes';

interface Props {
  title: string; titleEdit: boolean;
  onTitleChange: (v: string) => void;
  setTitleEdit:  (v: boolean) => void;
  titleInputRef: React.RefObject<HTMLInputElement>;
  menus:         MenuSpec[];
  activeMenu:    MenuId;
  setActiveMenu: (v: MenuId | ((p: MenuId) => MenuId)) => void;
  mode:          EditorMode;
  setMode:       (m: EditorMode | ((p: EditorMode) => EditorMode)) => void;
  docType:       'doc' | 'canvas' | 'nodes' | 'image' | 'office';
  onAddCard?:    () => void;
  onClose:       () => void;
  sidebarOpen:    boolean;
  onSidebarToggle:() => void;
  P: Palette; dark: boolean;
  onMouseEnter: () => void;
  menuBarRef:   React.RefObject<HTMLDivElement>;
  titleBarRef?: React.RefObject<HTMLDivElement>;
  trafficLightInset: number;
  titlebarHeight?: number;
  nativeMacChrome?: boolean;
}

export function CanvasChrome({
  title, titleEdit, onTitleChange, setTitleEdit, titleInputRef,
  menus, activeMenu, setActiveMenu, mode, setMode, docType,
  onClose,
  sidebarOpen, onSidebarToggle,
  P, dark, onMouseEnter, menuBarRef, titleBarRef,
  trafficLightInset, titlebarHeight = TITLE_H, nativeMacChrome = false,
}: Props) {
  const stopProp  = (e: React.MouseEvent) => e.stopPropagation();
  const maximized   = useIsMaximized();
  const electronApi = typeof window === 'undefined'
    ? undefined
    : (window as any).electronAPI;
  const desktopWindow = electronApi?.window;
  const showWindowsControls = electronApi?.platform === 'win32';
  const nodesMode   = docType === 'nodes';
  const NB  = '#EEEDF6';
  const NTL = '#3D3D3D';
  const NDM = '#888';
  const NB_STAR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M 12,10 A 2,2 0 0 0 14,12 A 2,2 0 0 0 12,14 A 2,2 0 0 0 10,12 A 2,2 0 0 0 12,10 Z' fill='%23C8C7D6'/%3E%3C/svg%3E")`;

  const nodrag = isElectron ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : {};
  const drag   = isElectron ? { WebkitAppRegion: 'drag'    } as React.CSSProperties : {};

  const iconBtn: React.CSSProperties = {
    padding: 4, background: 'transparent', border: 'none', cursor: 'pointer',
    color: P.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    ...nodrag,
  };

  return (
    <div onMouseEnter={onMouseEnter}>

      {/* ══ Row 1: Title bar ══════════════════════════════════════════════════ */}
      <div ref={titleBarRef} style={{ height: titlebarHeight, background: nodesMode ? 'transparent' : (dark ? '#1A1A1A' : P.chrome),
        display: 'flex', alignItems: 'center',
        paddingLeft: trafficLightInset,
        borderBottom: nativeMacChrome ? `0.5px solid ${P.border}` : 'none',
        transition: 'padding-left 0.22s cubic-bezier(0.4,0,0.2,1)', ...drag }}>

        {/* [□] sidebar toggle */}
        {!(nativeMacChrome && sidebarOpen) && <button onClick={e => { e.stopPropagation(); onSidebarToggle(); }}
          style={{ width: nativeMacChrome ? 40 : 42, height: nativeMacChrome ? 40 : '100%',
            marginLeft: nativeMacChrome ? 8 : 0, borderRadius: nativeMacChrome ? 20 : 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: nodesMode ? NTL : (sidebarOpen ? P.menuFgHover : P.menuFg),
            background: nativeMacChrome
              ? (dark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.46)')
              : sidebarOpen ? `${P.fg}0A` : 'transparent',
            border: nativeMacChrome ? `1px solid ${dark ? 'rgba(255,255,255,0.11)' : 'rgba(36,36,36,0.09)'}` : 'none',
            cursor: 'pointer', flexShrink: 0, ...nodrag }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = P.menuFgHover}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = nodesMode ? NTL : (sidebarOpen ? P.menuFgHover : P.menuFg)}>
          <SidebarIcon />
        </button>}

        {/* Title */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} onClick={stopProp}>
          {titleEdit ? (
            <input ref={titleInputRef} value={title} onChange={e => onTitleChange(e.target.value)}
              onBlur={() => setTitleEdit(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setTitleEdit(false); }}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: SYS_FONT,
                fontSize: 13, color: P.fg, textAlign: 'center', width: '100%', maxWidth: 440, ...nodrag }} />
          ) : (
            <span title="双击编辑标题" onDoubleClick={() => setTitleEdit(true)}
              style={{ fontFamily: SYS_FONT, fontSize: 14, fontWeight: 500, color: nodesMode ? NTL : P.menuFg,
                userSelect: 'none', letterSpacing: '0.01em', cursor: 'text', maxWidth: 440,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || '无标题'}{docType === 'canvas' ? '.excalidraw' : docType === 'nodes' ? '.canvas' : docType === 'doc' ? '.md' : ''}&nbsp;— iWriter by GyenBox
            </span>
          )}
        </div>

        {/* Windows uses GSYEN controls; macOS uses its native traffic lights. */}
        <div className="flex items-center" style={nodrag}>
          {nativeMacChrome && docType === 'doc' && <>
            <button title="Change editor layout" aria-label="Change editor layout"
              onClick={() => setMode(m => m === 'write' ? 'split' : m === 'split' ? 'preview' : 'write')}
              style={{ height: 40, minWidth: 68, padding: '0 11px', marginRight: 8, borderRadius: 20,
                border: `1px solid ${dark ? 'rgba(255,255,255,0.11)' : 'rgba(36,36,36,0.09)'}`,
                background: dark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.46)',
                color: mode !== 'write' ? P.accent : P.menuFg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
              <svg width="17" height="15" viewBox="0 0 17 15" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
                <path d="M2 3h10M2 7.5h13M2 12h8" />
              </svg>
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1L4 4L7 1" />
              </svg>
            </button>
            <button title="Preview (Ctrl+P)" aria-label="Preview"
              onClick={() => setMode(m => m === 'preview' ? 'write' : 'preview')}
              style={{ width: 40, height: 40, padding: 0, marginRight: 8, borderRadius: 20,
                border: `1px solid ${dark ? 'rgba(255,255,255,0.11)' : 'rgba(36,36,36,0.09)'}`,
                background: dark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.46)',
                color: mode === 'preview' ? P.accent : P.menuFg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer' }}>
              <PreviewIcon />
            </button>
          </>}
          {showWindowsControls && <>
            <WinCtrlButton action="minimize" dark={dark}
              onClick={() => desktopWindow.minimize()} title="Minimize" />
            <WinCtrlButton action="maximize" dark={dark} maximized={maximized}
              onClick={() => desktopWindow.maximize()} title={maximized ? 'Restore' : 'Maximize'} />
            <WinCtrlButton action="close" dark={dark} redClose
              onClick={() => desktopWindow.close()} title="Close iWriter" />
          </>}
          {!desktopWindow && <WinCtrlButton action="close" dark={dark}
            onClick={onClose} title="返回 iWriter 主页  Esc" />}
        </div>
      </div>

      {/* ══ Row 2: Menu bar ═══════════════════════════════════════════════════ */}
      {docType === 'doc' && !nativeMacChrome && (
        <div ref={menuBarRef} onClick={stopProp}
          style={{ height: MENU_H, background: P.chrome, display: 'flex', alignItems: 'stretch',
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'}` }}>
          {menus.map(menu => (
            <div key={menu.id as string} style={{ position: 'relative' }}>
              <button style={{ height: '100%', padding: '0 11px', fontFamily: SYS_FONT, fontSize: 14,
                fontWeight: 500, color: activeMenu === menu.id ? P.menuFgHover : P.menuFg,
                background: activeMenu === menu.id ? (dark ? '#2E2A2A' : '#E2E2E2') : 'transparent',
                border: 'none', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { if (activeMenu !== null) setActiveMenu(menu.id); (e.currentTarget as HTMLElement).style.color = P.menuFgHover; }}
                onMouseLeave={e => { if (activeMenu !== menu.id) (e.currentTarget as HTMLElement).style.color = P.menuFg; }}
                onClick={e => { e.stopPropagation(); setActiveMenu(a => a === menu.id ? null : menu.id); }}>
                {menu.label}
              </button>
              {activeMenu === menu.id && <Dropdown items={menu.items} P={P} dark={dark} />}
            </div>
          ))}
          {/* ▷ preview toggle */}
          <button title="Preview (Ctrl+P)" onClick={() => setMode(m => m === 'preview' ? 'write' : 'preview')}
            style={{ width: 40, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: mode !== 'write' ? P.accent : P.menuFg, background: 'transparent',
              border: 'none', cursor: 'pointer', transition: 'color 0.1s', marginLeft: 'auto' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = P.menuFgHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = mode !== 'write' ? P.accent : P.menuFg}>
            <PreviewIcon />
          </button>
        </div>
      )}

      {/* ══ Non-doc action bar ════════════════════════════════════════════════ */}
      {docType === 'canvas' && !nativeMacChrome && (
        <div onClick={stopProp}
          style={{ height: MENU_H, background: nodesMode ? NB : (dark ? '#1A1A1A' : P.chrome),
            display: 'flex', alignItems: 'center', padding: '0 12px',
            borderBottom: nodesMode ? 'none' : `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'}` }}>
          {!nodesMode && (
            <span style={{ fontFamily: SYS_FONT, fontSize: 11, color: P.dim }}>
              {docType === 'canvas' ? 'Whiteboard · Excalidraw' : 'Office Viewer · Word / Excel / PDF'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
