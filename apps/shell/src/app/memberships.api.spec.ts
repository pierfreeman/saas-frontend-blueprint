import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MembershipsApi } from '@saas-frontend/memberships/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const BASE = 'https://api.test';

const mockMembership = {
  id: 'm1',
  userId: 'u1',
  orgId: 'org-1',
  role: 'MEMBER' as const,
  user: { id: 'u1', email: 'a@b.com' },
};

const mockSummary = {
  id: 'm1',
  userId: 'u1',
  role: 'MEMBER' as const,
  email: 'a@b.com',
};

describe('MembershipsApi', () => {
  let api: MembershipsApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(MembershipsApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('getMemberships()', () => {
    it('sends GET /organizations/:orgId/memberships', () => {
      api.getMemberships('org-1').subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/org-1/memberships`,
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockSummary]);
    });

    it('returns the list of membership summaries', () => {
      let result: (typeof mockSummary)[] | undefined;
      api
        .getMemberships('org-1')
        .subscribe((list) => (result = list as (typeof mockSummary)[]));

      controller
        .expectOne(`${BASE}/organizations/org-1/memberships`)
        .flush([mockSummary]);
      expect(result).toEqual([mockSummary]);
    });
  });

  describe('createMembership()', () => {
    it('sends POST /organizations/:orgId/memberships with the dto', () => {
      const dto = { userId: 'u2', role: 'MEMBER' as const };
      api.createMembership('org-1', dto as never).subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/org-1/memberships`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockMembership);
    });

    it('returns the created membership', () => {
      let result: unknown;
      api
        .createMembership('org-1', {
          userId: 'u2',
          role: 'MEMBER' as const,
        } as never)
        .subscribe((m) => (result = m));

      controller
        .expectOne(`${BASE}/organizations/org-1/memberships`)
        .flush(mockMembership);
      expect(result).toEqual(mockMembership);
    });
  });

  describe('updateMembership()', () => {
    it('sends PATCH /organizations/:orgId/memberships/:id with the dto', () => {
      const dto = { role: 'ADMIN' as const };
      api.updateMembership('org-1', 'm1', dto as never).subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/org-1/memberships/m1`,
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...mockSummary, role: 'ADMIN' });
    });
  });

  describe('deleteMembership()', () => {
    it('sends DELETE /organizations/:orgId/memberships/:id', () => {
      api.deleteMembership('org-1', 'm1').subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/org-1/memberships/m1`,
      );
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Membership deleted successfully' });
    });
  });

  describe('inviteMember()', () => {
    it('sends POST /organizations/:orgId/memberships/invite with the dto', () => {
      const dto = { email: 'new@example.com', role: 'MEMBER' as const };
      api.inviteMember('org-1', dto as never).subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/org-1/memberships/invite`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ message: 'Invitation sent successfully.' });
    });
  });
});
