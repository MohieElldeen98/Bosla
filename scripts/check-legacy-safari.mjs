#!/usr/bin/env node
/**
 * Guards the client bundle against syntax/APIs that older Safari cannot handle.
 *
 * FATAL patterns are *parse-time* failures — they kill the entire chunk, which
 * surfaces as `Loading chunk N failed. (timeout: ...)` after webpack's 120s
 * chunkLoadTimeout, with a perfectly healthy network. That is the bug this
 * script exists to prevent from ever shipping again.
 *
 * Usage:
 *   node scripts/check-legacy-safari.mjs
 *   node scripts/check-legacy-safari.mjs --dir .next/static/chunks --warn-only
 *
 * Wire it up:
 *   "scripts": { "postbuild": "node scripts/check-legacy-safari.mjs" }
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const dirArg = args.indexOf('--dir');
const ROOT = dirArg !== -1 ? args[dirArg + 1] : '.next/static/chunks';
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

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.m?js$/.test(entry)) out.push(full);
  }
  return out;
}

if (!existsSync(ROOT)) {
  console.error(`\n  ✗ ${ROOT} not found. Run the build first.\n`);
  process.exit(1);
}

const files = walk(ROOT);
const fatalHits = [];
const warnHits = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const rule of FATAL) if (rule.re.test(src)) fatalHits.push({ file, rule });
  for (const rule of WARN) if (rule.re.test(src)) warnHits.push({ file, rule });
}

const rel = (f) => relative(process.cwd(), f);

console.log(`\n  Legacy Safari guard — scanned ${files.length} files in ${ROOT}\n`);

if (warnHits.length) {
  console.log('  ⚠  Runtime APIs missing in older Safari (feature breaks, chunk still loads):\n');
  for (const { file, rule } of warnHits) {
    console.log(`     ${rule.name}  [${rule.since}]`);
    console.log(`       ${rel(file)}\n`);
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
