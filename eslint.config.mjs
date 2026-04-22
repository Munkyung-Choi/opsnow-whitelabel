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
  // WL-149 — 컴포넌트 비대화·복잡도 거버넌스 (God Component 재발 방지)
  // max-lines 위반 시 대응: CLAUDE.md §8 참조 (컴포넌트 분할 or 선언적 패턴 도입 검토)
  {
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", { max: 15 }],
    },
  },
  // 테스트 파일 — 시나리오 설명 가독성 우선. max-lines 미적용.
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "max-lines": "off",
    },
  },
  // 기존 부채 Ratchet — 현 수치를 상한으로 고정. 개선 시 하향, 재성장 시 error.
  {
    files: ["src/proxy.ts"],
    rules: {
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["src/lib/marketing/parsers.ts"],
    rules: {
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["src/components/marketing/FaqHubClient.tsx"],
    rules: {
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  // 운영 스크립트(scripts/) — RLS 검증·AI 감사 등 개발자 수동 실행 도구.
  // 런타임 번들 미포함. 절차형 로직이라 길어지는 특성 허용.
  {
    files: ["scripts/**/*.{ts,mjs,js}"],
    rules: {
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
]);

export default eslintConfig;
