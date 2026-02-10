import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60000, // 60s for API calls
    hookTimeout: 120000, // 120s for container startup
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Single-threaded to avoid container conflicts
      },
    },
  },
  resolve: {
    alias: {
      '@triliumnext/commons': path.resolve(__dirname, './Trilium/src'),
    },
  },
});
