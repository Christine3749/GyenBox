import { SYS_FONT, STATUS_H, type Palette } from './CanvasEditorTypes';

export type StatKey = 'chars' | 'words' | 'sentences' | 'readtime';

interface Props {
  words: number; chars: number; sentences: number; readSec: number;
  goal: number; setGoal: (v: number) => void;
  selected: StatKey; setSelected: (k: StatKey) => void;
  P: Palette; dark: boolean;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m} min, ${s}sec` : `0 min, ${s}sec`;
}

function rowLabel(key: StatKey, p: Props) {
  if (key === 'chars')     return `${p.chars} Chars`;
  if (key === 'words')     return `${p.words} Words`;
  if (key === 'sentences') return `${p.sentences} Sentences`;
  return fmtTime(p.readSec) + ' Reading Time';
}

export function statButtonLabel(key: StatKey, p: Omit<Props, 'P'|'dark'|'setGoal'|'setSelected'>) {
  return rowLabel(key, p as Props);
}

const KEYS: StatKey[] = ['chars', 'words', 'sentences', 'readtime'];

export function CanvasStatsPanel(props: Props) {
  const { goal, setGoal, selected, setSelected, P, dark } = props;

  const panelBg  = dark ? 'rgba(30,30,30,0.78)' : 'rgba(250,250,250,0.78)';
  const rowHover = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const shadow   = dark
    ? '0 -8px 32px rgba(0,0,0,0.45)'
    : '0 -8px 32px rgba(0,0,0,0.09)';

  return (
    <div style={{
      position: 'absolute', bottom: STATUS_H + 24, right: 0, zIndex: 25,
      background: panelBg, borderRadius: 8,
      boxShadow: shadow,
      border: `0.5px solid ${P.border}`,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      overflow: 'hidden', minWidth: 268,
      animation: 'stats-curtain 0.32s cubic-bezier(0.34,1.56,0.64,1)',
      transformOrigin: 'bottom center',
    }}>
      <style>{`
        @keyframes stats-curtain {
          from { opacity: 0; transform: translateY(14px) scaleY(0.90); }
          to   { opacity: 1; transform: translateY(0)    scaleY(1);    }
        }
      `}</style>

      {KEYS.map(k => (
        <div key={k} onClick={() => setSelected(k)}
          style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
            transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = rowHover}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <span style={{ width: 13, fontSize: 11, color: P.accent, flexShrink: 0 }}>
            {selected === k ? '✓' : ''}
          </span>
          <span style={{ fontFamily: SYS_FONT, fontSize: 14, color: P.fg, letterSpacing: '-0.01em' }}>
            {rowLabel(k, props)}
          </span>
        </div>
      ))}

      <div style={{ borderTop: `0.5px solid ${P.border}`, padding: '11px 20px',
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: SYS_FONT, fontSize: 14, color: P.fg }}>Goal</span>
        <input type="number" value={goal}
          onChange={e => setGoal(Math.max(1, Number(e.target.value)))}
          onClick={e => e.stopPropagation()}
          style={{ width: 72, padding: '4px 10px', borderRadius: 4, textAlign: 'center' as const,
            border: `0.5px solid ${P.border}`, background: dark ? '#1A1A1A' : '#F8F8F8',
            color: P.fg, fontFamily: SYS_FONT, fontSize: 14, outline: 'none' }} />
        <span style={{ fontFamily: SYS_FONT, fontSize: 14, color: P.fg }}>Words</span>
      </div>
    </div>
  );
}
