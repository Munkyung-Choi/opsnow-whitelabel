import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Honor _-prefixed intentional unused variables/params (destructuring omit pattern).
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  // App Router layout.tsx — <link> font loading is valid and deduped by Next.js.
  // The @next/next/no-page-custom-font rule targets Pages Router _document.js only.
  {
    files: ['**/layout.tsx'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
    },
  },
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
  // § 9.3 컴포넌트 도메인 경계 강제 (CLAUDE.md)
  // admin 영역(컴포넌트 + 페이지) → marketing 컴포넌트 참조 금지
  {
    files: ["src/components/admin/**", "src/app/admin/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/components/marketing/**"],
          message: "Admin 영역에서 Marketing 컴포넌트를 import할 수 없습니다. 두 도메인에서 모두 쓰인다면 src/components/shared/로 이동하세요.",
        }],
      }],
    },
  },
  // marketing 영역(컴포넌트 + 페이지) → admin 컴포넌트 참조 금지
  {
    files: ["src/components/marketing/**", "src/app/[...slug]/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/components/admin/**"],
          message: "Marketing 영역에서 Admin 컴포넌트를 import할 수 없습니다.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
