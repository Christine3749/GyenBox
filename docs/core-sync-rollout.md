# GyenBox Core sync rollout

This checklist releases the additive Core scope stream without interrupting
existing Keep clients. It is deliberately separate from public-domain routing:
do not change Cloudflare DNS, Worker routes, or an existing Cloud Run revision
while completing these steps.

## What is being released

- `ScopeStream` and `ScopeChange`: one ordered, cursor-based change stream per
  user or workspace scope.
- `ScopeMutation`: one durable acknowledgement for each client mutation ID.
- Keep is the first consumer. It keeps its legacy stream while progressively
  consuming the Core cursor, so older browser tabs can continue safely.
- GyenBox file/folder events enter the same stream. Shurufa and SafeAuth have
  contracts only; they are not enrolled until their own clients are ready.

The schema migration is additive: `20260812010000_core_scope_stream` creates
new tables and indexes only. Rolling an application revision back therefore
does not require rolling the database back.

## Release order

1. Build the `migration` target from `apps/keep/Dockerfile` using one new,
   immutable `_IMAGE_TAG` (the current Git SHA is the expected value). Both
   Cloud Build configs intentionally require `--substitutions=_IMAGE_TAG=...`;
   an omitted tag must fail rather than overwrite an older image.
2. Create a new, one-off Cloud Run Job named for that tag (for example,
   `gyenbox-keep-migrate-core-<tag>`). Never edit or reuse historical
   `gyenbox-keep-migrate-v*` Jobs: their image references are release history,
   not a mutable deployment channel. Bind the database URL through Secret
   Manager and the same Cloud SQL socket configuration as Keep; never copy a
   credential value into a command or build file.
3. Wait for that Job to complete successfully before deploying an application
   revision.
4. Build the `runner` target with the same source commit and deploy it as a
   tagged Cloud Run revision with **0% traffic**.
5. Test that revision through its direct `run.app` URL using an authenticated
   test account. Do not use the public Keep hostname for this gate.
6. Move traffic only after every check below passes. Keep the verified prior
   revision available for rollback.

## Canary checks

- Open Keep in two browser sessions for the same account.
- Create, update, trash, restore, and permanently delete a note in session A.
  Session B must receive each result through cursor polling without a full-page
  reload or duplicated card.
- Re-send one successful create, update, and delete request with the exact same
  `x-gyenbox-mutation-id`. Each request must return the original durable result
  and create no extra `ScopeChange` event.
- Upload one file, create one folder, and rename or trash one resource. Re-send
  each completed request with its original mutation ID. The result must be
  replayed without an extra file version, quota increment, folder, or stream
  event.
- Request `/api/sync/changes?cursor=0` as the owning user: it must return only
  that user scope's metadata events and the next cursor.
- Request the same endpoint with a workspace ID where the user is not a member:
  it must return `403`, never an empty success response that could hide an
  authorization failure.
- Confirm SafeAuth events contain only opaque encrypted-vault or recovery IDs;
  no password, TOTP, plaintext, preview, or search data belongs in the stream.
- Upload and rename a GyenBox file, then confirm the Core cursor advances.

## Rollback

- If the migration Job fails, stop. Do not deploy the runner image.
- If the canary fails, leave traffic on the prior verified application revision.
- If traffic has already moved, return traffic to that prior revision. Keep the
  new Core tables in place: they are additive and harmless to older revisions.
- Never delete a prior Cloud Run revision, a domain mapping, a DNS record, or a
  Cloudflare Worker route as part of this rollout.
