import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'platform',
  exposes: {
    './Routes': './apps/platform/src/app/remote-entry/entry.routes.ts',
  },
};

export default config;
