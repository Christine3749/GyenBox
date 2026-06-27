# GyenBox Desktop Client MVP

This is the first Windows desktop sync prototype. It is intentionally small and Dropbox-like: a tray process, a compact panel, a local GyenBox folder, a SQLite index, and a first upload queue.

## What MVP 1 does

- Creates and watches a local folder, by default `C:\Users\<you>\GyenBox`.
- Records local file state in SQLite under Electron `userData`.
- Detects root-level file creates and changes with `chokidar`.
- Calculates SHA-256 hashes before upload.
- Uploads files with `POST /api/upload/presign`, direct object-storage `PUT`, then `POST /api/upload/complete`.
- Shows queued/uploaded/failed counts in a tray panel.
- Supports pause/resume, rescan, retry failed, choose folder, and open folder.

## MVP 1 limitations

- Access token is pasted manually in Settings.
- Nested folders are detected but skipped until folder mapping lands.
- Cloud-to-local download is not implemented yet.
- Local delete does not delete the cloud copy yet.
- Windows Explorer overlay icons and right-click menus are not implemented yet.
- Uploads are whole-file uploads; chunked uploads and resume come later.

## Run

From the repo root:

```powershell
npm run desktop:dev
```

The app starts in the tray. Click the GyenBox tray icon to open the panel.

## Package

From the repo root:

```powershell
npm --workspace @gyenbox/desktop run pack:win
```

The Windows installer is written to:

```text
apps/desktop/release/GyenBox-Setup-0.1.11-x64.exe
```

This first installer is unsigned, so Windows may show a security warning before launch.

## Configure

Open the panel Settings view:

- `GyenBox API`: `https://gyenbox.com`
- `Access token`: a Supabase access token for the signed-in user
- `Local folder`: your local GyenBox folder

For local development you can also start with environment variables:

```powershell
$env:GYENBOX_API_BASE_URL='https://gyenbox.com'
$env:GYENBOX_ACCESS_TOKEN='<supabase-access-token>'
npm run desktop:dev
```

## Next phase

MVP 2 should add folder mapping and cloud cursor sync:

```text
local SQLite index
  -> local change queue
  -> metadata API folder mapping
  -> cloud change cursor
  -> download queue
```

MVP 3 should add Windows shell integration:

```text
Explorer overlay icons
right-click Copy GyenBox Link
Keep offline / Online only
startup service
```
