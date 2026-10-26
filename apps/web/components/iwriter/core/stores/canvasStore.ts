/**
 * canvasStore — CANVAS 文档/画板持久化
 * 每条记录 = 一个 MD 文档或画板，存 localStorage + native account storage。
 */
import type { Session } from '@/lib/hs-account';
import { account, cloudRequest, subscribeCloud } from '../lib/cloud';

const KEY = 'gyenbox_iwriter_docs';

export type CanvasType = 'doc' | 'canvas' | 'nodes' | 'image' | 'office';

export interface CanvasDoc {
  id:        string;
  title:     string;
  content:   string;
  type:      CanvasType;
  scope:     'self' | 'shared';
  createdAt: string;
  updatedAt: string;
  tags?:     string[];
}

function load(): CanvasDoc[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function save(docs: CanvasDoc[]) {
  localStorage.setItem(KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event('canvas-updated'));
}

export const canvasStore = {
  getAll:    (): CanvasDoc[] => load(),
  getById:   (id: string)    => load().find(d => d.id === id),
  getRecent: (n = 5)         => load().slice(0, n),

  add(doc: CanvasDoc) {
    save([doc, ...load()]);
    void _upsert(doc);
  },

  importDocuments(incoming: CanvasDoc[]) {
    const byId = new Map(load().map(doc => [doc.id, doc]));
    const accepted: CanvasDoc[] = [];
    for (const doc of incoming) {
      const current = byId.get(doc.id);
      if (!current || new Date(doc.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
        byId.set(doc.id, doc);
        accepted.push(doc);
      }
    }
    const merged = [...byId.values()].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    save(merged);
    for (const doc of accepted) void _upsert(doc);
  },

  update(id: string, patch: Partial<CanvasDoc>) {
    const docs = load().map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d);
    save(docs);
    const updated = docs.find(d => d.id === id);
    if (updated) void _upsert(updated);
  },

  remove(id: string) {
    save(load().filter(d => d.id !== id));
    void _delete(id);
  },
};

// ── Native account 双写同步 ─────────────────────────────────────────────────────────
let _uid: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rt: any = null;

function _row(doc: CanvasDoc) {
  return {
    id: doc.id, user_id: _uid!, title: doc.title, content: doc.content,
    type: doc.type, scope: doc.scope, tags: doc.tags ?? [],
    created_at: doc.createdAt, updated_at: doc.updatedAt,
  };
}

async function _upsert(doc: CanvasDoc) {
  if (!_uid) return;
  await cloudRequest('canvas', 'PUT', _row(doc));
}

async function _delete(id: string) {
  if (!_uid) return;
  await cloudRequest('canvas', 'DELETE', undefined, id);
}

function _inferType(content: string, stored: CanvasType): CanvasType {
  if (stored !== 'doc') return stored;
  const c = content?.trim() ?? '';
  if (!c.startsWith('{')) return 'doc';
  try {
    const p = JSON.parse(c);
    if ('elements' in p || p.type === 'excalidraw') return 'canvas';
    if ('nodes' in p && 'edges' in p)               return 'nodes';
  } catch {}
  return 'doc';
}

async function _pull(userId: string) {
  const { data } = await cloudRequest('canvas');
  if (!data) return;
  const toFix: CanvasDoc[] = [];
  const remote: CanvasDoc[] = data.map((r: any) => {
    const type = _inferType(r.content, r.type as CanvasType);
    const doc: CanvasDoc = {
      id: r.id, title: r.title, content: r.content,
      type, scope: r.scope as 'self' | 'shared',
      tags: r.tags ?? [], createdAt: r.created_at, updatedAt: r.updated_at,
    };
    if (type !== r.type) toFix.push(doc);
    return doc;
  });
  for (const doc of toFix) void _upsert(doc);
  const local     = load();
  const remIds    = new Set(remote.map(d => d.id));
  const localOnly = local.filter(d => !remIds.has(d.id));
  for (const doc of localOnly) await _upsert(doc);
  save([...remote, ...localOnly]);
}

function _subscribeRealtime(uid: string) {
  _rt?.unsubscribe();
  _rt = subscribeCloud(() => _pull(uid));
}

function onSession(_ev: string, session: Session | null) {
  _uid = session?.user?.id ?? null;
  if (_uid) { _pull(_uid); _subscribeRealtime(_uid); }
  else { _rt?.unsubscribe(); _rt = null; }
}
account.auth.onAuthStateChange(onSession);

void account.auth.getSession().then(({ data, error }) => { if (!error) onSession("INITIAL_SESSION", data.session); });
