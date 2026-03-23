import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'admin',
  exposes: {
    './Routes': './apps/admin/src/app/remote-entry/entry.routes.ts',
  },
  shared: (libraryName, defaultConfig) => {
    if (libraryName.startsWith('@org/')) {
      return { singleton: true, strictVersion: false, requiredVersion: false };
    }
    return defaultConfig;
  },
};

export default config;
