import { ModuleFederationConfig } from '@nx/module-federation';
import { sharedMappings } from '../../tools/module-federation/shared';

const config: ModuleFederationConfig = {
  name: 'auth',
  exposes: {
    './Routes': './apps/auth/src/app/remote-entry/entry.routes.ts',
  },
  shared: sharedMappings,
};

export default config;
