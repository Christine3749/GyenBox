# iWriter Brand Standard

Version 1.0 — 2026-08-23

## Brand idea

The symbol combines three ideas in one silhouette: the lowercase `i`, a fountain
pen nib, and an open book. It represents an intelligent, local-first writing
space. The identity belongs to the GyenBox family but must not use GSYEN marks.

## Canonical assets

- `iwriter-icon-v1.png`: approved generated concept master; preserve permanently.
- `svg/iwriter-icon.svg`: production vector app-icon master.
- `svg/iwriter-mark.svg`: transparent standalone mark.
- `svg/iwriter-logo-light.svg`: primary logo for light backgrounds.
- `svg/iwriter-logo-dark.svg`: primary logo for dark backgrounds.
- `svg/iwriter-logo-mono-black.svg`: one-color black reproduction.
- `svg/iwriter-logo-mono-white.svg`: one-color reversed reproduction.
- `raster/`: generated PNG sizes, ICO and ICNS exports.

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#0B1018` | Primary mark and light-mode wordmark |
| Cobalt | `#0A54E8` | Signature dot and page accent |
| Cobalt Dark | `#4B82FF` | Dark-mode accent |
| Paper | `#F7F2E8` | Open-page detail |
| Ivory | `#FFFDF7` | Page highlight |
| Night | `#111722` | Recommended dark background |
| Mist | `#F4F6FA` | Dark-mode wordmark |

## Clear space and minimum size

Keep clear space equal to the blue dot's diameter on every side. Do not place
other text, borders or controls inside that area. Minimum digital sizes:

- App icon: 16 × 16 px.
- Standalone mark: 24 px high.
- Horizontal logo: 120 px wide; hide the `by GyenBox` endorsement below 180 px.

## Background choice

- Use `logo-light` on white, ivory and backgrounds lighter than 50% luminance.
- Use `logo-dark` on Night, black and backgrounds darker than 50% luminance.
- Use monochrome assets only where color reproduction is unavailable.

## Rules

Never stretch, rotate, outline, rearrange, recolor, crop or add effects to the
mark. Do not separate the dot, nib and pages. Do not replace the cobalt accent
with GSYEN colors. Do not typeset the name as `Iwriter`, `IWriter` or `iwriter`;
the canonical spelling is `iWriter`.

## Exporting

Run `npm run brand:export` in `apps/iwriter-desktop`, or run
`npm run iwriter-desktop:brand` from the repository root. The exporter creates
all standard PNG sizes, Windows ICO, macOS ICNS, and synchronized web assets.
