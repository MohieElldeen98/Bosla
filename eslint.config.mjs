import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
      // Claude Code local settings + project-local skills — third-party
      // dev tooling (own scripts/tests), not app code. Already gitignored.
      ".claude/**",
    ],
  },
  {
    rules: {
      // The "destructure to omit" idiom (e.g. sanitize-*-html.ts's
      // `const { target: _target, rel: _rel, ...rest } = attribs`) binds
      // names that are intentionally never read — the point is excluding
      // them from `rest`. Without this, the rule can't tell that apart
      // from a genuinely forgotten unused variable.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
];

export default eslintConfig;
