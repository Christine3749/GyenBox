# GyenBox Desktop Auth and Sync Architecture

This document defines the desktop authentication and sync design needed to move GyenBox from the current MVP into a Dropbox/Nextcloud-style desktop client.

## Current State

The desktop app currently opens `https://gyenbox.com/login?source=desktop` and waits for the user to paste a Supabase access token into the desktop settings panel.

That means a successful web login does not sign in the desktop app. The browser owns the web session, while the Electron process has no callback, device token, or refresh path.

The upload path is also MVP-level:

- Desktop watches a local folder with `chokidar`.
- Desktop stores local sync state in SQLite.
- Desktop reads the entire file into memory.
- Desktop sends multipart data to `/api/upload`.
- The web API buffers the file, writes metadata, then uploads to object storage.

This is enough for an early test, but it is not enough for a production sync client or large files.

## Design Goals

1. A user can sign in to the desktop app without copying tokens.
2. Each desktop install gets a device-scoped credential that can be revoked.
3. Desktop sync can run in the background after the web session expires.
4. The server never relies on browser cookies for desktop API calls.
5. Large uploads bypass the app server and go directly to object storage.
6. The architecture can grow toward millions of users without replacing the auth model.

## Reference Patterns

Dropbox uses browser-based OAuth for native clients. The desktop app starts authorization, the user signs in through the browser, and the app receives an authorization result that it exchanges for tokens. Dropbox recommends authorization code flow with PKCE and refresh tokens for clients that cannot safely keep a client secret.

Nextcloud Login Flow v2 is the closest fit for GyenBox. A desktop client asks the server for a login URL and poll token, opens the browser, polls until authorization completes, then receives a device credential. The user can revoke that device later from the web account UI.

OAuth for native apps also recommends external browsers plus a callback channel such as a loopback URL or custom scheme. Embedded webviews should not be the default authentication mechanism.

References:

- Dropbox OAuth Guide: https://developers.dropbox.com/oauth-guide
- Nextcloud Login Flow: https://docs.nextcloud.com/server/latest/developer_manual/client_apis/LoginFlow/index.html
- OAuth 2.0 for Native Apps, RFC 8252: https://www.rfc-editor.org/rfc/rfc8252

## Proposed Architecture

Use a GyenBox Desktop Login Flow inspired by Nextcloud Login Flow v2.

The first implementation should use polling because it is reliable across Windows installs and does not require registering a custom protocol handler before auth works. A custom `gyenbox://` callback can be added later as a speed improvement.

### Desktop Login Flow

1. User clicks `Sign in` in GyenBox Desktop.
2. Desktop calls `POST /api/desktop/login/start`.
3. Server creates a short-lived `DesktopLoginRequest`.
4. Server returns:
   - `loginUrl`
   - `pollToken`
   - `expiresAt`
   - `pollIntervalMs`
5. Desktop opens `loginUrl` in the default browser.
6. If the browser is signed in, the page shows `Connect this desktop?`.
7. If the browser is not signed in, the user signs in first, then sees the authorization page.
8. User approves the desktop device.
9. Web server creates or activates a `DeviceSession`.
10. Desktop polls `POST /api/desktop/login/poll`.
11. Poll succeeds and returns a desktop API token plus device metadata.
12. Desktop stores the token in the OS credential store.
13. Desktop updates its local settings and starts processing the sync queue.

### Why Polling First

Polling is less elegant than a native callback, but it is robust:

- No Windows protocol registration required.
- No local HTTP listener blocked by firewall software.
- No callback URL setup in Supabase required.
- Works the same on Vercel, Cloud Run, and future regions.
- Easy to add QR or manual fallback later.

### Later Callback Optimization

After polling works, add an optional custom protocol:

```text
gyenbox://desktop-auth/callback?requestId=...&code=...
```

Desktop registers the protocol with Electron:

```ts
app.setAsDefaultProtocolClient("gyenbox")
```

The callback should only wake the app and trigger a poll. It should not carry the long-lived device token.

## Data Model

Add these models to Prisma.

```prisma
model DesktopLoginRequest {
  id             String    @id @default(cuid())
  requestToken   String    @unique
  pollTokenHash  String    @unique
  deviceName     String?
  platform       String?
  appVersion     String?
  status         DesktopLoginStatus @default(PENDING)
  userId         String?
  user           User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceId       String?
  approvedAt     DateTime?
  expiresAt      DateTime
  createdAt      DateTime  @default(now())

  @@index([expiresAt])
  @@index([userId, createdAt])
}

model DeviceSession {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name              String
  platform          String
  appVersion        String?
  tokenHash         String    @unique
  refreshTokenHash  String?   @unique
  scopes            String[]
  lastSeenAt        DateTime?
  revokedAt         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId, revokedAt])
}

enum DesktopLoginStatus {
  PENDING
  APPROVED
  DENIED
  EXPIRED
  CONSUMED
}
```

If Prisma array support becomes inconvenient for the current database provider, store `scopes` as `Json` instead of `String[]`.

## API Surface

### `POST /api/desktop/login/start`

Unauthenticated endpoint called by the desktop app.

Request:

```json
{
  "deviceName": "Ethan's Windows PC",
  "platform": "windows",
  "appVersion": "0.1.11"
}
```

Response:

```json
{
  "loginUrl": "https://gyenbox.com/desktop/authorize?request=...",
  "pollToken": "...",
  "expiresAt": "2026-06-27T12:00:00.000Z",
  "pollIntervalMs": 1500
}
```

Server behavior:

- Generate high-entropy `requestToken` and `pollToken`.
- Store only `pollTokenHash`, never the raw poll token.
- Expire requests after 10 minutes.
- Rate limit by IP and device fingerprint.

### `GET /desktop/authorize`

Web page opened in the browser.

Behavior:

- Requires web authentication.
- If unauthenticated, redirect to `/login?next=/desktop/authorize?...`.
- Shows device name, app version, platform, and requested scopes.
- User can approve or deny.

### `POST /api/desktop/login/approve`

Authenticated web endpoint.

Behavior:

- Validates the logged-in user.
- Creates `DeviceSession`.
- Marks `DesktopLoginRequest` as `APPROVED`.
- Does not return the desktop token to the browser.

### `POST /api/desktop/login/poll`

Unauthenticated endpoint called by Desktop.

Request:

```json
{
  "pollToken": "..."
}
```

Pending response:

```json
{
  "status": "pending",
  "retryAfterMs": 1500
}
```

Approved response:

```json
{
  "status": "approved",
  "device": {
    "id": "dev_...",
    "name": "Ethan's Windows PC"
  },
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2026-06-27T13:00:00.000Z"
}
```

Server behavior:

- Return the device token only once.
- Mark request as `CONSUMED`.
- Hash tokens server-side.
- Reject expired, denied, or consumed requests.

### `POST /api/desktop/token/refresh`

Desktop endpoint for background refresh.

Request:

```json
{
  "refreshToken": "..."
}
```

Response returns a rotated access token and optionally a rotated refresh token.

### `POST /api/desktop/logout`

Revokes the current device session.

### `GET /api/devices`

Returns devices for the web membership/account center.

### `DELETE /api/devices/:id`

Revokes a desktop device from the web.

## Desktop Storage

Do not store long-lived tokens in plaintext `settings.json`.

Recommended:

- Use Windows Credential Manager through a package such as `keytar`.
- Store only non-sensitive display data in `settings.json`.
- Keep local SQLite sync state separate from credential state.

Desktop settings should evolve from:

```ts
type DesktopSettings = {
  apiBaseUrl: string
  accessToken: string
  syncFolder: string
  paused: boolean
}
```

To:

```ts
type DesktopSettings = {
  apiBaseUrl: string
  deviceId: string | null
  accountEmail: string | null
  syncFolder: string
  paused: boolean
}
```

The sync engine should request the current access token from a credential provider, not read it from settings.

## Desktop State Machine

```text
signed_out
  -> starting_login
  -> waiting_for_browser
  -> connected
  -> syncing
  -> token_expired
  -> refreshing
  -> connected

connected
  -> revoked
  -> signed_out
```

User-facing copy should be precise:

- `Sign in required`: no device session exists.
- `Waiting for browser authorization`: login flow is in progress.
- `Connected as ethan@example.com`: desktop has a device session.
- `Token expired, reconnecting`: refresh in progress.
- `Device revoked`: user revoked the desktop from web.

## Upload Architecture

The current `/api/upload` path should remain as a compatibility fallback, but desktop sync should move to direct object storage upload.

### Reservation Flow

1. Desktop detects file.
2. Desktop computes metadata:
   - relative path
   - size
   - modified time
   - sha256
   - mime type
3. Desktop calls `POST /api/sync/uploads/reserve`.
4. Server checks:
   - device token
   - membership
   - quota
   - file size
   - path ownership
5. Server returns:
   - upload ID
   - storage key
   - signed upload URL
   - required headers
   - expiration
6. Desktop uploads directly to GCS/R2.
7. Desktop calls `POST /api/sync/uploads/complete`.
8. Server verifies object metadata and writes `File`/`FileVersion`.

### Large File Support

For small files, a single signed PUT is enough.

For large files, use multipart/resumable upload:

- GCS resumable upload sessions, or
- R2 multipart upload, or
- tus protocol if we want provider-agnostic resumability.

Desktop should persist upload sessions in SQLite so it can resume after restart.

## Sync Metadata

Add server-side sync metadata before trying to build full Dropbox behavior.

```prisma
model SyncDevice {
  id             String   @id
  userId         String
  rootFolderId   String?
  cursor         String?
  lastSyncedAt   DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model SyncEvent {
  id           String   @id @default(cuid())
  userId       String
  deviceId     String?
  sequence     BigInt   @unique
  eventType    String
  resourceType String
  resourceId   String
  path         String
  metadata     Json?
  createdAt    DateTime @default(now())

  @@index([userId, sequence])
}
```

Desktop pulls changes with a cursor:

```text
GET /api/sync/changes?cursor=...
```

Server returns changed files, deleted files, folder changes, and a new cursor.

## Conflict Strategy

Initial rule:

- If a file changed locally and remotely since the last sync cursor, keep both.
- Rename local conflict copy to:
  `filename (Ethan's conflicted copy 2026-06-27).ext`

Later:

- Add per-file vector/version metadata.
- Add content-level merge for text formats only if needed.

## Scalability Path

### MVP Plus

- Desktop Login Flow v2.
- Device sessions and revoke.
- Direct upload reservation and completion.
- Single PUT upload for files below a threshold.
- Desktop local queue with retry and backoff.

### Production Sync

- Resumable multipart uploads.
- Sync cursor and server event log.
- Conflict copies.
- Device management in account center.
- Upload/download bandwidth throttling.
- Remote deletes and trash recovery.

### Million User Architecture

- Object storage handles file bytes.
- API handles auth, metadata, signed URLs, and completion.
- Postgres stores metadata, with connection pooling.
- Event queue handles async processing:
  - thumbnails
  - search indexing
  - virus scanning
  - quota recalculation
  - lifecycle cleanup
- Region-aware routing for Cloud Run.
- User data region assignment before storage writes.
- Observability per device, upload ID, and sync cursor.

## Security Requirements

- Never expose raw Supabase web session tokens to Desktop.
- Never store desktop tokens in plaintext files.
- Token hashes only in the database.
- Device tokens are scoped:
  - `files:read`
  - `files:write`
  - `sync:read`
  - `sync:write`
- Refresh tokens rotate.
- Device revoke is immediate.
- Login requests expire quickly.
- Poll endpoint is rate limited.
- Desktop upload completion validates object size and checksum.

## Implementation Order

1. Add `DesktopLoginRequest` and `DeviceSession` models.
2. Add login start, authorize, approve, and poll endpoints.
3. Add Desktop polling flow and remove manual token as the primary path.
4. Store credentials in OS credential storage.
5. Add device management UI to the member center.
6. Add upload reservation and completion endpoints.
7. Update Desktop to direct-upload small files.
8. Add resumable upload support for large files.
9. Add sync cursor and remote change pull.
10. Add conflict handling and device revoke UX.

## Open Decisions

1. Token issuer: use internal device tokens first, or integrate Supabase refresh tokens?
2. Credential storage package: `keytar`, Electron safeStorage, or Windows Credential Manager wrapper?
3. Object storage target for direct upload: GCS first, R2 first, or abstraction for both?
4. Initial callback: polling only, or polling plus `gyenbox://` callback?
5. Regional data model: keep global storage for now, or assign each user a home region before Taiwan production rollout?

## Recommendation

Implement Desktop Login Flow v2 first. It is the missing bridge that explains why the current desktop app cannot sign in after web login.

After that, replace desktop uploads with reservation plus direct object storage upload. This turns the app server from a file relay into a metadata and authorization service, which is the only sane path toward large files and high user counts.
