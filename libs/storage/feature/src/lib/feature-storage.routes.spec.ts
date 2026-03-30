import { vi } from 'vitest';
import { FEATURE_STORAGE_ROUTES } from './feature-storage.routes';

vi.mock('./storage.component', () => ({
  StorageComponent: class MockStorageComponent {},
}));

describe('FEATURE_STORAGE_ROUTES', () => {
  it('defines a single route at the empty path', () => {
    expect(FEATURE_STORAGE_ROUTES).toHaveLength(1);
    expect(FEATURE_STORAGE_ROUTES[0].path).toBe('');
  });

  it('lazily loads StorageComponent', async () => {
    const route = FEATURE_STORAGE_ROUTES[0];
    expect(route.loadComponent).toBeDefined();
    const { StorageComponent } = await import('./storage.component');
    const loaded = await route.loadComponent!({} as never);
    expect(loaded).toBe(StorageComponent);
  });
});
