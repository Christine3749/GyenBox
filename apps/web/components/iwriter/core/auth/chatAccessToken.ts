import { getOptionalHsClient } from './hsClient';

const EXPIRY_SKEW_SECONDS = 30;
let pendingRecovery: Promise<string> | null = null;
let pendingForcedRecovery: Promise<string> | null = null;

function usableAccessToken(session: {
  access_token?: string;
  expires_at?: number;
} | null): string {
  if (!session?.access_token) return '';
  if (
    typeof session.expires_at === 'number'
    && session.expires_at <= Math.floor(Date.now() / 1000) + EXPIRY_SKEW_SECONDS
  ) {
    return '';
  }
  return session.access_token;
}

async function recoverAccessToken(): Promise<string> {
  const account = getOptionalHsClient();
  if (!account) return '';
  const { data } = await account.auth.getSession();
  return usableAccessToken(data.session);
}

async function refreshAccessToken(): Promise<string> {
  const account = getOptionalHsClient();
  if (!account) return '';
  try {
    const { data } = await account.auth.refreshSession();
    const refreshed = usableAccessToken(data.session);
    if (refreshed) return refreshed;
  } catch {}
  return recoverAccessToken();
}

export async function getChatAccessToken(forceRefresh = false): Promise<string> {
  const account = getOptionalHsClient();
  if (!account) return '';
  const { data } = await account.auth.getSession();
  const current = usableAccessToken(data.session);
  if (current && !forceRefresh) return current;

  if (forceRefresh) {
    const normalRecovery = pendingRecovery;
    if (!pendingForcedRecovery) {
      pendingForcedRecovery = (async () => {
        await normalRecovery?.catch(() => '');
        return refreshAccessToken();
      })().finally(() => {
        pendingForcedRecovery = null;
      });
    }
    return pendingForcedRecovery;
  }

  if (!pendingRecovery) {
    pendingRecovery = refreshAccessToken().finally(() => {
      pendingRecovery = null;
    });
  }
  return pendingRecovery;
}
