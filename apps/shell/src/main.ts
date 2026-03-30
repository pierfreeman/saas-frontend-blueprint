import 'zone.js';
import { environment } from './environments/environment';

async function bootstrap(): Promise<void> {
  if (environment.production) {
    // Dynamic Module Federation: resolve remote URLs at runtime from remotes.json
    // so the shell does not need to be rebuilt when remote URLs change.
    // Uses @module-federation/runtime (MF Enhanced 2.x) — the non-deprecated successor
    // to @nx/angular/mf setRemoteDefinitions().
    const [{ init }, remotes] = await Promise.all([
      import('@module-federation/runtime'),
      fetch('/remotes.json').then((res) => {
        if (!res.ok)
          throw new Error(`[MF] remotes.json fetch failed: ${res.status}`);
        return res.json() as Promise<Record<string, string>>;
      }),
    ]);
    init({
      name: 'shell',
      remotes: Object.entries(remotes).map(([name, entry]) => ({
        name,
        entry,
      })),
    });
  }
  await import('./bootstrap');
}

bootstrap().catch((err) => console.error('[MF] Bootstrap failed:', err));
