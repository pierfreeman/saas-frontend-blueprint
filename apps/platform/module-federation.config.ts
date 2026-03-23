import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'platform',
  exposes: {
    './Routes': './apps/platform/src/app/remote-entry/entry.routes.ts',
  },
  shared: (libraryName, defaultConfig) => {
    if (libraryName.startsWith('@org/')) {
      return { singleton: true, strictVersion: false, requiredVersion: false };
    }
    return defaultConfig;
  },
};

export default config;
