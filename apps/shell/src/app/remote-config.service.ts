import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Routes } from '@angular/router';
import { init } from '@module-federation/runtime';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RemoteUnavailableComponent } from './remote-unavailable/remote-unavailable.component';

type RemotesConfig = Record<string, string>;

/**
 * Manages the Module Federation runtime configuration for the shell.
 *
 * Responsibilities:
 *  1. At app init: fetches /remotes.json and registers remote entry URLs with
 *     the MF 2.x runtime so the shell can load remotes from any URL without
 *     being rebuilt (provideAppInitializer → loadConfig).
 *  2. At navigation time: wraps `loadChildren` factories with error handling
 *     so a failed remote renders a fallback instead of crashing the shell
 *     (loadRoutes).
 *
 * In development, webpack's dev-server resolves remotes automatically via the
 * `devRemotes` in shell/project.json — loadConfig() is a no-op.
 */
@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  readonly #http = inject(HttpClient);
  #config: RemotesConfig = {};

  /**
   * Fetches /remotes.json and calls MF runtime init() with the loaded URLs.
   *
   * Called once via provideAppInitializer() before the router activates, so
   * every subsequent loadChildren call has the correct remote URLs available.
   *
   * In development this is a no-op: webpack's module-federation-dev-server
   * handles remote resolution using the devRemotes config in project.json.
   */
  async loadConfig(): Promise<void> {
    if (!environment.production) {
      return;
    }
    try {
      this.#config = await firstValueFrom(
        this.#http.get<RemotesConfig>('/remotes.json'),
      );
      init({
        name: 'shell',
        remotes: Object.entries(this.#config).map(([name, entry]) => ({
          name,
          entry,
        })),
      });
    } catch (error) {
      // A failed config fetch means each remote will load from the URL webpack
      // resolved at build time (localhost defaults in dev, or last known prod
      // URL). Individual route fallbacks below prevent a total shell crash.
      console.error(
        '[MF] Could not load remote config — remotes may be unavailable:',
        error,
      );
    }
  }

  /**
   * Returns the configured entry URL for a named remote, or undefined.
   * Useful for diagnostics and health checks.
   */
  getRemoteUrl(name: string): string | undefined {
    return this.#config[name];
  }

  /**
   * Wraps a federated `loadChildren` factory with per-remote error handling.
   *
   * If the remote bundle fails to load (network error, version mismatch,
   * mismatched shared singletons, etc.) this returns a fallback route that
   * renders RemoteUnavailableComponent instead of propagating the error to
   * the shell's global error handler.
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
