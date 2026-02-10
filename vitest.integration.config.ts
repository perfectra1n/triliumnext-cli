import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60000, // 60s for API calls
    hookTimeout: 120000, // 120s for container startup
    pool: 'forks',
    // Vitest 4: singleFork moved to top level
    singleFork: true, // Single process to share container state
    // Run test files sequentially to avoid container conflicts
    fileParallelism: false,
    // Global setup to start container once for all tests
    globalSetup: './tests/integration/global-setup.ts',
  },
  resolve: {
    alias: {
      '@triliumnext/commons': path.resolve(__dirname, './Trilium/src'),
    },
  },
});
