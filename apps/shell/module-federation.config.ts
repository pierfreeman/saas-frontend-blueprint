import { ModuleFederationConfig } from '@nx/module-federation';
import { sharedMappings } from '../../tools/module-federation/shared';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['auth', 'platform', 'admin'],
  shared: sharedMappings,
};

export default config;
