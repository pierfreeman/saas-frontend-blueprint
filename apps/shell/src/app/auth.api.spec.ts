import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthApi } from '@saas-frontend/auth/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type { User } from '@saas-frontend/auth/data-access';

const mockUser: User = { id: 'u1', email: 'a@b.com', auth0Id: 'auth0|1' };
const BASE = 'https://api.test';

describe('AuthApi', () => {
  let api: AuthApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(AuthApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('getMe()', () => {
    it('sends GET /auth/me and returns the user', () => {
      let result: User | undefined;
      api.getMe().subscribe((u) => (result = u));

      const req = controller.expectOne(`${BASE}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);

      expect(result).toEqual(mockUser);
    });
  });

  describe('updateMe()', () => {
    it('sends PATCH /auth/me with the dto and returns the user', () => {
      const dto = { firstName: 'Alice', lastName: 'Smith' };
      let result: User | undefined;
      api.updateMe(dto).subscribe((u) => (result = u));

      const req = controller.expectOne(`${BASE}/auth/me`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...mockUser, ...dto });

      expect(result).toEqual({ ...mockUser, ...dto });
    });

    it('sends PATCH /auth/me with a pictureUrl dto', () => {
      const dto = { pictureUrl: 'https://example.com/pic.jpg' };
      api.updateMe(dto).subscribe();

      const req = controller.expectOne(`${BASE}/auth/me`);
      expect(req.request.body).toEqual(dto);
      req.flush(mockUser);
    });
  });

  describe('requestPasswordChange()', () => {
    it('sends POST /auth/me/change-password with an empty body', () => {
      let resolved = false;
      api.requestPasswordChange().subscribe(() => (resolved = true));

      const req = controller.expectOne(`${BASE}/auth/me/change-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(resolved).toBe(true);
    });
  });
});
