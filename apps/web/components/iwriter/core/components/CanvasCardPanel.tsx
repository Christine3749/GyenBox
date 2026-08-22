import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow, useViewport } from '@xyflow/react';
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  FoldVertical,
  Hash,
  History,
  Info,
  Link as LinkIcon,
  ListTree,
  Map,
  Maximize2,
  Minimize,
  PanelLeft,
  Square,
  Trash2,
  XSquare,
} from 'lucide-react';
import type { CardBorder, CardData, CardSize, CardState } from './CanvasCardData';
import { Divider, MenuRow, Segment, Toggle } from './CanvasCardPanelControls';
import { StatusPicker, Swatches, TypePicker, selectedType } from './CanvasCardPanelPickers';
import {
  FONT,
  INK,
  PANEL_BG,
  PANEL_BORDER,
  PANEL_EDGE,
  PANEL_GAP,
  PANEL_PADDING,
  PANEL_RADIUS,
  PANEL_SHADOW,
  PANEL_TOP_OFFSET,
  PANEL_WIDTH,
  SIZES,
  STATE_OPTIONS,
} from './CanvasCardPanelTokens';

interface Props {
  nodeId: string;
  data: CardData;
  anchorRef: RefObject<HTMLElement>;
  onClose: () => void;
}

export function CanvasCardPanel({ nodeId, data, anchorRef, onClose }: Props) {
  const { updateNodeData, deleteElements } = useReactFlow();
  useViewport();
  const ref = useRef<HTMLDivElement>(null);
  const up = (patch: Partial<CardData>) => updateNodeData(nodeId, patch as Record<string, unknown>);

  const fitContent = () => {
    const raw = String(data.text ?? '').trim();
    const lines = raw ? raw.split('\n').length : 0;
    const len = raw.length;
    const next: CardSize = !raw ? 'S' : (len > 180 || lines > 7) ? 'L' : (len > 70 || lines > 3) ? 'M' : 'S';
    up({ cardSize: next });
  };

  const copyCard = async () => {
    const title = String(data.entityName || data.connectorName || 'Untitled');
    const body = String(data.text || '');
    try {
      await navigator.clipboard?.writeText([title, body].filter(Boolean).join('\n\n'));
    } catch {
      // Clipboard can be blocked in some embedded Electron contexts.
    }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', h, { capture: true });
    return () => window.removeEventListener('mousedown', h, { capture: true });
  }, [onClose]);

  const anchor = anchorRef.current?.getBoundingClientRect();
  if (!anchor) return null;
  const hasRoomRight = anchor.right + PANEL_GAP + PANEL_WIDTH <= window.innerWidth - PANEL_EDGE;
  const rawLeft = hasRoomRight ? anchor.right + PANEL_GAP : anchor.left - PANEL_WIDTH - PANEL_GAP;
  const left = Math.max(PANEL_EDGE, Math.min(rawLeft, window.innerWidth - PANEL_WIDTH - PANEL_EDGE));
  const rawTop = anchor.top + PANEL_TOP_OFFSET;
  const top = Math.max(16, Math.min(rawTop, window.innerHeight - 120));

  const panel = (
    <>
      <style>
        {`.gsyen-card-panel-scroll::-webkit-scrollbar{width:4px}.gsyen-card-panel-scroll::-webkit-scrollbar-track{background:transparent}.gsyen-card-panel-scroll::-webkit-scrollbar-thumb{background:rgba(28,32,42,.11);border-radius:999px}.gsyen-card-panel-scroll::-webkit-scrollbar-thumb:hover{background:rgba(28,32,42,.17)}.gsyen-card-panel-scroll::-webkit-scrollbar-button{display:none;width:0;height:0}`}
      </style>
      <div
        ref={ref}
        className="nodrag nopan gsyen-card-panel-scroll"
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left,
          top,
          width: PANEL_WIDTH,
          zIndex: 9999,
          maxHeight: 'calc(100vh - 36px)',
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: PANEL_PADDING,
          background: PANEL_BG,
          border: PANEL_BORDER,
          borderRadius: PANEL_RADIUS,
          boxShadow: PANEL_SHADOW,
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          fontFamily: FONT,
          color: INK,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(28,32,42,.11) transparent',
        }}
      >
        <MenuRow icon={<Minimize size={22} />} label="Fit to content" onPress={fitContent} />
        <MenuRow icon={<FoldVertical size={22} />} label="Fold" shortcut="Cmd+Option+Enter" onPress={() => up({ cardSize: 'S' })} />
        <MenuRow icon={<Maximize2 size={22} />} label="Draw connection">
          <Segment compact options={[[ 'Solid', 'solid' ], [ 'Dash', 'dashed' ]]} value={data.cardBorder ?? 'solid'} onChange={v => up({ cardBorder: v as CardBorder })} />
        </MenuRow>
        <Swatches data={data} up={up} />
        <MenuRow icon={<ListTree size={22} />} label="Mindmap">
          <Toggle active={data.cardState === 'highlight'} onChange={next => up({ cardState: next ? 'highlight' : 'normal' })} />
        </MenuRow>

        <Divider />

        <MenuRow icon={<FileText size={22} />} label="Content type">
          <span style={{ color: INK, fontSize: 15, fontWeight: 560 }}>{selectedType(data)}</span>
        </MenuRow>
        <TypePicker data={data} up={up} />
        <MenuRow icon={<Hash size={22} />} label="Status">
          <span style={{ color: INK, fontSize: 15, fontWeight: 560 }}>{data.status || 'Draft'}</span>
        </MenuRow>
        <StatusPicker data={data} up={up} />
        <MenuRow icon={<Square size={22} />} label="Size">
          <Segment compact options={SIZES.map(s => [s.v, s.v] as [string, string])} value={data.cardSize ?? 'S'} onChange={v => up({ cardSize: v as CardSize })} />
        </MenuRow>
        <MenuRow icon={<Info size={22} />} label="Display state">
          <Segment compact options={STATE_OPTIONS.map(([label, val]) => [label, val] as [string, string])} value={data.cardState ?? 'normal'} onChange={v => up({ cardState: v as CardState })} />
        </MenuRow>

        <Divider />

        <MenuRow icon={<Copy size={22} />} label="Copy" shortcut="Cmd+C" active onPress={copyCard} />
        <MenuRow icon={<XSquare size={22} />} label="Remove" shortcut="Del" onPress={() => { deleteElements({ nodes: [{ id: nodeId }] }); onClose(); }} />
        <MenuRow icon={<PanelLeft size={22} />} label="Add to sidebar" shortcut="Opt+Click" />
        <MenuRow icon={<Square size={22} />} label="Open in popup" />
        <MenuRow icon={<ExternalLink size={22} />} label="Open in new tab" shortcut="Cmd+Enter" />

        <Divider />

        <MenuRow icon={<Download size={22} />} label="Export as Markdown" />
        <MenuRow icon={<Download size={22} />} label="Export as PDF">
          <span style={{ height: 22, padding: '0 9px', display: 'inline-flex', alignItems: 'center', borderRadius: 8, background: 'rgba(24,27,35,0.07)', color: 'rgba(24,27,35,0.34)', fontSize: 12.5, fontWeight: 700 }}>
            BETA
          </span>
        </MenuRow>

        <Divider />

        <MenuRow icon={<Info size={22} />} label="Show info" shortcut="Option+Shift+I" />
        <MenuRow icon={<History size={22} />} label="Version history" />

        <Divider />

        <MenuRow icon={<LinkIcon size={22} />} label="Copy link" shortcut="Cmd+L" />
        <MenuRow icon={<Hash size={22} />} label="Manage tags" shortcut="Cmd+T" />
        <MenuRow icon={<Map size={22} />} label="Move to" shortcut="Cmd+M" />

        <Divider />

        <MenuRow icon={<Trash2 size={22} />} label="Delete from card library" danger onPress={() => { deleteElements({ nodes: [{ id: nodeId }] }); onClose(); }} />
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
