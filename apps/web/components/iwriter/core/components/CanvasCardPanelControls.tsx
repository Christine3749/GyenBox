import { useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { DIVIDER, FONT, HOVER, INK, LATIN, MUTED } from './CanvasCardPanelTokens';

export function stopPress(e: PointerEvent<HTMLElement>, action?: () => void) {
  e.preventDefault();
  e.stopPropagation();
  action?.();
}

export function Divider() {
  return <div style={{ height: 1, margin: '9px 26px', background: DIVIDER }} />;
}

export function MenuRow({ icon, label, shortcut, children, danger, active, onPress }: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  children?: ReactNode;
  danger?: boolean;
  active?: boolean;
  onPress?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const isAction = Boolean(onPress);
  const rowStyle: CSSProperties = {
    width: 'calc(100% - 36px)',
    margin: '0 18px',
    height: 45,
    display: 'grid',
    gridTemplateColumns: '26px 1fr auto',
    alignItems: 'center',
    columnGap: 10,
    padding: '0 12px',
    border: 0,
    borderRadius: 12,
    outline: 'none',
    cursor: isAction ? 'pointer' : 'default',
    background: active || (hover && isAction) ? HOVER : 'transparent',
    boxShadow: active || (hover && isAction) ? '0 1px 0 rgba(255,255,255,0.82) inset, 0 1px 5px rgba(38,36,52,0.055)' : 'none',
    fontFamily: FONT,
    boxSizing: 'border-box',
    transition: 'background 0.12s, box-shadow 0.12s',
  };
  const content = (
    <>
      <span style={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: danger ? 'rgba(178, 35, 48, 0.78)' : 'rgba(24,27,35,0.50)',
      }}>
        {icon}
      </span>
      <span style={{
        minWidth: 0,
        color: danger ? '#B42330' : INK,
        fontSize: 15.5,
        lineHeight: 1,
        fontWeight: 520,
        letterSpacing: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
        color: danger ? 'rgba(178,35,48,0.44)' : MUTED,
        fontFamily: LATIN,
        fontSize: 15,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}>
        {children}
        {shortcut && <span>{shortcut}</span>}
      </span>
    </>
  );

  if (!isAction) {
    return (
      <div className="nodrag nopan" onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} style={rowStyle}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="nodrag nopan"
      onPointerDown={e => stopPress(e, onPress)}
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={rowStyle}
    >
      {content}
    </button>
  );
}

export function Toggle({ active, onChange }: { active: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      className="nodrag nopan"
      onPointerDown={e => stopPress(e, () => onChange(!active))}
      onClick={e => e.stopPropagation()}
      style={{
        width: 48,
        height: 28,
        padding: 3,
        border: 0,
        borderRadius: 999,
        background: active ? 'rgba(95,116,196,0.42)' : 'rgba(24,27,35,0.16)',
        boxShadow: 'inset 0 1px 2px rgba(38,36,52,0.12), 0 1px 0 rgba(255,255,255,0.72)',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <span style={{
        display: 'block',
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 1px 3px rgba(38,36,52,0.18)',
        transform: active ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.14s',
      }} />
    </button>
  );
}

export function Segment({ options, value, onChange, compact }: {
  options: [string, string][];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: compact ? 9 : 11, background: 'rgba(24,27,35,0.075)', boxShadow: 'inset 0 1px 2px rgba(38,36,52,0.06)' }}>
      {options.map(([label, val]) => {
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            className="nodrag nopan"
            onPointerDown={e => stopPress(e, () => onChange(val))}
            onClick={e => e.stopPropagation()}
            style={{
              minWidth: compact ? 44 : 58,
              height: compact ? 26 : 30,
              padding: '0 10px',
              border: 0,
              borderRadius: compact ? 7 : 9,
              background: active ? 'rgba(255,255,255,0.78)' : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(38,36,52,0.07), inset 0 1px 0 rgba(255,255,255,0.82)' : 'none',
              color: active ? INK : MUTED,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: FONT,
              fontSize: compact ? 12 : 13,
              fontWeight: active ? 620 : 510,
            }}
          >
            {label}
          </button>
        );
      })}
    </span>
  );
}
