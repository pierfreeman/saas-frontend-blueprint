import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['auth', 'platform', 'admin'],
  shared: (libraryName, defaultConfig) => defaultConfig,
};

export default config;