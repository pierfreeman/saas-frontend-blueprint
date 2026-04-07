import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// When running via Nx (nx run admin:test), NX_TASK_TARGET_PROJECT is set.
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
      watch: false,
      coverage: {
        provider: 'v8',
        reportsDirectory: resolve(__dirname, '../../coverage/admin'),
        reporter: ['text', 'lcov', 'html'],
        include: [`${__dirname}/src/**/*.ts`],
        exclude: [
          `${__dirname}/src/**/*.spec.ts`,
          `${__dirname}/src/main.ts`,
          `${__dirname}/src/bootstrap.ts`,
          `${__dirname}/src/environments/**`,
          `${__dirname}/src/app/remote-entry/entry.ts`,
          `${__dirname}/src/app/app.routes.ts`,
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  };
});
