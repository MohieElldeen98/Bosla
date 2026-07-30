# Color Palette (Bosla / بوصلة)

Source of truth: `src/app/globals.css` (CSS custom properties, `:root` for
light, `.dark` for dark). The system is authored in **OKLCH**; hex values
below are derived for convenience (Figma, design tools, quick reference) —
not the canonical source.

Every color below shares the exact same **hue = 265.5** except
`achievement` and `destructive`/`danger` — the neutrals aren't pure gray,
they carry a deliberate faint indigo bias.

## Light mode (current production)

| Role | Hex | OKLCH | Notes |
|---|---|---|---|
| **Primary (brand)** | `#284fc7` | `oklch(0.478 0.192 265.5)` | Logo, primary buttons, CTAs |
| Primary foreground | `#fafafa` | `oklch(0.985 0 0)` | Text/icons on primary |
| Accent (HeroUI) | `#284fc7` | `oklch(0.478 0.192 265.5)` | Deliberately identical to primary — theme bridge |
| Tint (pale hover bg) | `#e2ebff` | `oklch(0.94 0.03 265.5)` | Light hover/selected background, not the brand color itself |
| Tint foreground | `#142d77` | `oklch(0.33 0.13 265.5)` | Text on tint |
| **Achievement (brass/gold)** | `#9d6300` | `oklch(0.55 0.12 70)` | Separate hue — deals, certificates, discounts only |
| Destructive / danger | `#e7000b` | `oklch(0.577 0.245 27.325)` | Errors, warnings |
| Background | `#fdfdff` | `oklch(0.995 0.002 265.5)` | Not pure white — faint indigo bias |
| Foreground (body text) | `#0a0d14` | `oklch(0.16 0.015 265.5)` | Not pure black — same bias |
| Muted / secondary | `#f0f2f8` | `oklch(0.962 0.008 265.5)` | Secondary surfaces |
| Muted foreground | `#5d6370` | `oklch(0.5 0.022 265.5)` | Secondary/descriptive text |
| Border | `#dee2ea` | `oklch(0.912 0.012 265.5)` | Borders, dividers |
| Card / surface | `#ffffff` | `oklch(1 0 0)` | Cards, popovers |

## Dark mode (defined, less exercised in production so far)

| Role | OKLCH |
|---|---|
| Background | `oklch(0.155 0.012 265.5)` |
| Foreground | `oklch(0.985 0.004 265.5)` |
| Card / popover | `oklch(0.205 0.015 265.5)` |
| Primary / accent | `oklch(0.72 0.15 265.5)` |
| Primary foreground | `oklch(0.145 0 0)` |
| Secondary / muted | `oklch(0.265 0.016 265.5)` |
| Muted foreground | `oklch(0.72 0.02 265.5)` |
| Tint | `oklch(0.3 0.08 265.5)` |
| Tint foreground | `oklch(0.9 0.06 265.5)` |
| Achievement | `oklch(0.8 0.13 80)` |
| Achievement foreground | `oklch(0.24 0.06 80)` |
| Destructive / danger | `oklch(0.704 0.191 22.216)` |
| Border | `oklch(1 0 0 / 10%)` |

## Naming note

`tint`/`tint-foreground` used to be named `accent`/`accent-foreground` —
renamed during the HeroUI homepage/navbar rebuild to free up the `accent`
name for HeroUI's own theme slot (which now points at the same value as
`primary`). See `CLAUDE.md` history / `next.config.ts` comments if this
naming looks unfamiliar in old commits.
