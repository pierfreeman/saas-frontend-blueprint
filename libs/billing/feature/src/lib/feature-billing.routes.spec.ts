import { vi } from 'vitest';
import { FEATURE_BILLING_ROUTES } from './feature-billing.routes';

vi.mock('./billing.component', () => ({
  BillingComponent: class MockBillingComponent {},
}));

describe('FEATURE_BILLING_ROUTES', () => {
  it('defines a single route at the empty path', () => {
    expect(FEATURE_BILLING_ROUTES).toHaveLength(1);
    expect(FEATURE_BILLING_ROUTES[0].path).toBe('');
  });

  it('lazily loads BillingComponent', async () => {
    const route = FEATURE_BILLING_ROUTES[0];
    expect(route.loadComponent).toBeDefined();
    const { BillingComponent } = await import('./billing.component');
    const loaded = await route.loadComponent!({} as never);
    expect(loaded).toBe(BillingComponent);
  });
});
