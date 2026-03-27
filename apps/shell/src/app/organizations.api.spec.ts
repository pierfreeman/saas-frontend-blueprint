import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { OrganizationsApi } from '@saas-frontend/organizations/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const BASE = 'https://api.test';

const mockOrg = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockSummary = { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' };

describe('OrganizationsApi', () => {
  let api: OrganizationsApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(OrganizationsApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('getOrganizations()', () => {
    it('sends GET /organizations and returns the list', () => {
      let result: unknown;
      api.getOrganizations().subscribe((list) => (result = list));

      const req = controller.expectOne(`${BASE}/organizations`);
      expect(req.request.method).toBe('GET');
      req.flush([mockSummary]);

      expect(result).toEqual([mockSummary]);
    });
  });

  describe('getOrganization()', () => {
    it('sends GET /organizations/:id and returns the org', () => {
      let result: unknown;
      api.getOrganization('org-1').subscribe((o) => (result = o));

      const req = controller.expectOne(`${BASE}/organizations/org-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockOrg);

      expect(result).toEqual(mockOrg);
    });
  });

  describe('createOrganization()', () => {
    it('sends POST /organizations with the dto and returns the org', () => {
      const dto = { name: 'New Org' };
      let result: unknown;
      api.createOrganization(dto as never).subscribe((o) => (result = o));

      const req = controller.expectOne(`${BASE}/organizations`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockOrg);

      expect(result).toEqual(mockOrg);
    });
  });

  describe('updateOrganization()', () => {
    it('sends PATCH /organizations/:id with the dto', () => {
      const dto = { name: 'Updated Org' };
      api.updateOrganization('org-1', dto as never).subscribe();

      const req = controller.expectOne(`${BASE}/organizations/org-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...mockOrg, ...dto });
    });
  });

  describe('requestDeletion()', () => {
    it('sends POST /organizations/:id/delete with null body', () => {
      let result: unknown;
      api.requestDeletion('org-1').subscribe((r) => (result = r));

      const req = controller.expectOne(`${BASE}/organizations/org-1/delete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush({ scheduled: true });

      expect(result).toEqual({ scheduled: true });
    });
  });

  describe('requestExport()', () => {
    it('sends POST /organizations/:id/export with null body', () => {
      let result: unknown;
      api.requestExport('org-1').subscribe((r) => (result = r));

      const req = controller.expectOne(`${BASE}/organizations/org-1/export`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush({ exportId: 'exp-1' });

      expect(result).toEqual({ exportId: 'exp-1' });
    });
  });
});
