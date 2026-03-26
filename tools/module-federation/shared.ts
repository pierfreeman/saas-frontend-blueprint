import type { SharedFunction } from '@nx/module-federation';

/**
 * Shared library configuration for all Module Federation remotes and the shell.
 *
 * All workspace libs (@org/*) are shared as singletons so that InjectionToken
 * instances (e.g. API_BASE_URL) are the same object reference across every
 * remote bundle — preventing duplicate service instances and broken DI chains.
 *
 * All other libraries fall back to webpack's default sharing behaviour.
 */
export const sharedMappings: SharedFunction = (libraryName, defaultConfig) => {
  if (libraryName.startsWith('@org/')) {
    return { singleton: true, strictVersion: false, requiredVersion: false };
  }
  return defaultConfig;
};
