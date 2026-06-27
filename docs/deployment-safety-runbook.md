# GyenBox Deployment Safety Runbook

This runbook exists because `gyenbox.com` showed Cloudflare `525 SSL handshake failed` during the Taiwan migration on 2026-06-27.

## Production Topology

Current public traffic path:

1. `gyenbox.com/*`
2. Cloudflare Worker route `gyenbox-origin-proxy`
3. GCP Cloud Run Taiwan origin `gyenbox-web-tw`
4. Next.js web app

The public domain should not depend on the deleted US Cloud Run service.

## Incident Record

- User-visible error: Cloudflare `525 SSL handshake failed`
- Screenshot timestamp: `2026-06-27 11:36:49 UTC`
- Local time: `2026-06-27 19:36:49 Asia/Shanghai`
- Browser and Cloudflare were working.
- Host/origin TLS handshake failed.
- Root cause: the US Cloud Run service/domain mapping was deleted before the Taiwan public path was fully verified.
- Classification: deployment sequencing error, not a user network outage and not an app runtime crash.

## Hard Rule

Never delete, disable, or detach the old production origin until the new production path has passed verification through the real public domain.

This applies to:

- Cloud Run services
- Cloud Run domain mappings
- Cloudflare Worker routes
- Cloudflare DNS or proxy changes
- Vercel production aliases
- R2 latest installer redirects

## Safe Domain Migration Order

1. Deploy the new origin first.
2. Verify the new origin directly.
3. Add or update the public routing layer.
4. Verify the public domain through the user-facing hostname.
5. Repeat the public verification at least twice.
6. Keep the old origin available until the new path is proven stable.
7. Only then delete the old origin or old mapping.
8. Verify the old origin is gone and the public domain still works.

## Required Verification Commands

Run these before deleting any old production path:

```powershell
curl.exe -I https://gyenbox.com/workspace
curl.exe -I https://gyenbox.com/api/releases/desktop/windows
```

Pass conditions:

- `/workspace` returns `200`.
- `/api/releases/desktop/windows` returns `302` to the public R2 latest installer.
- Response headers include `x-gyenbox-origin: gcp-asia-east1` when traffic is expected to route through Taiwan.
- The workspace JavaScript contains the target desktop version string.

Version check:

```powershell
$html = curl.exe -sL https://gyenbox.com/workspace
$chunk = [regex]::Match($html, '/_next/static/chunks/app/workspace/page-[^""<]+\.js').Value
$js = curl.exe -sL "https://gyenbox.com$chunk"
$js -match 'GyenBox Desktop 0\.1\.13'
```

Update the version string to match the release being deployed.

## Cloudflare Worker Route

Worker path:

```text
infra/cloudflare/gyenbox-origin-proxy
```

Dry-run before deploy:

```powershell
wrangler deploy --dry-run --config infra\cloudflare\gyenbox-origin-proxy\wrangler.jsonc
```

Deploy:

```powershell
wrangler deploy --config infra\cloudflare\gyenbox-origin-proxy\wrangler.jsonc
```

The Worker should stream responses from Taiwan Cloud Run and set:

```text
x-gyenbox-origin: gcp-asia-east1
```

## Rollback Rule

A migration is not ready if rollback requires rebuilding from scratch.

Before removing an old origin, make sure at least one of these is true:

- The Cloudflare Worker can be pointed back to the old stable origin.
- The old service is still deployed and reachable.
- A known-good deployment command and image tag are available.

## Forbidden Moves

Do not do these during a domain migration:

- Delete the old Cloud Run service before the public domain verifies the new route.
- Delete the old Cloud Run domain mapping while the replacement mapping is still `CertificatePending` or `Unknown`.
- Assume `run.app` success means `gyenbox.com` success.
- Assume Vercel/GCP/R2 success means the real user-facing domain is updated.
- Trust browser screenshots alone without `curl` verification.

## Final Production Gate

A deployment is not complete until these are all true:

- `gyenbox.com/workspace` returns `200`.
- `gyenbox.com/api/releases/desktop/windows` returns `302` to R2 latest.
- The public domain response confirms the intended origin.
- The public JS chunk contains the intended version.
- Recent platform logs show no deployment-time errors.
- Any intentionally removed old origin is confirmed absent.
