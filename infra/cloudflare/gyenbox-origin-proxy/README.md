# GyenBox Origin Proxy

Cloudflare Worker route for `gyenbox.com/*`.

## Purpose

Routes the public domain to the Taiwan Cloud Run origin without depending on a Cloud Run custom-domain certificate for `gyenbox.com`.

Current origin:

```text
https://gyenbox-web-tw-1004693447123.asia-east1.run.app
```

Expected public response header:

```text
x-gyenbox-origin: gcp-asia-east1
```

## Deploy

```powershell
wrangler deploy --dry-run --config infra\cloudflare\gyenbox-origin-proxy\wrangler.jsonc
wrangler deploy --config infra\cloudflare\gyenbox-origin-proxy\wrangler.jsonc
```

## Verify

```powershell
curl.exe -I https://gyenbox.com/workspace
curl.exe -I https://gyenbox.com/api/releases/desktop/windows
```

Both requests should include the `x-gyenbox-origin` response header from the Worker.

## Safety

Read `docs/deployment-safety-runbook.md` before changing routes, origins, domain mappings, DNS records, or deleting any old service.
