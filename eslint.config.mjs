import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Auto-generated files
    "src/types/supabase.ts",
    // Playwright 테스트 산출물 (bundled/minified — 소스 아님)
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
