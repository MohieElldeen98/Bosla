# Legacy Safari compatibility — DO NOT REMOVE

This section documents a real production incident and its fix. The
artifacts listed here work together; removing any one of them silently
reopens the bug. Read this before touching `browserslist`, `transpilePackages`,
or `scripts/check-legacy-safari.mjs`.

## Root cause

Some third-party packages ship **pre-built** dist code containing native
ES2022 **class static-initialization blocks** (`class A { static { ... } }`),
a syntax Safari only parses from **16.4** onward. Currently that's just:

- `intl-messageformat@11.2.9` (a transitive dep of `next-intl`/`use-intl`)

**Historical note:** `@heroui/react`'s dependencies (`react-aria-components`,
`react-aria`, `react-stately`) also hit this bug and needed `pnpm patch`
fixes — see "Why patches instead of transpilePackages" below. HeroUI was
removed from the app entirely (2026-07-30), which dropped those packages
from the tree along with their patches. **If a react-aria-based UI library
is ever reintroduced, expect this exact class of bug again** — check git
history for `patches/react-aria*.patch` and `pnpm-workspace.yaml`'s old
`patchedDependencies` block for the fix that worked last time.

SWC (Next's compiler) only transpiles **first-party app code** to the
`browserslist` target — it never touches pre-built `node_modules` output
unless a package is explicitly listed in `transpilePackages`. Without that,
the raw ES2022 syntax passes straight through into the shipped bundle
untouched, regardless of what target this app's own code compiles to.

On Safari < 16.4, that syntax is a **parse-time** error: the whole chunk
containing it fails to load — not just the one feature that used it.

## The symptom is misleading

Real device logs show:

```
ChunkLoadError: Loading chunk N failed. (timeout: ...)
```

...surfacing ~120s after page load (webpack's `chunkLoadTimeout`), **on a
perfectly healthy network**. This looks exactly like a slow-connection or
stale-deploy chunk failure, and it is neither.

**If you see this again: do not investigate the network, i18n, or the root
layout first.** Confirm on a real affected device (Safari > Develop >
[device] > Console) whether the actual error is a `SyntaxError` ("Unexpected
token '{'") rather than a genuine network failure. If it's a `SyntaxError`,
the fetch already succeeded — the file loaded, it just couldn't be parsed.
Go straight to scanning the built bundle for unsupported syntax (see the
grep below, or just run the guard script).

## The files — do not remove any of them

| File | Why it exists |
|---|---|
| `browserslist` field in `package.json` | Sets an explicit target (`safari 15`, alongside modern Chrome/Edge/Firefox) instead of relying on Next's undocumented internal default. This is what `transpilePackages` downlevels *to*. |
| `transpilePackages` in `next.config.ts` | Forces SWC to also transpile `intl-messageformat` — the one offending package whose static blocks live in files reachable through its normal `exports` map, so this mechanism actually applies to it. |
| `scripts/check-legacy-safari.mjs` (wired as `postbuild` in `package.json`) | Scans every built chunk for this exact class of parse-time-fatal syntax (plus a few Safari-16.4+/17+/17.4+ APIs) so a future dependency bump can't reintroduce this silently. |

## Why patches instead of transpilePackages (historical, for react-aria)

When HeroUI was still a dependency, its `react-aria-components`/`react-aria`/
`react-stately` deps had the same static-block problem, but `transpilePackages`
couldn't fix them: their static blocks lived in `dist/private/*` files, and
each package's own `package.json` `exports` map explicitly set
`"./private/*": null`, deliberately blocking that subpath from external
resolution — so SWC's transform never reached them (confirmed empirically:
adding `react-aria-components` to `transpilePackages` did not remove its
static blocks from the output). The fix that worked was a targeted `pnpm
patch` rewriting each trivial single-assignment block (`static { this.type =
'x'; }`) as a plain static class field (`static type = 'x';` — same
semantics, supported since Safari 14.1). Keep this in mind if a future
dependency hits the same `exports`-map wall: `transpilePackages` won't help,
go straight to `pnpm patch`.

## Correct detection pattern

```bash
grep -rlE '(^|[^.a-zA-Z0-9_$])static[[:space:]]*\{' .next/static/chunks
```

**Do not use** `[};,)]static\s*\{` — it looks correct but misses the extremely
common minified form `class A{static{...}}`, because the character
immediately before `static` there is `{`, not one of `}`, `;`, `,`, `)`. That
gap is exactly how this bug went undetected for a while. `scripts/check-legacy-safari.mjs`
implements the same corrected logic natively in JS.

## Cost: zero

This fix has no performance cost. First Load JS for the homepage stayed at
**159 kB** before and after every change described here.

## If the guard blocks a deploy

`scripts/check-legacy-safari.mjs` runs as `postbuild` and exits non-zero on a
FATAL hit, failing the build on purpose. If it fires:

1. **Read its output** — it names the exact pattern and file.
2. **Do not delete or disable the script** to unblock the deploy.
3. If you need to ship immediately, rerun with `--warn-only` to unblock
   without losing the signal, e.g. `node scripts/check-legacy-safari.mjs --warn-only`.
4. Fix the real cause (patch the package, or add it to `transpilePackages` if
   its offending file is actually reachable through that mechanism) and
   restore the strict (non-`--warn-only`) check **in the same PR**.

### CSS: oklch() and color-mix() need manual fallbacks

Tailwind v4 targets Safari 16.4. `oklch()` and `color-mix()` are unsupported
on Safari 15 — tokens defined with them are dropped, and every `var()` reading
them resolves to `unset`. This broke the entire color system on iOS 15 (hero
glow rendered as a hard-edged blob; body text lost contrast).

Pattern: hex/rgba fallback first, then one
`@supports (color: color-mix(in srgb, red, red))` fork holding the real values.
Gate on `color-mix` — it's the higher bar (16.2 vs 15.4), so it's a superset.

- `.dark` needs its own fork. Without it, its plain fallbacks win over
  `:root`'s `@supports` values on modern browsers too.
- `--daylight` is light-locked by design. It must never get a `.dark` override.
- `.bosla-progress-track` is the one documented per-site exception: `currentColor`
  resolves at render time and can't be tokenised. Uses `opacity: 0.2` pre-support,
  which is mathematically equivalent since the element has no children.

Cost: +930 B gzipped for full coverage.

`scripts/check-legacy-safari.mjs` checks for this too, scanning `src/**/*.css`
and `src/**/*.{ts,tsx}` (not the compiled `.next` output — that mixes in
Tailwind's own default palette, its `@property` internals, and vendor CSS
like `shadcn/dist/tailwind.css`, none of which are fixable from this repo).
A match only warns if it's outside an `@supports` block *and* has no plain
fallback declared earlier in the same rule — so this file's own pattern
never self-triggers it. `*.stories.tsx`/`*.test.tsx`/`*.spec.tsx` are excluded
(CI's Chromium, never real Safari, never ships).
