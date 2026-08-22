# iWriter macOS window standard

The approved light-mode direction is recorded in
`iwriter-macos-three-panel-concept-light-v3.png`.

## Geometry

- Native macOS titlebar height: **60 px**.
- Titlebar controls: **40 px**, optically centered with **10 px** vertical space.
- Library and document-list dividers meet the same titlebar baseline.
- The document-list sort row sits below the titlebar and is not part of the
  titlebar height.
- With the Library open, the traffic-light safe area belongs to the Library;
  with it closed, the safe area moves to the editor titlebar.

## Light materials

- Writing paper: `#FBFAF7`.
- Main chrome and document list: `#F4F3F0`.
- Library: cool pearl-to-pale-sage gradient from `#EEF4F7` to `#F2F5F3`.
- Primary type: `#242424`; secondary chrome type: `#5F5C58`.
- GyenBox focus blue: `#249FE7`.
- Separators are low-contrast hairlines; the Library shadow is wide and no
  stronger than five percent opacity.

## Platform behavior

- macOS uses the native application menu and a single 60 px in-window titlebar.
- Windows and the browser retain the in-window menu row and existing window
  controls.
- The macOS menu order is iWriter, File, Edit, Format, Authors, Focus, View,
  Window, Help.
