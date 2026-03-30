import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthApi, UpdateProfileDto } from './auth.api';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type { User } from './auth.api.types';

const BASE = 'https://api.test';

const mockUser: User = {
  id: 'u1',
  email: 'a@b.com',
  auth0Id: 'auth0|1',
};

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
    it('issues GET /auth/me', () => {
      api.getMe().subscribe();

      const req = controller.expectOne(`${BASE}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('returns the user from the response', () => {
      let result: User | undefined;
      api.getMe().subscribe((u) => (result = u));

      controller.expectOne(`${BASE}/auth/me`).flush(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('uses the injected API_BASE_URL token', () => {
      api.getMe().subscribe();

      const req = controller.expectOne(`${BASE}/auth/me`);
      expect(req.request.url).toBe(`${BASE}/auth/me`);
      req.flush(mockUser);
    });
  });

  describe('updateMe()', () => {
    it('issues PATCH /auth/me with the DTO body', () => {
      const dto: UpdateProfileDto = { firstName: 'Alice', lastName: 'Smith' };
      api.updateMe(dto).subscribe();

      const req = controller.expectOne(`${BASE}/auth/me`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush(mockUser);
    });

    it('returns the updated user from the response', () => {
      const updated: User = { ...mockUser, firstName: 'Alice' };
      let result: User | undefined;
      api.updateMe({ firstName: 'Alice' }).subscribe((u) => (result = u));

      controller.expectOne(`${BASE}/auth/me`).flush(updated);
      expect(result).toEqual(updated);
    });

    it('uses the injected API_BASE_URL token', () => {
      const dto: UpdateProfileDto = {
        pictureUrl: 'https://example.com/pic.jpg',
      };
      api.updateMe(dto).subscribe();

      const req = controller.expectOne(`${BASE}/auth/me`);
      expect(req.request.url).toBe(`${BASE}/auth/me`);
      req.flush(mockUser);
    });
  });
});
