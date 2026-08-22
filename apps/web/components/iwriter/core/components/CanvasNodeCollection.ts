import type { Node } from '@xyflow/react';
import type { BoxData, CardSize } from './CanvasCardData';
import { CARD_SIZE_DIM } from './CanvasCardSolidTokens';

export const SIZE_DIM: Record<CardSize, { w: number; h: number }> = CARD_SIZE_DIM;

const COLLECTION_DIM = { w: 420, h: 280 };
export const ABSORB_PREVIEW_RATIO = 0.25;
const ABSORB_RATIO = 0.6;

function nodeSize(n: Node) {
  const d = n.data as Record<string, unknown>;
  const style = n.style as Record<string, unknown> | undefined;
  const measured = (n as any).measured as { width?: number; height?: number } | undefined;
  return {
    w: Number(d.width ?? n.width ?? measured?.width ?? style?.width ?? (n.type === 'box' ? COLLECTION_DIM.w : SIZE_DIM.S.w)),
    h: Number(d.height ?? n.height ?? measured?.height ?? style?.height ?? (n.type === 'box' ? COLLECTION_DIM.h : SIZE_DIM.S.h)),
  };
}

function absolutePosition(n: Node, nodes: Node[]) {
  let x = n.position.x;
  let y = n.position.y;
  let parentId = n.parentId;
  while (parentId) {
    const parent = nodes.find(item => item.id === parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

function isDescendant(nodeId: string, ancestorId: string, nodes: Node[]) {
  let cur = nodes.find(n => n.id === nodeId);
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = nodes.find(n => n.id === cur?.parentId);
  }
  return false;
}

function overlapRatio(child: Node, box: Node, nodes: Node[]) {
  const c = absolutePosition(child, nodes);
  const b = absolutePosition(box, nodes);
  const cs = nodeSize(child);
  const bs = nodeSize(box);
  const left = Math.max(c.x, b.x);
  const top = Math.max(c.y, b.y);
  const right = Math.min(c.x + cs.w, b.x + bs.w);
  const bottom = Math.min(c.y + cs.h, b.y + bs.h);
  if (right <= left || bottom <= top) return 0;
  return ((right - left) * (bottom - top)) / (cs.w * cs.h);
}

function orderParentsFirst(nodes: Node[]) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const ordered: Node[] = [];

  const visit = (node: Node) => {
    if (visited.has(node.id)) return;
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) visit(parent);
    }
    visited.add(node.id);
    ordered.push(node);
  };

  nodes.forEach(visit);
  return ordered;
}

function withCollectionCounts(nodes: Node[]) {
  return orderParentsFirst(nodes.map(n => {
    if (n.type !== 'box') return n;
    const childCount = nodes.filter(child => child.parentId === n.id).length;
    return { ...n, data: { ...n.data, childCount } };
  }));
}

export function clearAbsorbPreview(nodes: Node[]) {
  return nodes.map(n => {
    if (n.type !== 'box' || !(n.data as BoxData).absorbPreview) return n;
    return { ...n, data: { ...n.data, absorbPreview: false } };
  });
}

export function attachToCollection(nodes: Node[], draggedNode: Node) {
  if (draggedNode.type !== 'card' && draggedNode.type !== 'box') return nodes;
  const current = nodes.map(n => n.id === draggedNode.id ? { ...n, position: draggedNode.position, parentId: draggedNode.parentId } : n);
  const dragged = current.find(n => n.id === draggedNode.id);
  if (!dragged) return nodes;

  const candidates = current
    .filter(n => n.type === 'box' && n.id !== dragged.id && !n.hidden && !isDescendant(n.id, dragged.id, current))
    .map(box => ({ box, ratio: overlapRatio(dragged, box, current) }))
    .filter(item => item.ratio >= ABSORB_RATIO)
    .sort((a, b) => b.ratio - a.ratio);

  const target = candidates[0]?.box;
  const draggedAbs = absolutePosition(dragged, current);

  if (!target) {
    const detached = current.map(n => {
      if (n.id !== dragged.id || !n.parentId) return n;
      return { ...n, parentId: undefined, position: draggedAbs };
    });
    return withCollectionCounts(detached);
  }

  const targetAbs = absolutePosition(target, current);
  const hidden = Boolean((target.data as BoxData).collapsed);
  const attached = current.map(n => {
    if (n.id !== dragged.id) return n;
    return {
      ...n,
      parentId: target.id,
      position: { x: draggedAbs.x - targetAbs.x, y: draggedAbs.y - targetAbs.y },
      hidden,
    };
  });
  return withCollectionCounts(attached);
}

export function absorbCandidateId(nodes: Node[], draggedNode: Node, threshold: number) {
  if (draggedNode.type !== 'card' && draggedNode.type !== 'box') return null;
  const current = nodes.map(n => n.id === draggedNode.id ? { ...n, position: draggedNode.position, parentId: draggedNode.parentId } : n);
  const dragged = current.find(n => n.id === draggedNode.id);
  if (!dragged) return null;
  const candidates = current
    .filter(n => n.type === 'box' && n.id !== dragged.id && !n.hidden && !isDescendant(n.id, dragged.id, current))
    .map(box => ({ box, ratio: overlapRatio(dragged, box, current) }))
    .filter(item => item.ratio >= threshold)
    .sort((a, b) => b.ratio - a.ratio);
  return candidates[0]?.box.id ?? null;
}

export function markAbsorbPreview(nodes: Node[], targetId: string | null) {
  return nodes.map(n => {
    if (n.type !== 'box') return n;
    const active = n.id === targetId;
    if (Boolean((n.data as BoxData).absorbPreview) === active) return n;
    return { ...n, data: { ...n.data, absorbPreview: active } };
  });
}
