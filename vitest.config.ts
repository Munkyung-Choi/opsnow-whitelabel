import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // 파서는 순수 함수 — DOM 불필요
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/security/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
