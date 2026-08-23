/** CanvasEditorUI — Dropdown + WinCtrl（模块层定义，避免 render 时重建组件类型） */
import { useState } from 'react';
import { Palette, MenuItem, SYS_FONT } from './CanvasEditorTypes';
export { WinCtrlButton as WinCtrl } from '../gsyen-designer';

interface DropdownProps {
  items: (MenuItem | '---')[];
  P: Palette; dark: boolean;
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
              <span aria-hidden style={{ width: 20, flexShrink: 0, textAlign: 'center',
                color: item.checked ? P.menuFgHover : (item.color ?? P.menuFg),
                fontSize: item.icon?.length && item.icon.length > 1 ? 10 : 15,
                fontWeight: item.icon === 'B' ? 750 : 550, lineHeight: 1 }}>
                {item.checked !== undefined ? (item.checked ? '✓' : '') : (item.icon ?? '')}
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
