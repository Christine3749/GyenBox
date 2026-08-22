import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Code2,
  FileText,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  ListChecks,
  Quote,
  Sigma,
  Table2,
} from 'lucide-react';
import type { CardData, ContentType, StatusColor } from './CanvasCardData';
import { CT_STATUS } from './CanvasCardData';
import { stopPress } from './CanvasCardPanelControls';
import { ACCENTS, BLUE, FONT, HOVER, INK, LATIN, MUTED } from './CanvasCardPanelTokens';

const CONTENT_TYPES: { v: ContentType; label: string; icon: ReactNode }[] = [
  { v: 'note', label: 'Note', icon: <FileText /> },
  { v: 'code', label: 'Code', icon: <Code2 /> },
  { v: 'image', label: 'Image', icon: <ImageIcon /> },
  { v: 'link', label: 'Link', icon: <LinkIcon /> },
  { v: 'task', label: 'Task', icon: <ListChecks /> },
  { v: 'table', label: 'Table', icon: <Table2 /> },
  { v: 'math', label: 'Math', icon: <Sigma /> },
  { v: 'quote', label: 'Quote', icon: <Quote /> },
];

export function Swatches({ data, up }: { data: CardData; up: (p: Partial<CardData>) => void }) {
  return (
    <div style={{ height: 42, display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 0 56px' }}>
      {ACCENTS.map(a => {
        const active = (data.cardAccent ?? '') === a.v;
        return (
          <button
            key={a.label}
            type="button"
            className="nodrag nopan"
            aria-label={a.label}
            onPointerDown={e => stopPress(e, () => up({ cardAccent: a.v }))}
            onClick={e => e.stopPropagation()}
            style={{
              width: 27,
              height: 27,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: active ? `3px solid ${BLUE}` : '1px solid rgba(24,27,35,0.10)',
              background: a.bg,
              boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.72), 0 2px 8px rgba(38,36,52,0.16)' : '0 1px 4px rgba(38,36,52,0.12)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {a.empty && <span style={{ width: 14, height: 2, borderRadius: 2, background: 'rgba(178,35,48,0.42)', transform: 'rotate(-38deg)' }} />}
          </button>
        );
      })}
    </div>
  );
}

export function TypePicker({ data, up }: { data: CardData; up: (p: Partial<CardData>) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '6px 20px 4px 56px' }}>
      {CONTENT_TYPES.map(ct => {
        const active = (data.contentType ?? 'note') === ct.v;
        return (
          <button
            key={ct.v}
            type="button"
            className="nodrag nopan"
            onPointerDown={e => stopPress(e, () => up({ contentType: ct.v }))}
            onClick={e => e.stopPropagation()}
            style={{
              height: 38,
              border: 0,
              borderRadius: 10,
              background: active ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.06)',
              boxShadow: active ? '0 1px 3px rgba(38,36,52,0.055), inset 0 1px 0 rgba(255,255,255,0.72)' : 'inset 0 1px 0 rgba(255,255,255,0.16)',
              color: active ? BLUE : 'rgba(24,27,35,0.48)',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: LATIN,
              fontSize: 11,
              fontWeight: 680,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <span style={{ width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {ct.icon}
            </span>
            {ct.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusPicker({ data, up }: { data: CardData; up: (p: Partial<CardData>) => void }) {
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState('');
  const presets = CT_STATUS[data.contentType ?? 'note'];
  const pick = (label: string, color: StatusColor) =>
    up(data.status === label ? { status: '', statusColor: undefined } : { status: label, statusColor: color });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '5px 20px 4px 56px' }}>
      {presets.map(p => {
        const active = data.status === p.label;
        return (
          <button
            key={p.label}
            type="button"
            className="nodrag nopan"
            onPointerDown={e => stopPress(e, () => pick(p.label, p.color))}
            onClick={e => e.stopPropagation()}
            style={{
              height: 30,
              padding: '0 12px',
              border: 0,
              borderRadius: 10,
              background: active ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.06)',
              boxShadow: active ? '0 1px 3px rgba(38,36,52,0.055), inset 0 1px 0 rgba(255,255,255,0.72)' : 'inset 0 1px 0 rgba(255,255,255,0.16)',
              color: active ? INK : 'rgba(24,27,35,0.50)',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: active ? 620 : 510,
            }}
          >
            {p.label}
          </button>
        );
      })}
      {!editing ? (
        <button type="button" className="nodrag nopan" onPointerDown={e => stopPress(e, () => setEditing(true))} onClick={e => e.stopPropagation()} style={{ height: 30, padding: '0 12px', border: 0, borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: MUTED, cursor: 'pointer', outline: 'none', fontFamily: FONT, fontSize: 14 }}>
          + Custom
        </button>
      ) : (
        <input
          autoFocus
          value={custom}
          className="nodrag nopan"
          onPointerDown={e => e.stopPropagation()}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && custom.trim()) {
              up({ status: custom.trim(), statusColor: 'gray' });
              setCustom('');
              setEditing(false);
            }
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={() => { if (!custom.trim()) setEditing(false); }}
          placeholder="Status"
          style={{ width: 94, height: 30, boxSizing: 'border-box', border: 0, borderRadius: 10, outline: 'none', padding: '0 10px', background: HOVER, color: INK, fontFamily: FONT, fontSize: 14 }}
        />
      )}
    </div>
  );
}

export function selectedType(data: CardData) {
  return CONTENT_TYPES.find(ct => ct.v === (data.contentType ?? 'note'))?.label ?? 'Note';
}
