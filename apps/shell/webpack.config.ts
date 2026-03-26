import { withModuleFederation } from '@nx/module-federation/angular';
import config from './module-federation.config';

/**
 * DTS Plugin is disabled in Nx Workspaces as Nx already provides Typing support for Module Federation
 * The DTS Plugin can be enabled by setting dts: true
 * Learn more about the DTS Plugin here: https://module-federation.io/configure/dts.html
 */
const mfConfig = withModuleFederation(config, { dts: false });

export default async (cfg: any) => {
  const result = await (await mfConfig)(cfg);
  result.watchOptions = {
    ignored: [
      '**/node_modules/**',
      '**/.nx/**',
      '**/.angular/**',
      '**/dist/**',
      '**/coverage/**',
    ],
  };
  return result;
};
