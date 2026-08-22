import type { CardData, ContentType } from './CanvasCardData';
import { CT_LABEL } from './CanvasCardSolidTokens';

export function normalizeContentType(data: CardData): ContentType {
  const raw = String(data.contentType ?? data.entitySub ?? 'note').toLowerCase();
  return (raw in CT_LABEL ? raw : 'note') as ContentType;
}

export function renderLines(text: string, fontSize: number, muted: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const bullet = /^[-*]\s+/.test(line);
    const ordered = /^\d+[.)]\s+/.test(line);
    const heading = /^#{1,3}\s+/.test(line);
    const clean = line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').replace(/^#{1,3}\s+/, '');
    if (heading) {
      return <div key={i} style={{ margin: i ? '7px 0 4px' : '0 0 4px', fontSize, fontWeight: 700, color: 'rgba(24,28,38,0.86)' }}>{clean}</div>;
    }
    return (
      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: i ? 4 : 0, color: 'rgba(34,39,52,0.72)' }}>
        {(bullet || ordered) && <span style={{ width: 3.5, height: 3.5, marginTop: fontSize * 0.58, borderRadius: '50%', background: muted, flexShrink: 0 }} />}
        <span>{clean}</span>
      </div>
    );
  });
}

export function splitDashedLeadHeading(text: string) {
  const lines = text.split('\n');
  const idx = lines.findIndex(line => line.trim().length > 0);
  if (idx < 0) return { leadHeading: null as string | null, bodyText: text };

  const first = lines[idx].trim();
  if (!/^#{1,3}\s+/.test(first)) return { leadHeading: null as string | null, bodyText: text };

  const leadHeading = first.replace(/^#{1,3}\s+/, '');
  const rest = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join('\n');
  return { leadHeading, bodyText: rest };
}

function cleanTag(value: unknown) {
  return String(value ?? '').trim().replace(/^#+/, '');
}

export function buildHeaderTags(data: CardData, contentType: ContentType, status: string) {
  const rawTags = Array.isArray(data.tags)
    ? data.tags
    : typeof data.tag === 'string'
      ? data.tag.split(/[,\s#]+/)
      : [];
  const blocked = new Set([contentType, 'board', status].map(v => cleanTag(v).toLowerCase()));
  const extra = rawTags
    .map(cleanTag)
    .filter(tag => tag && !blocked.has(tag.toLowerCase()));

  return [`#${CT_LABEL[contentType]} board`, ...extra.map(tag => `#${tag}`)].join(' ');
}
