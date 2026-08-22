import { memo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import type { BoxData, ModuleColor } from './CanvasCardData';
import { MODULE_COLORS } from './CanvasCardData';

const SIDES = [
  { pos: Position.Top, id: 't' },
  { pos: Position.Right, id: 'r' },
  { pos: Position.Bottom, id: 'b' },
  { pos: Position.Left, id: 'l' },
];

const FONT = '"HarmonyOS Sans SC","HarmonyOS Sans","Inter","PingFang SC","Microsoft YaHei UI",system-ui,sans-serif';
const DEFAULT_W = 420;
const DEFAULT_H = 280;

const COLLECTION_BG = 'rgba(248,249,252,0.40)';
const COLLECTION_ABSORB_BG = 'rgba(238,248,240,0.56)';
const COLLECTION_BORDER = 'rgba(112,121,138,0.22)';
const COLLECTION_SELECTED = 'rgba(112,121,138,0.34)';
const COLLECTION_SHADOW = '0 4px 10px rgba(53,39,78,0.045), 0 1px 2px rgba(53,39,78,0.035)';
const CHIP_BG = 'rgba(248,249,252,0.96)';
const CHIP_BORDER = 'rgba(112,121,138,0.18)';
const INK = 'rgba(32,35,43,0.82)';
const MUTED = 'rgba(62,70,86,0.48)';

function FolderMark({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke={color}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 4.2V3.3c0-.66.54-1.2 1.2-1.2h2.2l1.1 1.2h4.3c.66 0 1.2.54 1.2 1.2v.7" />
      <path d="M1.5 4.8h10v4.9c0 .66-.54 1.2-1.2 1.2H2.7c-.66 0-1.2-.54-1.2-1.2V4.8Z" />
    </svg>
  );
}

function GripDots() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="rgba(62,70,86,0.11)"
      style={{ position: 'absolute', bottom: 5, right: 5, pointerEvents: 'none' }} aria-hidden="true">
      {[0, 4, 8].flatMap(x => [0, 4, 8].map(y => (
        <circle key={`${x}${y}`} cx={x + 1} cy={y + 1} r="1" />
      )))}
    </svg>
  );
}

function descendantsOf(nodes: any[], rootId: string) {
  const out = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes) {
      const parent = n.parentId;
      if (parent === rootId || (parent && out.has(parent))) {
        if (!out.has(n.id)) {
          out.add(n.id);
          changed = true;
        }
      }
    }
  }
  return out;
}

export const CanvasBox = memo(({ id, data, selected }: NodeProps) => {
  const d = data as BoxData;
  const { getNodes, setNodes } = useReactFlow();
  const mc = d.moduleColor ?? ('green' as ModuleColor);
  const color = MODULE_COLORS[mc];
  const label = d.label || '集合';
  const width = d.width ?? DEFAULT_W;
  const height = d.height ?? DEFAULT_H;
  const accent = color.fg;
  const count = d.childCount ?? 0;
  const absorbing = Boolean(d.absorbPreview);
  const countText = `${count} 张`;

  const toggle = () => {
    const nodes = getNodes();
    const children = descendantsOf(nodes, id);
    const nextCollapsed = !d.collapsed;
    setNodes(nodes.map(n => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, collapsed: nextCollapsed } };
      }
      if (children.has(n.id)) {
        return { ...n, hidden: nextCollapsed };
      }
      return n;
    }));
  };

  const handles = (
    <>
      {SIDES.map(({ pos, id: hid }) => (
        <Handle key={hid} id={`src-${hid}`} type="source" position={pos}
          style={{ opacity: 0, width: 8, height: 8, background: accent, border: '1.5px solid #fff', transition: 'opacity 0.12s' }} />
      ))}
      {SIDES.map(({ pos, id: hid }) => (
        <Handle key={`t-${hid}`} id={`tgt-${hid}`} type="target" position={pos}
          style={{ opacity: 0, width: 14, height: 14 }} />
      ))}
    </>
  );

  if (d.collapsed) {
    return (
      <div style={{ position: 'relative', display: 'inline-flex', fontFamily: FONT }}>
        <button className="nodrag" onClick={toggle} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          height: 30,
          padding: '0 10px 0 9px',
          borderRadius: 6,
          border: `1px solid ${selected ? COLLECTION_SELECTED : CHIP_BORDER}`,
          background: CHIP_BG,
          boxShadow: COLLECTION_SHADOW,
          cursor: 'pointer',
          color: INK,
        }}>
          <FolderMark color={accent} />
          <span style={{ fontSize: 12, fontWeight: 620, whiteSpace: 'nowrap' }}>
            {label}
          </span>
          <span style={{
            minWidth: 16,
            height: 18,
            padding: '0 5px',
            borderRadius: 5,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10.5,
            fontWeight: 650,
            color: MUTED,
            background: 'rgba(237,240,246,0.72)',
          }}>
            {count}
          </span>
        </button>
        {handles}
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width,
      height,
      minWidth: 260,
      minHeight: 170,
      fontFamily: FONT,
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 6,
        border: absorbing ? `1.2px dashed ${color.border}` : `1px solid ${selected ? COLLECTION_SELECTED : COLLECTION_BORDER}`,
        background: absorbing ? COLLECTION_ABSORB_BG : COLLECTION_BG,
        boxShadow: absorbing
          ? '0 5px 12px rgba(53,39,78,0.06), inset 0 0 0 1px rgba(255,255,255,0.42)'
          : COLLECTION_SHADOW,
        pointerEvents: 'none',
        transition: 'background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease',
      }} />

      <button className="nodrag" onClick={toggle} style={{
        position: 'absolute',
        top: 10,
        left: 14,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '0 9px',
        borderRadius: 6,
        border: `1px solid ${absorbing ? color.border : CHIP_BORDER}`,
        background: absorbing ? 'rgba(255,255,255,0.78)' : CHIP_BG,
        color: INK,
        boxShadow: absorbing ? '0 2px 6px rgba(53,39,78,0.055)' : '0 2px 5px rgba(53,39,78,0.035)',
        cursor: 'pointer',
        zIndex: 2,
        transition: 'background 0.12s ease, border-color 0.12s ease',
      }}>
        <FolderMark color={accent} />
        <span style={{ fontSize: 12.5, fontWeight: 620, whiteSpace: 'nowrap' }}>
          {absorbing ? '松手归入' : label}
        </span>
      </button>

      <div style={{
        position: 'absolute',
        top: 11,
        right: 14,
        height: 26,
        minWidth: 54,
        padding: '0 9px',
        borderRadius: 6,
        border: `1px solid ${absorbing ? color.border : CHIP_BORDER}`,
        background: absorbing ? 'rgba(255,255,255,0.72)' : 'rgba(237,240,246,0.84)',
        color: absorbing ? accent : MUTED,
        fontSize: 11,
        fontWeight: 620,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        transition: 'background 0.12s ease, border-color 0.12s ease, color 0.12s ease',
      }}>
        {absorbing ? `${count + 1} 张` : countText}
      </div>

      <GripDots />
      {handles}
    </div>
  );
});

CanvasBox.displayName = 'CanvasBox';
