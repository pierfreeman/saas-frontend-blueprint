import { API_BASE_URL } from '@org/shared/util-types';
import { AuthApi } from '@org/auth/data-access';
import { PLATFORM_ROUTES } from './entry.routes';
import { RemoteEntry } from './entry';
import { environment } from 'src/environments/environment';

describe('PLATFORM_ROUTES', () => {
  const [root] = PLATFORM_ROUTES;

  it('has a single root route at path ""', () => {
    expect(root.path).toBe('');
  });

  it('renders RemoteEntry as the root component', () => {
    expect(root.component).toBe(RemoteEntry);
  });

  it('provides API_BASE_URL from the environment', () => {
    const provider = (
      root.providers as { provide: unknown; useValue: unknown }[]
    ).find((p) => p.provide === API_BASE_URL);
    expect(provider).toBeDefined();
    expect(provider!.useValue).toBe(environment.apiUrl);
  });

  it('provides AuthApi at route level', () => {
    const hasAuthApi = (root.providers as unknown[]).some((p) => p === AuthApi);
    expect(hasAuthApi).toBe(true);
  });
});
