import { getBearerToken } from '@/lib/hs-server';
import { hsRequest, AccountError } from '@/lib/hs-account';

export const runtime = 'nodejs';
async function handle(request: Request, context: { params: { collection: string } }) {
  const collection = context.params.collection;
  if (!['canvas', 'chats'].includes(collection)) return Response.json({ error: 'not_found' }, { status: 404 });
  const token = getBearerToken(request);
  if (!token) return Response.json({ error: 'authentication_required' }, { status: 401 });
  try {
    const result = await hsRequest(`/iwriter/${collection}${new URL(request.url).search}`, {
      method: request.method, headers: { Authorization: `Bearer ${token}` },
      body: request.method === 'PUT' ? await request.text() : undefined,
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'storage_unavailable' },
      { status: error instanceof AccountError ? error.status : 503 });
  }
}
export { handle as GET, handle as PUT, handle as DELETE };
