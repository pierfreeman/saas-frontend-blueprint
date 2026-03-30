import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const root = resolve(__dirname, '../../..');
const tscBase = JSON.parse(
  readFileSync(resolve(root, 'tsconfig.base.json'), 'utf8'),
);
const alias = Object.fromEntries(
  Object.entries(tscBase.compilerOptions.paths)
    .filter(([key]) => !key.endsWith('/Routes'))
    .map(([key, [value]]) => [key, resolve(root, value)]),
);

export default defineConfig(async () => {
  const angular = (await import('@analogjs/vite-plugin-angular')).default;
  return {
    plugins: [angular({ tsconfig: resolve(__dirname, 'tsconfig.spec.json') })],
    resolve: { alias },
    root: __dirname,
    test: {
      globals: true,
      environment: 'jsdom',
      isolate: false,
      setupFiles: [resolve(root, 'libs/test-setup.mjs')],
      include: ['src/**/*.spec.ts'],
      watch: false,
      coverage: {
        provider: 'v8',
        reportsDirectory: resolve(root, 'coverage/billing-data-access'),
        reporter: ['text', 'lcov', 'html'],
        include: ['src/lib/**/*.ts'],
        exclude: ['src/**/*.spec.ts', 'src/lib/**/*.types.ts'],
        thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  };
});
