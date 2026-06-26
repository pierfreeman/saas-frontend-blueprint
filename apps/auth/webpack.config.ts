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
  result.devServer = {
    ...result.devServer,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:4200',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  };
  return result;
};
