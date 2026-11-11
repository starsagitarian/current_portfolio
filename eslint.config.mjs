// Lint rules for the API, the shared package and root tooling.
// The web app lints itself with the Next.js rules (apps/web/eslint.config.mjs).
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/",
    "**/dist/",
    "**/coverage/",
    "**/.vercel/",
    "test-results/",
    "playwright-report/",
    "apps/web/",
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
]);
