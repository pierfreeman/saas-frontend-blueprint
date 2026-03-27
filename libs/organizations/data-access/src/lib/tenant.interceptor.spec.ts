import { TestBed } from '@angular/core/testing';
import {
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { tenantInterceptor } from './tenant.interceptor';
import { OrganizationsStore } from './organizations.store';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const API_BASE = 'https://api.test';

describe('tenantInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let activeOrgIdSignal: ReturnType<typeof signal<string | null>>;

  function setup(activeOrgId: string | null = null) {
    activeOrgIdSignal = signal<string | null>(activeOrgId);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API_BASE },
        {
          provide: OrganizationsStore,
          useValue: { activeOrgId: activeOrgIdSignal },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  afterEach(() => controller.verify());

  describe('when the URL does not start with the API base URL', () => {
    it('passes the request unchanged (no x-org-id header)', () => {
      setup('org-1');
      http.get('https://other.example.com/data').subscribe();
      const req = controller.expectOne('https://other.example.com/data');
      expect(req.request.headers.has('x-org-id')).toBe(false);
      req.flush({});
    });
  });

  describe('when no active org is set', () => {
    it('passes the API request unchanged (no x-org-id header)', () => {
      setup(null);
      http.get(`${API_BASE}/organizations`).subscribe();
      const req = controller.expectOne(`${API_BASE}/organizations`);
      expect(req.request.headers.has('x-org-id')).toBe(false);
      req.flush([]);
    });
  });

  describe('when an active org is set', () => {
    it('adds the x-org-id header for regular API requests', () => {
      setup('org-123');
      http.get(`${API_BASE}/memberships`).subscribe();
      const req = controller.expectOne(`${API_BASE}/memberships`);
      expect(req.request.headers.get('x-org-id')).toBe('org-123');
      req.flush([]);
    });

    it('skips x-org-id header for /auth/me endpoint', () => {
      setup('org-123');
      http.get(`${API_BASE}/auth/me`).subscribe();
      const req = controller.expectOne(`${API_BASE}/auth/me`);
      expect(req.request.headers.has('x-org-id')).toBe(false);
      req.flush({});
    });

    it('skips x-org-id header for /auth0 endpoint', () => {
      setup('org-123');
      http.get(`${API_BASE}/auth0/callback`).subscribe();
      const req = controller.expectOne(`${API_BASE}/auth0/callback`);
      expect(req.request.headers.has('x-org-id')).toBe(false);
      req.flush({});
    });
  });
});
