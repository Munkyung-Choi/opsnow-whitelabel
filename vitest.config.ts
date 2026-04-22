import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // 파서는 순수 함수 — DOM 불필요
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'tests/security/**/*.test.ts',
      'tests/lib/**/*.test.ts',
    ],
    exclude: ['node_modules/**'],
    // WL-150: 통합 테스트(features-check-constraint / update-partner-feature-rpc /
    //   features-sync, rls-isolation 등)가 공유 DB 행을 동시에 건드려 race condition 발생.
    //   파일 간 병렬을 비활성화하여 시퀀셜 실행. 단일 테스트 파일 내 describe 병렬은 유지.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
