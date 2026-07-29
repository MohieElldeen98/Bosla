# Legacy Safari compatibility — DO NOT REMOVE

This section documents a real production incident and its fix. The four
artifacts listed here work together; removing any one of them silently
reopens the bug. Read this before touching `browserslist`, `transpilePackages`,
`patches/`, or `scripts/check-legacy-safari.mjs`.

## Root cause

Several third-party packages ship **pre-built** dist code containing native
ES2022 **class static-initialization blocks** (`class A { static { ... } }`),
a syntax Safari only parses from **16.4** onward:

- `intl-messageformat@11.2.9` (a transitive dep of `next-intl`/`use-intl`)
- `react-aria-components`, `react-aria`, `react-stately` (deps of `@heroui/react`)

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

## The four files — do not remove any of them

| File | Why it exists |
|---|---|
| `browserslist` field in `package.json` | Sets an explicit target (`safari 15`, alongside modern Chrome/Edge/Firefox) instead of relying on Next's undocumented internal default. This is what `transpilePackages` downlevels *to*. |
| `transpilePackages` in `next.config.ts` | Forces SWC to also transpile `intl-messageformat` — the one offending package whose static blocks live in files reachable through its normal `exports` map, so this mechanism actually applies to it. |
| `patches/react-aria-components.patch`, `patches/react-aria.patch`, `patches/react-stately.patch` | Fix the same bug in three HeroUI dependencies where `transpilePackages` **does not work** (see below). Applied automatically by `pnpm install` via `pnpm-workspace.yaml`'s `patchedDependencies`. |
| `scripts/check-legacy-safari.mjs` (wired as `postbuild` in `package.json`) | Scans every built chunk for this exact class of parse-time-fatal syntax (plus a few Safari-16.4+/17+/17.4+ APIs) so a future dependency bump can't reintroduce this silently. |

## Why react-aria/react-aria-components/react-stately need patches, not transpilePackages

Their static blocks live in `dist/private/*` files. Each package's own
`package.json` `exports` map explicitly sets `"./private/*": null`, deliberately
blocking that subpath from external resolution. In practice this means
Next's `transpilePackages` path-matching does not reliably route these
specific files through SWC's transform — confirmed empirically (adding
`react-aria-components` to `transpilePackages` did not remove its static
blocks from the output; a targeted `pnpm patch` did). All four static blocks
found across these packages were trivial single-assignment blocks
(`static { this.type = 'x'; }`), safely rewritten as plain static class
fields (`static type = 'x';` — same semantics, but supported since Safari
14.1, well inside our target).

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
