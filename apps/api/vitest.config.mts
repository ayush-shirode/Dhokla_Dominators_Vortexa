import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DB_FILE: ':memory:',
      DATA_DIR: path.join(os.tmpdir(), `rationsaathi-test-${process.pid}`),
      ANTHROPIC_API_KEY: '',
      ADMIN_TOKEN: 'test-admin-token',
    },
  },
});
