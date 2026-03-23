import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'src/environments/environment': resolve(
        __dirname,
        'src/environments/environment.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
