import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Stub module federation remotes that can't be resolved in the test environment
const mfStub = resolve(__dirname, 'src/testing/mf-stubs.ts');

// When running via Nx (nx run shell:test), NX_TASK_TARGET_PROJECT is set.
// In that case, the Angular CLI build pipeline handles compilation — we must NOT
// add @analogjs/vite-plugin-angular or our own setupFiles (Angular CLI manages them).
// When running directly (npx vitest run), we need the analog plugin + our setup file.
const isNxRun = !!process.env['NX_TASK_TARGET_PROJECT'];

export default defineConfig(async () => {
  const plugins = isNxRun
    ? []
    : [await import('@analogjs/vite-plugin-angular').then((m) => m.default())];

  return {
    plugins,
    resolve: {
      tsconfigPaths: true,
      alias: {
        'auth/Routes': mfStub,
        'admin/Routes': mfStub,
        'platform/Routes': mfStub,
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      isolate: false,
      setupFiles: isNxRun ? [] : [resolve(__dirname, 'src/test-setup.mjs')],
      coverage: {
        provider: 'v8',
        reportsDirectory: resolve(__dirname, '../../coverage/shell'),
        reporter: ['text', 'lcov', 'html'],
        include: ['src/**/*.ts'],
        exclude: [
          'src/**/*.spec.ts',
          'src/main.ts',
          'src/environments/**',
        ],
      },
    },
  };
});
