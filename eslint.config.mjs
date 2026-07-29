// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript"), {
  ignores: [
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    // Claude Code local settings + project-local skills — third-party
    // dev tooling (own scripts/tests), not app code. Already gitignored.
    ".claude/**",
    // A worktree checkout is a second copy of this repo (its own
    // .eslintrc-covered tree) nested inside this one — without this,
    // linting from the main repo also scans its node_modules/.next.
    ".worktrees/**",
    // design-sync (claude.ai/design) staged converter scripts + build
    // output — vendored/generated, not app code. Already gitignored.
    ".ds-sync/**",
    "ds-bundle/**",
    ".design-sync/sb-reference/**",
    ".design-sync/.cache/**",
  ],
}, {
  rules: {
    // The "destructure to omit" idiom (e.g. sanitize-*-html.ts's
    // `const { target: _target, rel: _rel, ...rest } = attribs`) binds
    // names that are intentionally never read — the point is excluding
    // them from `rest`. Without this, the rule can't tell that apart
    // from a genuinely forgotten unused variable.
    "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
  },
}, ...storybook.configs["flat/recommended"]];

export default eslintConfig;
