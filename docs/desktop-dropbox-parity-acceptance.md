# GyenBox Desktop Dropbox-Parity Acceptance Plan

This document is the release gate for GyenBox Desktop. A version is not considered successful because it builds or launches. It is successful only when the checks below pass on a real Windows machine.

## Product Rule

GyenBox Desktop should feel like a sync client, not a movable app window.

The desktop panel is a tray panel:

- It opens from the tray/taskbar area.
- It is anchored near the tray by default.
- It is not freely resizable.
- It should not behave like a normal document window.
- Closing the panel hides it, but sync keeps running.
- The user/account entry belongs in the lower-left rail, similar to Dropbox.

## v0.1.11 Priority

The next version must prioritize function clarity before visual polish.

Order:

1. Sign-in and sync state clarity.
2. Local folder upload reliability.
3. Tray-panel behavior.
4. Compact UI polish.
5. Installer branding.

If a release improves the look but still leaves the user confused about whether sync is working, it fails.

## P0: Sign-In And Queue Clarity

Current problem: files are detected and queued, but the user sees no useful reason why they are not uploading.

Required behavior:

- When no access token/session exists, title says `Sign in required`.
- If files are waiting, detail says `2 files waiting for sign-in`.
- The primary action is `Sign in`, not `Pause`.
- The status bar says `Waiting for sign-in`, not `Watching test`.
- Activity item says `Queued until sign-in`.

How to test:

1. Install GyenBox Desktop fresh.
2. Choose `C:\Users\Ethan\Desktop\test`.
3. Put one image in the folder without signing in.
4. Open the panel.

Pass condition:

- Queued count increases.
- The UI explicitly says the file is waiting because sign-in is missing.
- The user does not need to guess why upload is not happening.

Fail condition:

- UI only says `Watching test` or `File queued` without explaining sign-in is required.

## P0: Real Upload Path

Required behavior:

- After sign-in/token is present, queued files upload automatically.
- A file transitions through `Queued -> Uploading -> Uploaded`.
- The same modified file updates the existing cloud file instead of creating duplicates.

How to test:

1. Add a valid Supabase access token or complete the sign-in flow.
2. Drop `68a19f54.jpg` into the test folder.
3. Wait for the panel state to change.
4. Refresh `https://gyenbox.com/workspace`.
5. Edit or replace the same local file.
6. Refresh the web app again.

Pass condition:

- Web shows the uploaded file.
- Modified same file does not create a duplicate row.
- Desktop shows `Up to date` after upload.

Fail condition:

- File remains queued forever after sign-in.
- Web does not show the uploaded file.
- Replacing the same file creates duplicate cloud files.

## P1: Tray Panel Behavior

Current problem: the panel behaves like a normal movable window.

Required behavior:

- Tray click toggles the panel.
- Panel appears near the taskbar tray.
- Window is fixed-size or nearly fixed-size.
- It should not invite dragging around as a normal app.
- It should not appear as a big full app in the user workflow.

How to test:

1. Click the GyenBox tray/taskbar icon.
2. Click outside the panel.
3. Click the tray icon again.
4. Try resizing the panel.

Pass condition:

- Panel opens near tray consistently.
- It hides/shows predictably.
- Resize handles are absent or ineffective.
- It feels like Dropbox's compact tray panel.

Fail condition:

- It opens in random locations.
- It behaves like a normal resizable desktop app.

## P1: Lower-Left Account Entry

Required behavior:

- Bottom of the left rail shows account/avatar state.
- Signed out state shows a simple account icon.
- Signed in state shows initials/avatar.
- Clicking it opens account/sign-in actions.

How to test:

1. Open panel signed out.
2. Inspect lower-left rail.
3. Click account entry.

Pass condition:

- User immediately understands where login/account lives.

Fail condition:

- Sign-in is hidden in Settings only.

## P1: Visible Tray Icon

Current problem: tray icon is too faint or invisible.

Required behavior:

- Icon is visible on Windows dark taskbar.
- Icon is visible on light backgrounds.
- Sync states are distinguishable: idle, syncing, error, paused, signed out.

How to test:

1. Open Windows taskbar overflow.
2. View GyenBox icon on dark taskbar.
3. Switch to light taskbar/theme if available.

Pass condition:

- Icon can be recognized at 16px/20px.

Fail condition:

- It appears as a blank square, faint mark, or unclear blob.

## P1: Tray Panel Physical Size

Target behavior:

- Match Dropbox tray-menu scale before adding more visual detail.
- Logical panel width target is `360px` to `380px` at 100% Windows scale.
- On the user's current 4K display at 175% Windows scale, this should feel about `11 cm` wide and `16 cm` tall.
- Current GyenBox panel is approximately `18.4 cm` wide and `25 cm` tall on the same display, which is too large for a tray sync client.
- Next compacting pass should reduce the panel toward Dropbox scale before adding more features.

Pass condition:

- The panel feels like a tray utility, not a small tablet app.
- It can sit near the taskbar without dominating a 27 inch 4K desktop.
- Status, account, folder, and recent activity remain readable after compaction.

Fail condition:

- The panel remains closer to an iPad mini or book-sized surface than a Dropbox-style tray panel.

## P2: Compact UI Polish

Required behavior:

- Keep current outer panel size unless a functional reason requires change.
- Reduce visual heaviness inside the panel.
- Use smaller buttons and lighter font weights.
- Search field should be shorter and less dominant.
- Activity rows should be dense but readable.

How to test:

Compare against Dropbox panel screenshot:

- Does GyenBox feel like a sync utility rather than a large app page?
- Can a user scan status in under two seconds?

Pass condition:

- Status, account, folder, and activity are clear without looking bulky.

Fail condition:

- Big buttons dominate the panel.
- Typography feels loud or crude.

## P2: Installer Branding

Current problem: default NSIS installer looks unbranded.

Required behavior:

- Installer icon uses GyenBox brand.
- Header image and sidebar image are custom.
- Copy says `Install GyenBox Desktop` and `Private sync for your files`.
- Finish page launches GyenBox.

How to test:

1. Uninstall GyenBox.
2. Run the new installer.
3. Screenshot each installer step.

Pass condition:

- Installer looks intentional and branded.

Fail condition:

- It still looks like default NSIS.

## Version Exit Checklist

Before publishing a new R2 installer:

- Desktop typecheck passes.
- Web typecheck passes if API changed.
- Windows installer builds successfully.
- R2 versioned installer uploaded.
- R2 latest installer uploaded.
- Public R2 HEAD returns expected content length.
- Installed app shows the new version behavior.
- Test folder file detection verified.
- Signed-out queue clarity verified.

## Immediate Recommendation

Build v0.1.11 as a functionality-clarity release:

1. Make signed-out queued state impossible to misunderstand.
2. Add lower-left account entry.
3. Make panel fixed and tray-like.
4. Improve icon visibility.
5. Only then refine typography and installer branding.
