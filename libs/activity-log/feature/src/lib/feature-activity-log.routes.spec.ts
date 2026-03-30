import { vi } from 'vitest';
import { FEATURE_ACTIVITY_LOG_ROUTES } from './feature-activity-log.routes';

vi.mock('./activity-log.component', () => ({
  ActivityLogComponent: class MockActivityLogComponent {},
}));

describe('FEATURE_ACTIVITY_LOG_ROUTES', () => {
  it('defines a single route at the empty path', () => {
    expect(FEATURE_ACTIVITY_LOG_ROUTES).toHaveLength(1);
    expect(FEATURE_ACTIVITY_LOG_ROUTES[0].path).toBe('');
  });

  it('lazily loads ActivityLogComponent', async () => {
    const route = FEATURE_ACTIVITY_LOG_ROUTES[0];
    expect(route.loadComponent).toBeDefined();
    const { ActivityLogComponent } = await import('./activity-log.component');
    const loaded = await route.loadComponent!({} as never);
    expect(loaded).toBe(ActivityLogComponent);
  });
});
