import { PLATFORM_ROUTES } from './entry.routes';
import { RemoteEntry } from './entry';

describe('PLATFORM_ROUTES', () => {
  const [root] = PLATFORM_ROUTES;

  it('has a single root route at path ""', () => {
    expect(root.path).toBe('');
  });

  it('renders RemoteEntry as the root component', () => {
    expect(root.component).toBe(RemoteEntry);
  });

  it('has no route-level providers (AuthStore is providedIn root)', () => {
    expect(root.providers).toBeUndefined();
  });
});
