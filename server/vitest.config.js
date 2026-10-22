import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret' },
    // The first run downloads a MongoDB binary for the test database.
    hookTimeout: 600000,
    testTimeout: 30000,
    fileParallelism: false,
  },
});
