import { hsRequest } from "./hs-account"
// Keep shares the existing GyenBox membership. Membership lookup remains
// best-effort and does not block note-taking.
export async function ensureFreeMembership(accessToken: string): Promise<void> {
  try {
    await hsRequest("/gyenbox/membership", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } })
  } catch { /* Preserve the existing best-effort behavior. */ }
}
