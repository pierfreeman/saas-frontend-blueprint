import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Stub module federation remotes that can't be resolved in the test environment
const mfStub = resolve(__dirname, 'src/testing/mf-stubs.ts');

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'auth/Routes': mfStub,
      'admin/Routes': mfStub,
      'platform/Routes': mfStub,
    },
  },
  test: {
    environment: 'jsdom',
  },
});
