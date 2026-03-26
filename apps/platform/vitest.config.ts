import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// When running via Nx (nx run platform:test), NX_TASK_TARGET_PROJECT is set.
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
        'src/environments/environment': resolve(
          __dirname,
          'src/environments/environment.ts',
        ),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      isolate: false,
      setupFiles: isNxRun ? [] : [resolve(__dirname, 'src/test-setup.mjs')],
    },
  };
});
