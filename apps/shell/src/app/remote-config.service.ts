import { Injectable } from '@angular/core';
import { Routes } from '@angular/router';
import { RemoteUnavailableComponent } from './remote-unavailable/remote-unavailable.component';

/**
 * Wraps Module Federation loadChildren factories with per-remote error handling.
 *
 * Remote entry URLs are baked into the webpack bundle at build time via
 * REMOTE_AUTH_URL / REMOTE_PLATFORM_URL / REMOTE_ADMIN_URL env vars (set in
 * Vercel project settings). No runtime URL override is needed.
 *
 * This service only handles the navigation-time fallback: if a remote fails to
 * load (network error, version mismatch, etc.) it returns a fallback route
 * that renders RemoteUnavailableComponent instead of crashing the shell.
 */
@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  /**
   * Wraps a federated `loadChildren` factory with per-remote error handling.
   *
   * Usage in app.routes.ts:
   *   loadChildren: () =>
   *     inject(RemoteConfigService).loadRoutes('auth', () =>
   *       import('auth/Routes').then(m => m.AUTH_ROUTES),
   *     ),
   *
   * The `import('auth/Routes')` syntax must remain inside the arrow function
   * passed as `loader` so webpack can statically analyze it and generate the
   * correct module-federation interop at build time.
   */
  async loadRoutes(
    remoteName: string,
    loader: () => Promise<Routes>,
  ): Promise<Routes> {
    try {
      return await loader();
    } catch (error) {
      console.error(`[MF] Remote '${remoteName}' failed to load:`, error);
      return [
        {
          path: '**',
          component: RemoteUnavailableComponent,
          data: { remoteName },
        },
      ];
    }
  }
}
