# design-sync notes — Bosla UI kit

This repo is a Next.js app, not a standalone/published design-system
package — `src/components/ui/*.tsx` (shadcn on top of `@base-ui/react`) is
its de facto design system, consumed directly by the app with no separate
`dist/` build step.

## Setup gotchas (read before re-running)

- **[GENERAL] No Storybook existed at first sync** — installed via
  `pnpm dlx storybook@latest init --type nextjs --package-manager pnpm --yes
  --no-dev --disable-telemetry`, then `pnpm exec storybook ai setup`'s guide
  was followed to author `.storybook/preview.tsx` (just adds
  `import '../src/app/globals.css'` — none of the synced components need
  providers, translations, or session context) and the 8 story files under
  `src/components/ui/*.stories.tsx`.
- **[GENERAL] The `--entry` file's package.json walk-up matters.** The
  converter finds `PKG_DIR` by walking up from `dirname(--entry)` looking
  for the nearest `package.json` with a `name` field. Since this repo has
  no such file inside `src/`, an entry placed directly at `src/foo.ts`
  walks all the way to the app's own root `package.json` (`name: "bosla"`)
  — wrong package entirely, and `exportedNames()` then finds 0 symbols.
  Fix: the synthetic entry lives in its own directory,
  `src/_design-sync-entry/`, with a dedicated `package.json` (`name:
  "bosla-ui"`, `types`/`main`: `"./index.ts"`) so the walk-up stops there.
  Underscore-prefixed so Next.js doesn't route it; not imported by the app.
- **[GENERAL] `cfg.cssEntry` and `cfg.tsconfig` are BOTH resolved relative
  to `PKG_DIR`**, not the repo root — `cfgPath()` in `package-build.mjs`
  always does `resolve(PKG_DIR, rel)`; the `root` param only affects the
  *containment bound* check, not the resolution base. Once `PKG_DIR` became
  `src/_design-sync-entry/` (previous bullet), `cssEntry:
  "src/app/globals.css"` and `tsconfig: "tsconfig.json"` both 404'd.
  - `tsconfig` fixed to the relative path from `PKG_DIR`:
    `"../../tsconfig.json"` (bounded to `workspaceRoot`, so this is fine).
  - `cssEntry` **cannot** be fixed the same way — its bound is `pkgRoot`
    itself (cssEntry content ships near-verbatim, so it's only ever allowed
    to read from inside `PKG_DIR`), and `src/app/globals.css` is a sibling
    directory, permanently outside `src/_design-sync-entry/`. Left
    `cssEntry` unset entirely; the `[CSS_FROM_STORYBOOK]` fallback (scrapes
    compiled CSS straight out of the storybook build) already produces the
    correct, fully-processed Tailwind + design-token stylesheet — no loss.
  - Synthetic entry files import components via **relative paths**
    (`../components/ui/button`), not the app's `@/` tsconfig alias — the
    ts-morph Project used for `exportedNames()`/`.d.ts` extraction
    (`lib/dts.mjs`'s `projectFor`) builds its own minimal
    `compilerOptions` with no `paths`/`baseUrl` wired in, so `@/…` imports
    inside the entry file itself don't resolve for that specific pass, even
    though esbuild's own bundling (a separate resolution path, which DOES
    read `cfg.tsconfig`) handles `@/…` imports fine everywhere else
    (inside the real component files themselves, e.g. `@/lib/utils`).
- **[GENERAL] `cfg.titleMap` was required for all 8 components** — none of
  the story files set a custom `title` (per the AI setup guide's own
  rule: "Don't add a custom title"), so Storybook auto-derives lowercase
  titles from the file path (`avatar`, `badge`, `button`, …) that don't
  case-match the PascalCase exports (`Avatar`, `Badge`, `Button`, …). Fixed
  with an explicit `titleMap` entry per component. Any newly-storied
  component needs the same treatment unless its story file sets an
  explicit `title` matching the export name.

## Grading learnings

- **[GENERAL] `play`-function timing causes a systematic `close` grade on
  4/8 components' `Default` story** — Tabs, Checkbox, Switch, Input all
  have a `play` function that performs an interaction (click a tab, check
  a box, toggle a switch, type into a field) to prove the interaction
  works. Storybook's own reference build replays the play function before
  its capture, so the reference screenshot shows the POST-interaction
  state; the compiled preview (compare.mjs's `?story=<Export>` render)
  captures the story's initial render and does not replay `play`, so it
  shows the PRE-interaction state instead. Styling is identical in every
  case — only the interaction state differs, and it's a real, expected
  state (not a defect). Graded `close` with a note on each affected
  Default story rather than `match`, per the rubric. No config knob found
  to make the preview capture replay `play` — if a future sync wants
  `match` instead of `close` on these, the fix would be moving the
  state-proving assertion off the `Default` story (e.g. a separate
  `AfterInteraction` story) so `Default` itself stays interaction-free.

## Sync scope (chosen 2026-07-29)

8 of the app's 21 `src/components/ui/*.tsx` files got full Storybook
stories + synced previews: **Button, Badge, Card, Input, Checkbox, Switch,
Avatar, Tabs**. The other 13 (accordion, combobox, dropdown-menu,
navigation-menu, progress, radio-group, select, separator, sheet, table,
textarea, label, reveal) are out of scope for now — not synced at all
(user chose the narrower scope over writing stories for all 21). Add
stories for any of them and re-run the driver to bring them in later.

## Re-sync risks

- `cssEntry` relies entirely on the `[CSS_FROM_STORYBOOK]` scrape from
  `.design-sync/sb-reference`'s compiled output — if the reference
  storybook build ever fails silently or its Tailwind/PostCSS pipeline
  changes, the shipped CSS could silently drift from `src/app/globals.css`
  without an explicit `cssEntry` mismatch to catch it. Spot-check the
  shipped `styles.css`/`_ds_bundle.css` against the app's real rendered
  output occasionally.
- The `[TOKENS_MISSING]` warning (21 CSS custom properties like
  `--disclosure-panel-height`, `--color-area-thumb-color`) is expected and
  triaged: these are HeroUI/react-aria-components internal state vars that
  leaked into the broad CSS scrape from the storybook build's global
  stylesheet — none of the 8 synced components use HeroUI, and render-check
  already confirmed 8/8 previews render cleanly. Not chased further.
- 13 of 21 UI-kit components are intentionally unsynced (see Sync scope
  above) — this is a scope decision, not a coverage gap to "fix."
