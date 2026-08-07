#!/usr/bin/env node
/**
 * Guards the client bundle against syntax/APIs that older Safari cannot handle.
 *
 * FATAL patterns are *parse-time* failures — they kill the entire chunk, which
 * surfaces as `Loading chunk N failed. (timeout: ...)` after webpack's 120s
 * chunkLoadTimeout, with a perfectly healthy network. That is the bug this
 * script exists to prevent from ever shipping again.
 *
 * CSS patterns (see the CSS section below) are WARN-only: unsupported CSS
 * degrades gracefully (the declaration/token is just dropped), it doesn't
 * take down the page the way a JS parse failure does. The CSS/TSX checks
 * scan *our own source* (`src/`), not the compiled `.next` output — the
 * compiled bundle mixes in Tailwind's own default palette, Tailwind's
 * `@property` internals, and vendor packages like `shadcn/dist/tailwind.css`
 * (a `.shimmer`/`scroll-fade` utility using unguarded `oklch(from ...)`),
 * none of which are fixable from this repo. Scanning source instead of
 * output means the guard only ever flags code we can actually act on, with
 * no vendor-exclusion list to maintain as dependencies change.
 *
 * Usage:
 *   node scripts/check-legacy-safari.mjs
 *   node scripts/check-legacy-safari.mjs --dir .next/static/chunks --css-dir src --ts-dir src --warn-only
 *
 * Wire it up:
 *   "scripts": { "postbuild": "node scripts/check-legacy-safari.mjs" }
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const dirArg = args.indexOf('--dir');
const ROOT = dirArg !== -1 ? args[dirArg + 1] : '.next/static/chunks';
const cssDirArg = args.indexOf('--css-dir');
const CSS_ROOT = cssDirArg !== -1 ? args[cssDirArg + 1] : 'src';
const tsDirArg = args.indexOf('--ts-dir');
const TS_ROOT = tsDirArg !== -1 ? args[tsDirArg + 1] : 'src';
const WARN_ONLY = args.includes('--warn-only');

/**
 * NOTE on the `static {` pattern:
 * A naive `[};,)]static\s*\{` MISSES the very common minified form
 * `class A{static{...}}` because the preceding char is `{`, not `}`.
 * The lookbehind-free guard below ("not preceded by a dot or word char")
 * catches every real form: `{static{`, `}static{`, `;static{`, ` static {`.
 */
const FATAL = [
  {
    name: 'class static initialization block',
    since: 'Safari 16.4 / iOS 16.4',
    re: /(^|[^.\w$'"`])static\s*\{/,
    fix: 'Add the package to transpilePackages, or patch it (static { this.x = v } -> static x = v).',
  },
  {
    name: 'RegExp lookbehind (?<= / (?<!',
    since: 'Safari 16.4 / iOS 16.4',
    re: /\(\?<[=!]/,
    fix: 'CANNOT be transpiled. Upgrade or patch the dependency to use capture groups instead.',
  },
  {
    name: 'RegExp v flag (unicodeSets)',
    since: 'Safari 17 / iOS 17',
    re: /new RegExp\((?:[^)]{0,200}?),\s*["'`][a-z]*v[a-z]*["'`]\)/,
    fix: 'CANNOT be transpiled. Replace with the u flag equivalent.',
  },
];

/** Runtime APIs — these throw TypeError at call time. They break a feature, not the chunk. */
const WARN = [
  {
    name: 'Array.prototype.toSorted / toReversed / toSpliced / with',
    since: 'Safari 16.4 / iOS 16.4',
    re: /\.(toSorted|toReversed|toSpliced)\s*\(/,
  },
  {
    name: 'Object.groupBy / Map.groupBy',
    since: 'Safari 17.4 / iOS 17.4',
    re: /\b(?:Object|Map)\.groupBy\s*\(/,
  },
  {
    name: 'Array.prototype.findLast / findLastIndex',
    since: 'Safari 15.4 / iOS 15.4',
    re: /\.findLast(?:Index)?\s*\(/,
  },
];

/**
 * CSS — unsupported here degrades quietly (the browser drops the one
 * declaration/token, not the whole stylesheet), so these are WARN, never
 * FATAL. See "CSS: oklch() and color-mix() need manual fallbacks" in
 * CLAUDE.md for the fix pattern these are meant to enforce. Checked against
 * both `src/**\/*.css` (with @supports/fallback awareness) and
 * `src/**\/*.{ts,tsx}` (Tailwind arbitrary values, inline `style` props —
 * no @supports equivalent exists there, so any match always warns).
 */
const CSS_WARN = [
  { name: 'oklch()', since: 'Safari 15.4 / iOS 15.4', re: /\boklch\(/i },
  { name: 'oklab()', since: 'Safari 15.4 / iOS 15.4', re: /\boklab\(/i },
  { name: 'color-mix()', since: 'Safari 16.2 / iOS 16.2', re: /\bcolor-mix\(/i },
  { name: '@property', since: 'Safari 16.4 / iOS 16.4', re: /@property\b/i },
  { name: 'plus-lighter (blend mode)', since: 'Safari 16.4 / iOS 16.4', re: /\bplus-lighter\b/i },
];

function walk(dir, test, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, test, out);
    else if (test.test(entry)) out.push(full);
  }
  return out;
}

/** Blanks out CSS `/* *\/` comments (preserving length/newlines, so position-based
 * logic downstream doesn't need to know stripping happened) so prose like "this
 * needs oklch() fallbacks" in our own comments doesn't self-trigger the guard. */
function stripCssComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Same idea for TS/TSX: blanks `//` and `/* *\/` comments. String/template
 * literals are matched and passed through untouched in the same pass, so a
 * URL like "https://example.com" isn't mistaken for a line comment. */
function stripJsComments(src) {
  const re = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  return src.replace(re, (m) => (m.startsWith('/*') || m.startsWith('//') ? m.replace(/[^\n]/g, ' ') : m));
}

/**
 * Minimal brace-nesting index over a CSS file: for every `{...}` block,
 * records its header (whatever text precedes the `{` — a selector or an
 * at-rule prelude like `@supports (...)`) and its [start, end) char range.
 * Not a real CSS parser (doesn't know about strings), but comments are
 * already stripped by this point and this codebase's CSS has no string
 * values containing braces, so a plain brace count is reliable.
 */
function parseBlocks(src) {
  const blocks = [];
  const stack = [];
  let lastBoundary = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      const headerStart = lastBoundary;
      const block = { header: src.slice(headerStart, i).trim(), headerStart, start: i, end: -1 };
      blocks.push(block);
      stack.push(block);
      lastBoundary = i + 1;
    } else if (ch === '}') {
      const block = stack.pop();
      if (block) block.end = i;
      lastBoundary = i + 1;
    } else if (ch === ';') {
      // Without this, a block header absorbs whatever declaration/at-rule
      // preceded it since the last `{`/`}` (e.g. a `box-shadow: ...;` right
      // before a nested `@supports (...) {`), so the header no longer starts
      // with "@supports" and isProtectedBySupports/isInSupportsCondition
      // both silently fail. Bit me on `.bosla-progress-track` and
      // `shadow-card`/`shadow-card-hover`, which nest @supports inside a
      // rule that has an earlier `;`-terminated declaration.
      lastBoundary = i + 1;
    }
  }
  return blocks;
}

/** True if `pos` falls inside an `@supports (...)` *prelude* — i.e. the
 * condition text itself (which routinely contains the literal substring
 * "color-mix(" as part of the feature query), not a real usage. */
function isInSupportsCondition(blocks, pos) {
  return blocks.some((b) => b.header.startsWith('@supports') && pos >= b.headerStart && pos < b.start);
}

/** True if `pos` falls inside the body of an `@supports (...) { ... }` block —
 * the primary protection mechanism this whole file's fallback pattern relies on. */
function isProtectedBySupports(blocks, pos) {
  return blocks.some((b) => b.header.startsWith('@supports') && b.start < pos && (b.end === -1 || b.end > pos));
}

/** Walks back from `pos` to find the enclosing declaration's property name
 * and the position of its `:`. Returns null if `pos` isn't inside a normal
 * `prop:value` declaration (e.g. it's inside a selector or an at-rule like
 * `@property` that has no preceding `:`). */
function findDeclaration(src, pos) {
  let i = pos;
  while (i > 0 && src[i] !== ':') {
    if (src[i] === ';' || src[i] === '{' || src[i] === '}') return null;
    i--;
  }
  if (src[i] !== ':') return null;
  const colonPos = i;
  let j = colonPos - 1;
  while (j >= 0 && src[j] !== ';' && src[j] !== '{' && src[j] !== '}') j--;
  return { propName: src.slice(j + 1, colonPos).trim(), colonPos };
}

/** True if, earlier in the same enclosing rule body, the same property was
 * already given a plain value (no CSS_WARN pattern in it) — the other valid
 * fallback shape: `prop: safe; prop: oklch(...);` (later decl wins where
 * supported; drops silently — leaving the plain one in effect — where not). */
function hasEarlierFallback(src, blocks, pos, propName) {
  if (!propName) return false;
  const enclosing = blocks.filter((b) => b.start < pos && (b.end === -1 || b.end > pos));
  if (!enclosing.length) return false;
  const innermost = enclosing.reduce((a, b) => (b.start > a.start ? b : a));
  const before = src.slice(innermost.start + 1, pos);
  const escaped = propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[;{])\\s*${escaped}\\s*:([^;}]*)`, 'g');
  let m;
  while ((m = re.exec(before))) {
    if (!CSS_WARN.some((rule) => rule.re.test(m[1]))) return true;
  }
  return false;
}

/** One hit per (file, rule) — mirrors the JS checks' report-once convention
 * instead of spamming every occurrence in a large stylesheet. */
function scanCssFile(file) {
  const src = stripCssComments(readFileSync(file, 'utf8'));
  const blocks = parseBlocks(src);
  const hits = [];
  for (const rule of CSS_WARN) {
    const flags = rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g';
    const re = new RegExp(rule.re.source, flags);
    let m;
    let unprotected = false;
    while ((m = re.exec(src))) {
      const pos = m.index;
      if (isInSupportsCondition(blocks, pos)) continue; // part of the @supports query text, not a usage
      if (isProtectedBySupports(blocks, pos)) continue; // gated
      const decl = findDeclaration(src, pos);
      if (decl && hasEarlierFallback(src, blocks, decl.colonPos, decl.propName)) continue; // plain-then-override
      unprotected = true;
      break;
    }
    if (unprotected) hits.push({ file, rule });
  }
  return hits;
}

/** TSX/TS: Tailwind arbitrary values (`bg-[oklch(...)]`) and inline `style`
 * props. No `@supports` equivalent exists in a className string or a style
 * object, so any match here is unconditionally unprotected. */
function scanTsFile(file) {
  const src = stripJsComments(readFileSync(file, 'utf8'));
  const hits = [];
  for (const rule of CSS_WARN) {
    if (rule.re.test(src)) hits.push({ file, rule });
  }
  return hits;
}

if (!existsSync(ROOT)) {
  console.error(`\n  ✗ ${ROOT} not found. Run the build first.\n`);
  process.exit(1);
}

const files = walk(ROOT, /\.m?js$/);
const fatalHits = [];
const warnHits = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const rule of FATAL) if (rule.re.test(src)) fatalHits.push({ file, rule });
  for (const rule of WARN) if (rule.re.test(src)) warnHits.push({ file, rule });
}

let cssFiles = [];
let cssWarnHits = [];
if (existsSync(CSS_ROOT)) {
  cssFiles = walk(CSS_ROOT, /\.css$/);
  for (const file of cssFiles) cssWarnHits.push(...scanCssFile(file));
}

let tsFiles = [];
if (existsSync(TS_ROOT)) {
  // Test/story files run in CI's Chromium, never real Safari, and never
  // ship — a match there isn't a production risk, just noise.
  tsFiles = walk(TS_ROOT, /\.tsx?$/).filter((f) => !/\.(stories|test|spec)\.tsx?$/i.test(f));
  for (const file of tsFiles) cssWarnHits.push(...scanTsFile(file));
}

const rel = (f) => relative(process.cwd(), f);

console.log(`\n  Legacy Safari guard — scanned ${files.length} files in ${ROOT}`);
if (cssFiles.length || tsFiles.length) {
  console.log(`  and ${cssFiles.length} CSS + ${tsFiles.length} TS/TSX files in ${CSS_ROOT}`);
}
console.log('');

if (warnHits.length) {
  console.log('  ⚠  Runtime APIs missing in older Safari (feature breaks, chunk still loads):\n');
  for (const { file, rule } of warnHits) {
    console.log(`     ${rule.name}  [${rule.since}]`);
    console.log(`       ${rel(file)}\n`);
  }
}

if (cssWarnHits.length) {
  console.log('  ⚠  CSS unsupported in older Safari, not behind @supports or a plain fallback (degrades quietly):\n');
  for (const { file, rule } of cssWarnHits) {
    console.log(`     ${rule.name}  [needs ${rule.since}]`);
    console.log(`       ${rel(file)}`);
    console.log(`       → wrap in @supports (color: color-mix(in srgb, red, red)) with a plain fallback before it\n`);
  }
}

if (fatalHits.length) {
  console.log('  ✗  PARSE-TIME failures — these kill the entire chunk on older Safari:\n');
  for (const { file, rule } of fatalHits) {
    console.log(`     ${rule.name}  [needs ${rule.since}]`);
    console.log(`       ${rel(file)}`);
    console.log(`       → ${rule.fix}\n`);
  }
  console.log('  Verify on a real device: Safari > Develop > [iPhone] > your site > Console.\n');
  if (!WARN_ONLY) process.exit(1);
}

if (!fatalHits.length) {
  console.log('  ✓  No parse-time incompatibilities found.\n');
}
