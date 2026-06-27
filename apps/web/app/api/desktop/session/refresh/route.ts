import { fail, ok } from "@/lib/api-response";
import { getSupabaseAuthClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const refreshToken =
    typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!refreshToken) {
    return fail("VALIDATION_ERROR", "Refresh token is required.", 422);
  }

  const { data, error } = await getSupabaseAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) {
    return fail(
      "SESSION_REFRESH_FAILED",
      error?.message ?? "Could not refresh the desktop session.",
      401,
    );
  }

  return ok({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at
      ? new Date(data.session.expires_at * 1000).toISOString()
      : null,
    user: {
      id: data.user?.id ?? null,
      email: data.user?.email ?? null,
    },
  });
}
