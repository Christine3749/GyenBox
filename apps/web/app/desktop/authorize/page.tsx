import { DesktopAuthorizeClient } from "./desktop-authorize-client";
import { getPublicHsConfig } from "@/lib/hs-public-config";

export const dynamic = "force-dynamic";

export default function DesktopAuthorizePage() {
  return <DesktopAuthorizeClient supabaseConfig={getPublicHsConfig()} />;
}
