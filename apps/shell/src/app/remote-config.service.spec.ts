import { TestBed } from '@angular/core/testing';
import { Routes } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { RemoteConfigService } from './remote-config.service';

describe('RemoteConfigService', () => {
  let service: RemoteConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RemoteConfigService);
  });

  it('returns routes from the loader on success', async () => {
    const routes: Routes = [{ path: '', children: [] }];
    const loader = vi.fn().mockResolvedValue(routes);

    const result = await service.loadRoutes('auth', loader);

    expect(result).toBe(routes);
    expect(loader).toHaveBeenCalledOnce();
  });

  it('returns a fallback route with RemoteUnavailableComponent on loader failure', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('chunk failed'));
    vi.spyOn(console, 'error').mockImplementation(vi.fn());

    const result = await service.loadRoutes('platform', loader);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('**');
    expect(result[0].data).toEqual({ remoteName: 'platform' });
  });

  it('logs the error to console when loader fails', async () => {
    const err = new Error('network error');
    const loader = vi.fn().mockRejectedValue(err);
    const spy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

    await service.loadRoutes('admin', loader);

    expect(spy).toHaveBeenCalledWith(
      "[MF] Remote 'admin' failed to load:",
      err,
    );
  });
});
