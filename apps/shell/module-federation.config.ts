import { ModuleFederationConfig } from '@nx/module-federation';
import { sharedMappings } from '../../tools/module-federation/shared';

// In production (Vercel), REMOTE_*_URL env vars are set in the project settings
// and are available at build time. Nx resolves the base URL to the full remote
// entry path (appending /remoteEntry.mjs automatically for Angular+webpack).
// In dev, the string form lets Nx auto-resolve the remote via devRemotes config.
function remote(name: string, envVar: string): string | [string, string] {
  const url = process.env[envVar];
  return url ? [name, url] : name;
}

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: [
    remote('auth', 'REMOTE_AUTH_URL'),
    remote('platform', 'REMOTE_PLATFORM_URL'),
  ],
  shared: sharedMappings,
};

export default config;
