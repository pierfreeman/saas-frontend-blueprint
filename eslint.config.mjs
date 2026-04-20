import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allow: [
            String.raw`^.*/eslint(\.base)?\.config\.[cm]?[jt]s$`,
            String.raw`^.*/environments/.*$`,
            String.raw`^(auth|platform|admin)/Routes$`,
          ],
          ignoredCircularDependencies: [
            ['shared-util-rbac', 'memberships-data-access'],
            ['shared-util-rbac', 'entitlements-data-access'],
            ['shared-util-error', 'auth-data-access'],
            ['shared-util-error', 'memberships-data-access'],
            ['entitlements-data-access', 'shared-util-error'],
            ['auth-data-access', 'shared-util-error'],
            ['memberships-data-access', 'shared-util-rbac'],
            ['memberships-data-access', 'shared-util-error'],
          ],
          depConstraints: [
            // ── type axis ──────────────────────────────────────────────────
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:data-access',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:util', 'type:data-access'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util', 'type:data-access'],
            },

            // ── scope axis ─────────────────────────────────────────────────
            // shared libs can cross domain boundaries (cross-cutting orchestrators)
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:ai',
                'scope:auth',
                'scope:organizations',
                'scope:memberships',
                'scope:billing',
                'scope:entitlements',
                'scope:tasks',
                'scope:notifications',
                'scope:storage',
                'scope:activity-log',
              ],
            },
            // scope isolation applies only to type:data-access libs
            // feature libs intentionally orchestrate across domains
            {
              allSourceTags: ['scope:auth', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:auth', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:organizations', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:organizations', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:memberships', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:memberships', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:billing', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:billing', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:entitlements', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:entitlements', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:tasks', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:tasks', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:notifications', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:notifications', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:storage', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:storage', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:activity-log', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:activity-log', 'scope:shared'],
            },
            {
              allSourceTags: ['scope:ai', 'type:data-access'],
              onlyDependOnLibsWithTags: ['scope:ai', 'scope:shared'],
            },
          ],
        },
      ],
    },
  },
  // Disable boundary checks for test files — specs statically import the
  // component under test even when the app loads it lazily.
  {
    files: ['**/*.spec.ts', '**/*.spec.mts'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  // Disable boundary checks for eslint config files themselves
  {
    files: ['**/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  // Disable boundary checks for module-federation configs (cross-app imports are expected)
  {
    files: ['apps/*/module-federation.config.ts'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  // Disable boundary checks for shell app routing (MF remote lazy-loading)
  {
    files: ['apps/*/src/app/app.routes.ts'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
