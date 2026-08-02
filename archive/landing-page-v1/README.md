# Landing page v1 — archived 2026-08-01

Frozen snapshot of the homepage as it stood right before the story-driven
("Confusion → Direction → Specialization → Confidence → Vision → Action")
rewrite began. Taken from the working tree, so it includes that day's
in-progress hero work (`NightSky` background + the `orbit-pathway` visual)
alongside the rest of the sections, matching what `/` actually rendered at
archive time.

This tree is **inert on purpose**: excluded from `tsconfig.json` and
`eslint.config.mjs` so it never needs to be kept compiling as the live app
evolves. Its imports (`@/...`) will only resolve again once files are moved
back under `src/`.

## What's here

| Path | Was |
|---|---|
| `app/page.tsx` | `src/app/[locale]/(public)/page.tsx` — the homepage route, assembling the sections below |
| `components/home/` | `src/components/home/` — hero, why-Bosla, courses, FAQ, contact-CTA sections + the night-sky/compass-mark visuals |
| `components/hero/` | `src/components/hero/` — the swappable hero illustration contract + the `orbit-pathway` visual (see its own `visuals/README.md`) |
| `messages/{en,ar}/home.json` | `messages/{en,ar}/home.json` — this version's copy strings |
| `globals.css` | `src/app/globals.css` — includes the `.hero-*`, `.night-sky` etc. custom classes this version depended on (file also has unrelated global styles; diff against the live copy if reusing a rule) |

## Restoring

Copy the piece you need back under `src/` (or `messages/`) at the matching
relative path — the `@/` alias resolves again once it's back inside `src/`.
No other wiring needed beyond what's already in each file.
