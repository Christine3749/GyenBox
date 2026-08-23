/** CanvasEditorUI — Dropdown + WinCtrl（模块层定义，避免 render 时重建组件类型） */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Palette, MenuItem, SYS_FONT } from './CanvasEditorTypes';
export { WinCtrlButton as WinCtrl } from '../gsyen-designer';

interface DropdownProps {
  items: (MenuItem | '---')[];
  P: Palette; dark: boolean;
}

function FormatGlyph({ name }: { name: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactNode> = {
    'format-headings': <><rect x="1.5" y="3" width="13" height="10" rx="5"/><path d="M4.5 10V6m0 2h3m0-2v4m2.2-2.8 1.5-1v3.8m-1.5 0h3"/></>,
    'format-lists': <><circle cx="2.5" cy="4" r=".7" fill="currentColor" stroke="none"/><circle cx="2.5" cy="8" r=".7" fill="currentColor" stroke="none"/><circle cx="2.5" cy="12" r=".7" fill="currentColor" stroke="none"/><path d="M5 4h8.5M5 8h8.5M5 12h8.5"/></>,
    'format-blockquote': <path d="M2.2 5.7h3.3v2.6H3.2v2h2.3M8 5.7h5.3v2.6H8.9v2h4.4M2.2 13h11.1"/>,
    'format-body': <path d="M2 3.2h12M2 6.4h12M2 9.6h12M2 12.8h12"/>,
    'format-structure': <><circle cx="2.3" cy="3.5" r=".7" fill="currentColor" stroke="none"/><circle cx="4.4" cy="7.7" r=".7" fill="currentColor" stroke="none"/><circle cx="6.5" cy="11.9" r=".7" fill="currentColor" stroke="none"/><path d="M4.8 3.5h8.7M6.9 7.7h6.6M9 11.9h4.5M2.3 6v2.1l2.1 1.3"/></>,
    'format-code': <path d="M5.2 2.5c-1.7 0-2 .8-2 2.1v1.2c0 1-.5 1.7-1.5 1.7 1 0 1.5.7 1.5 1.7v1.2c0 1.3.3 2.1 2 2.1M10.8 2.5c1.7 0 2 .8 2 2.1v1.2c0 1 .5 1.7 1.5 1.7-1 0-1.5.7-1.5 1.7v1.2c0 1.3-.3 2.1-2 2.1"/>,
    'format-code-block': <><rect x="2" y="2.3" width="12" height="11.4" rx="1.5"/><path d="M6 5.2c-1 0-1.2.5-1.2 1.2v.4c0 .6-.3 1-.9 1 .6 0 .9.4.9 1v.4c0 .7.2 1.2 1.2 1.2M10 5.2c1 0 1.2.5 1.2 1.2v.4c0 .6.3 1 .9 1-.6 0-.9.4-.9 1v.4c0 .7-.2 1.2-1.2 1.2"/></>,
    'format-link': <path d="M6.5 10.4 5.1 11.8a2.7 2.7 0 0 1-3.8-3.8l2.2-2.2A2.7 2.7 0 0 1 7.3 5m2.2.6 1.4-1.4A2.7 2.7 0 1 1 14.7 8l-2.2 2.2a2.7 2.7 0 0 1-3.8.8M5.8 8h4.4"/>,
    'format-wikilink': <path d="M6.3 10.6 5 11.9A2.6 2.6 0 0 1 1.3 8.2l2.1-2.1A2.6 2.6 0 0 1 7 5.8m2.7-.4L11 4.1a2.6 2.6 0 1 1 3.7 3.7l-2.1 2.1a2.6 2.6 0 0 1-3.6.3M5.7 8h4.6M8 5.7v4.6"/>,
    'format-content-block': <><rect x="3" y="1.8" width="10" height="12.4" rx="1.4"/><path d="M5.5 5h5M5.5 7.6h5M5.5 10.2h3.2"/></>,
    'format-date': <><rect x="2" y="3.2" width="12" height="10.5" rx="1.5"/><path d="M2 6.2h12M5 1.8v3M11 1.8v3M4.5 8.6h1m2 0h1m2 0h1m-7 2.6h1m2 0h1m2 0h1"/></>,
    'format-table': <><rect x="1.8" y="2.5" width="12.4" height="11" rx="1.3"/><path d="M1.8 6.2h12.4M1.8 9.8h12.4M6 2.5v11"/></>,
    'format-toc': <><rect x="2" y="2.2" width="12" height="11.6" rx="1.4"/><circle cx="4.4" cy="5" r=".55" fill="currentColor" stroke="none"/><circle cx="4.4" cy="8" r=".55" fill="currentColor" stroke="none"/><circle cx="4.4" cy="11" r=".55" fill="currentColor" stroke="none"/><path d="M6.4 5h5.2M6.4 8h5.2M6.4 11h4"/></>,
    'format-rule': <><rect x="3" y="1.5" width="10" height="13" rx="1.5"/><path d="M5.2 8h5.6"/></>,
    'format-page-break': <path d="M1.5 5h3V2.5M1.5 5 5 1.5M3.5 8H1.8v4.5h3.7M6.5 3h7v10h-7zM6.5 8h7"/>,
    'format-clear': <><rect x="2.3" y="2.3" width="11.4" height="11.4" rx="1.5"/><path d="m5.4 5.4 5.2 5.2m0-5.2-5.2 5.2"/></>,
  };
  if (name === 'format-bold' || name === 'format-italic' || name === 'format-strikethrough' || name === 'format-highlight' || name === 'format-footnote' || name === 'format-hashtag') {
    const value = name === 'format-bold' ? 'B' : name === 'format-italic' ? 'I' : name === 'format-strikethrough' ? 'S' : name === 'format-highlight' ? 'A' : name === 'format-footnote' ? 'A¹' : '#';
    return <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden>
      <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize={name === 'format-hashtag' ? 14 : 11} fontWeight="700" fontStyle={name === 'format-italic' ? 'italic' : undefined}>{value}</text>
      {name === 'format-strikethrough' && <path d="M3 8h10" stroke="currentColor" strokeWidth="1.3"/>}
      {name === 'format-highlight' && <rect x="3" y="12.5" width="10" height="2.2" rx=".5" fill="#D7A52E"/>}
    </svg>;
  }
  return <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden {...common}>{paths[name]}</svg>;
}

function MenuGlyph({ item, P }: { item: MenuItem; P: Palette }) {
  if (item.checked !== undefined) {
    return <>{item.checked ? '✓' : item.indicator === 'dash' ? '−' : ''}</>;
  }
  if (item.icon === 'focus-lines') {
    return <svg width="17" height="15" viewBox="0 0 17 15" fill="none" aria-hidden>
      <path d="M2 2.5h11M2 5.5h8M2 8.5h12M2 11.5h7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      <path d="M14.5 5.7h1.5M14.5 8.7h1" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity=".65"/>
    </svg>;
  }
  if (item.icon === 'syntax-grid') {
    const colors = ['#D7A34D', '#EA9473', '#CB8FBC', '#76A7D0', '#8DBB70'];
    return <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden>
      {colors.map((color, index) => <g key={color} fill={color}>
        <circle cx="2.2" cy={2.5 + index * 3} r="1"/>
        <rect x="5" y={1.65 + index * 3} width={index % 2 ? 7.3 : 9.5} height="1.7" rx=".85"/>
      </g>)}
    </svg>;
  }
  if (item.icon === 'style-check') {
    return <span style={{ color: P.dim, fontSize: 10, textDecoration: 'line-through', letterSpacing: '-.4px' }}>abc</span>;
  }
  if (item.icon === 'authors') {
    return <span style={{ color: P.menuFg, fontSize: 10, textDecoration: 'underline', letterSpacing: '-.4px' }}>abc</span>;
  }
  if (item.icon?.startsWith('format-')) return <FormatGlyph name={item.icon} />;
  return <>{item.icon ?? ''}</>;
}

export function Dropdown({ items, P, dark }: DropdownProps) {
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 300,
      background: P.menuBg, border: `1px solid ${P.menuBorder}`,
      borderRadius: 10, minWidth: 270, padding: '6px 0', marginTop: 4,
      backdropFilter: 'blur(28px) saturate(135%)',
      boxShadow: dark
        ? '0 18px 44px rgba(0,0,0,0.58),0 2px 8px rgba(0,0,0,0.42)'
        : '0 18px 44px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.08)',
    }}>
      {items.map((item, i) =>
        item === '---'
          ? <div key={i} style={{ height: 1, background: P.menuSep, margin: '2px 12px' }} />
          : (
            <div key={i}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: 'clamp(24px, 3.1vh, 30px)', margin: '0 6px', padding: '0 10px', borderRadius: 6,
                fontSize: 14, fontWeight: 500, fontFamily: SYS_FONT,
                color: item.disabled ? P.dim : P.menuFgHover,
                cursor: item.disabled ? 'default' : 'pointer',
                userSelect: 'none', position: 'relative', gap: 10,
              }}
              onClick={e => {
                e.stopPropagation();
                if (!item.disabled && !item.submenu && item.action) item.action();
                if (item.submenu) setOpenSubmenu(open => open === i ? null : i);
              }}
              onMouseEnter={e => {
                if (!item.disabled) (e.currentTarget as HTMLElement).style.background = P.menuHover;
                setOpenSubmenu(item.submenu ? i : null);
              }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <span aria-hidden style={{ width: 20, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                color: item.checked ? P.menuFgHover : (item.color ?? P.menuFg),
                fontSize: item.icon?.length && item.icon.length > 1 ? 10 : 15,
                fontWeight: item.icon === 'B' ? 750 : 550, lineHeight: 1 }}>
                <MenuGlyph item={item} P={P} />
              </span>
              <span style={{ flex: 1, whiteSpace: 'nowrap', color: item.color }}>{item.label}</span>
              {item.shortcut && (
                <span style={{ color: P.dim, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {item.shortcut}
                </span>
              )}
              {item.submenu && <span aria-hidden style={{ color: P.dim, fontSize: 17, lineHeight: 1 }}>›</span>}
              {item.submenu && openSubmenu === i && (
                <div style={{ position: 'absolute', left: 'calc(100% + 5px)', top: -7, zIndex: 310 }}>
                  <Dropdown items={item.submenu} P={P} dark={dark} />
                </div>
              )}
            </div>
          )
      )}
    </div>
  );
}
