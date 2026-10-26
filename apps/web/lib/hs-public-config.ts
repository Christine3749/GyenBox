export type PublicHsConfig = { url: string; anonKey: string }
// Compatibility shape for existing page props; no external SDK or key is used.
export function getPublicHsConfig(): PublicHsConfig {
  return { url: "/api/auth", anonKey: "" }
}
