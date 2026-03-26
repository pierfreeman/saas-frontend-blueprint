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
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            '^.*/environments/.*$',
            '^(auth|platform|admin)/Routes$',
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
            // domain libs are isolated: can only depend on their own scope + shared
            {
              sourceTag: 'scope:auth',
              onlyDependOnLibsWithTags: ['scope:auth', 'scope:shared'],
            },
            {
              sourceTag: 'scope:organizations',
              onlyDependOnLibsWithTags: ['scope:organizations', 'scope:shared'],
            },
            {
              sourceTag: 'scope:memberships',
              onlyDependOnLibsWithTags: ['scope:memberships', 'scope:shared'],
            },
            {
              sourceTag: 'scope:billing',
              onlyDependOnLibsWithTags: ['scope:billing', 'scope:shared'],
            },
            {
              sourceTag: 'scope:entitlements',
              onlyDependOnLibsWithTags: ['scope:entitlements', 'scope:shared'],
            },
            {
              sourceTag: 'scope:tasks',
              onlyDependOnLibsWithTags: ['scope:tasks', 'scope:shared'],
            },
            {
              sourceTag: 'scope:notifications',
              onlyDependOnLibsWithTags: ['scope:notifications', 'scope:shared'],
            },
            {
              sourceTag: 'scope:storage',
              onlyDependOnLibsWithTags: ['scope:storage', 'scope:shared'],
            },
            {
              sourceTag: 'scope:activity-log',
              onlyDependOnLibsWithTags: ['scope:activity-log', 'scope:shared'],
            },
          ],
        },
      ],
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
