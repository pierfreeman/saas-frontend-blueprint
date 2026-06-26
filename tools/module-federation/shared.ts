import type { SharedFunction } from '@nx/module-federation';

/**
 * Shared library configuration for all Module Federation remotes and the shell.
 *
 * All workspace libs (@saas-frontend/*) are shared as singletons so that InjectionToken
 * instances (e.g. API_BASE_URL) are the same object reference across every
 * remote bundle — preventing duplicate service instances and broken DI chains.
 *
 * RxJS is shared as a singleton to prevent multiple instances across remotes.
 *
 * All other libraries fall back to webpack's default sharing behaviour.
 */
export const sharedMappings: SharedFunction = (libraryName, defaultConfig) => {
  // Workspace libraries: always share as singletons for DI consistency
  if (libraryName.startsWith('@saas-frontend/')) {
    return { singleton: true, strictVersion: false, requiredVersion: false };
  }

  // Share rxjs as a singleton to avoid duplication across remotes
  if (libraryName === 'rxjs') {
    return { singleton: true, strictVersion: false, requiredVersion: false };
  }

  // Skip rxjs subentries and internal packages - webpack handles them via rxjs singleton
  if (libraryName.startsWith('rxjs/')) {
    return false;
  }

  // Use default sharing for all other packages
  return defaultConfig;
};
