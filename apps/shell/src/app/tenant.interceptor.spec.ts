import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  OrganizationsStore,
  tenantInterceptor,
} from '@saas-frontend/organizations/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const API_URL = 'http://localhost:3000';

describe('tenantInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let store: OrganizationsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API_URL },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    store = TestBed.inject(OrganizationsStore);
  });

  afterEach(() => controller.verify());

  it('does not add x-org-id when no active org is set', () => {
    http.get(`${API_URL}/organizations`).subscribe();
    const req = controller.expectOne(`${API_URL}/organizations`);
    expect(req.request.headers.has('x-org-id')).toBe(false);
    req.flush([]);
  });

  it('adds x-org-id header when an active org is set', () => {
    store.setActiveOrg('org-abc');
    http.get(`${API_URL}/organizations`).subscribe();
    const req = controller.expectOne(`${API_URL}/organizations`);
    expect(req.request.headers.get('x-org-id')).toBe('org-abc');
    req.flush([]);
  });

  it('does NOT add x-org-id to requests outside the API base URL', () => {
    store.setActiveOrg('org-abc');
    http.get('https://example.com/other').subscribe();
    const req = controller.expectOne('https://example.com/other');
    expect(req.request.headers.has('x-org-id')).toBe(false);
    req.flush({});
  });

  it('skips x-org-id for /auth/me even when an org is active', () => {
    store.setActiveOrg('org-abc');
    http.get(`${API_URL}/auth/me`).subscribe();
    const req = controller.expectOne(`${API_URL}/auth/me`);
    expect(req.request.headers.has('x-org-id')).toBe(false);
    req.flush({});
  });

  it('skips x-org-id for /auth0 endpoints even when an org is active', () => {
    store.setActiveOrg('org-abc');
    http.get(`${API_URL}/auth0/token`).subscribe();
    const req = controller.expectOne(`${API_URL}/auth0/token`);
    expect(req.request.headers.has('x-org-id')).toBe(false);
    req.flush({});
  });
});
