import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'admin',
  exposes: {
    './Routes': './apps/admin/src/app/remote-entry/entry.routes.ts',
  },
};

export default config;
