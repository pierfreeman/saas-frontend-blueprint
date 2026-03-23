import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['auth', 'platform', 'admin'],
  shared: (libraryName, defaultConfig) => {
    // Workspace libs must be shared as singletons so InjectionToken
    // instances (e.g. API_BASE_URL) are the same object across remotes.
    if (libraryName.startsWith('@org/')) {
      return { singleton: true, strictVersion: false, requiredVersion: false };
    }
    return defaultConfig;
  },
};

export default config;
