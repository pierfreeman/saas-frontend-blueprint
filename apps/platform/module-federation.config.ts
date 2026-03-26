import { ModuleFederationConfig } from '@nx/module-federation';
import { sharedMappings } from '../../tools/module-federation/shared';

const config: ModuleFederationConfig = {
  name: 'platform',
  exposes: {
    './Routes': './apps/platform/src/app/remote-entry/entry.routes.ts',
  },
  shared: sharedMappings,
};

export default config;
