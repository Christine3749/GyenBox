import { DesktopAuthorizeClient } from "./desktop-authorize-client";
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config";

export const dynamic = "force-dynamic";

export default function DesktopAuthorizePage() {
  return <DesktopAuthorizeClient supabaseConfig={getPublicSupabaseConfig()} />;
}
