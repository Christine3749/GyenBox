# GyenBox Design Style

> This note records the current product visual direction so future Web, Desktop, and Mobile work stays consistent.

## North Star

GyenBox should feel like a private file workspace: quiet, exact, trustworthy, and useful on the first screen. It is a file manager, not a marketing site.

The interface should make files, sync state, account capacity, and direct actions visible immediately. Avoid decorative layouts that hide the actual product behind hero copy, large empty cards, or generic SaaS treatment.

## Product Feel

- Calm, focused, and operational.
- Dense enough for repeated file work, but still readable.
- Physical brand object: the 3D GY box logo. Other UI surfaces stay restrained.
- File objects are the main visual content: names, icons, status, size, modified time, share state, and upload/download state.
- Copy is short and practical. Prefer clear status text over feature explanation.

## Typography

- Web UI font: `iA Writer Quattro S` via `--gb-font-ui`.
- Metadata and technical values: `iA Writer Mono S` via `--gb-font-mono`.
- Android may use system fonts, with monospace only for capacity, status codes, paths, and identifiers.
- Do not scale font size with viewport width.
- Keep compact panels on compact type. Reserve hero-scale type only for true branded first impressions.

## Color System

Current Web base tokens live in `apps/web/app/globals.css`:

| Token | Value | Use |
|---|---:|---|
| `--gb-paper` | `#F9F8F6` | App background |
| `--gb-paper-muted` | `#F4F2EE` | Muted surface |
| `--gb-paper-raised` | `#FFFDF9` | Raised controls and panels |
| `--gb-ink` | `#1A1A1A` | Primary text |
| `--gb-muted` | `#686764` | Secondary text |
| `--gb-faint` | `#9A9690` | Tertiary text |
| `--gb-line` | `#E2DDD3` | Borders and separators |
| `--gb-iris` | `#8896C6` | Primary brand accent |
| `--gb-iris-soft` | `#E7EAF5` | Accent surface |
| `--gb-blue` | `#4F87A6` | Info / image family |
| `--gb-green` | `#6F8F78` | Success / spreadsheet family |
| `--gb-rose` | `#B56B77` | PDF / danger family |
| `--gb-amber` | `#B08A45` | Warning / warm status |

Use the paper and ink system as the default Web identity. Dark mode exists as a focused `moon` skin, not as a neon product. Avoid drifting into one-note purple, beige, dark slate, or espresso palettes.

## File Type Color Families

Current file swatches in the Web workspace:

| Type | Accent | Surface |
|---|---:|---:|
| Folder / doc / text | `#5F74C4` | `#E7EAF5` |
| Image | `#4F87A6` | `#E4F0F5` |
| PDF | `#B56B77` | `#F4E4E7` |
| Spreadsheet | `#6F8F78` | `#E5EDE6` |
| Video | `#7566A8` | `#EBE6F4` |
| Archive / unknown | `#7C7A73` | `#ECE9E3` |

These should remain soft and scannable. The color communicates type; it should not dominate the screen.

## Layout

- First screen is the usable workspace, not a landing page.
- Prefer toolbars, split panes, file lists, breadcrumbs, dialogs, and status strips over promotional sections.
- Use 1px borders, restrained shadows, and stable panel dimensions.
- Cards are only for repeated items, dialogs, or genuinely framed tools. Do not nest cards inside cards.
- Border radius should stay modest, generally 8px or less unless a platform control requires otherwise.
- Fixed-format UI such as file rows, icon buttons, counters, and toolbar controls must have stable dimensions to avoid layout shift.
- Text must fit its container on desktop and mobile. Use wrapping, truncation, or smaller component typography instead of oversized labels.

## Controls

- Use icon buttons for common actions: upload, download, refresh, rename, delete, share, search, sort, view mode, settings.
- Use tooltips for unfamiliar icons.
- Use segmented controls for modes, toggles for binary settings, sliders or numeric inputs for quantities, and menus for option sets.
- Primary actions should be direct and visible, but the page should remain work-focused.
- Destructive actions use restrained danger styling and clear confirmation.

## Web Workspace

- Default skin: light paper workspace with crisp file-manager structure.
- Supported skins: `sun` and `moon`; supported platform chrome: `windows` and `mac`.
- Body currently has `min-width: 880px`, so Web is desktop-first. Mobile-specific work should be intentional, not accidental compression.
- Search, upload, folder creation, storage usage, and user identity should remain visible in the shell.
- Download and upload status text should describe real operation state, not generic loading.

## Desktop

- Desktop is a utility surface: tray, sync folder, auth, status, logs, and shell integration.
- The globe button opens `https://gyenbox.com` and should remain an external official-site shortcut.
- Tray icon uses a dedicated transparent `tray-icon.png`; do not resize the system tray slot as a branding workaround.
- Desktop copy should emphasize sync truth: signed in, syncing, up to date, paused, failed, or needs attention.

## Android Direction

- Android can use the darker bottom-nav reference, but it should still feel like GyenBox: quiet, status-rich, and file-first.
- Mobile surfaces should prioritize Home, Files, Shared, and Settings with direct upload/download/offline actions.
- Use native Android patterns for touch, permissions, background work, and system sharing.
- Do not copy Windows Cloud Files placeholder behavior onto Android.

## Avoid

- Generic SaaS hero pages as the main app screen.
- Large decorative gradients, orbs, blurred stock imagery, and purely atmospheric backgrounds.
- UI cards inside UI cards.
- Big rounded text pills where an icon, switch, tab, or menu is the expected control.
- Hidden file actions that require reading instructions on the page.
- Single-hue themes that make every surface feel like the same color family.
