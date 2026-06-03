import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['scripts/test/unit/**/*.test.ts', 'scripts/test/integration/**/*.test.ts'],
    setupFiles: ['scripts/test/vitest.setup.ts'],
    // Integration tests share one live dev DB; run serially to keep cleanup sane.
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
