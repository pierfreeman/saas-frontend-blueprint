import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@saas-frontend/shared/util-types': resolve(
        __dirname,
        'libs/shared/util-types/src/index.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    isolate: false,
    setupFiles: [resolve(__dirname, 'libs/test-setup.mjs')],
  },
});
