import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/client/types.ts',
        'src/main.ts',
        'src/**/*.d.ts',
        'tests/**',
        'dist/**',
        'coverage/**',
        '*.config.ts',
        'build.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@triliumnext/commons': path.resolve(__dirname, './Trilium/src'),
    },
  },
});
