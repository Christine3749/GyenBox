import { getHsBrowserClient } from '@/lib/hs-client';
export const account = getHsBrowserClient();
export async function cloudRequest(collection: 'canvas' | 'chats', method = 'GET', body?: unknown, id?: string) {
  try {
    const session = await account.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return { data: null, error: new Error('authentication_required') };
    const response = await fetch(`/api/iwriter/cloud/${collection}${id ? '?id=' + encodeURIComponent(id) : ''}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '同步暂时不可用');
    return { data: result.data as any[], error: null };
  } catch (error) { return { data: null, error }; }
}

// Refresh visible editors without depending on the retired HalfSphere realtime service.
export function subscribeCloud(refresh: () => Promise<void>) {
  let pending = false;
  let stopped = false;
  const read = async () => {
    if (pending || stopped || document.visibilityState === 'hidden') return;
    pending = true;
    try { await refresh(); } catch {} finally { pending = false; }
  };
  const timer = setInterval(read, 15000);
  window.addEventListener('focus', read);
  document.addEventListener('visibilitychange', read);
  return { unsubscribe() {
    stopped = true; clearInterval(timer);
    window.removeEventListener('focus', read);
    document.removeEventListener('visibilitychange', read);
  } };
}
