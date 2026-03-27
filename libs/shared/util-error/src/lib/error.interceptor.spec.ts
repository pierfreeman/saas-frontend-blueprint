import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { throwError } from 'rxjs';
import { vi } from 'vitest';
import { errorInterceptor } from './error.interceptor';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };
  let authStore: { clearUser: ReturnType<typeof vi.fn> };
  let orgsStore: { clearActiveOrg: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    messageService = { add: vi.fn() };
    authStore = { clearUser: vi.fn() };
    orgsStore = { clearActiveOrg: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: messageService },
        { provide: AuthStore, useValue: authStore },
        { provide: OrganizationsStore, useValue: orgsStore },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  function triggerError(status: number, body: Record<string, unknown> = {}) {
    http.get('/api/test').subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush(body, { status, statusText: '' });
  }

  describe('401 Unauthorized', () => {
    it('clears AuthStore', () => {
      triggerError(401);
      expect(authStore.clearUser).toHaveBeenCalled();
    });

    it('clears OrganizationsStore', () => {
      triggerError(401);
      expect(orgsStore.clearActiveOrg).toHaveBeenCalled();
    });

    it('redirects to /auth', () => {
      triggerError(401);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    });

    it('does NOT show a toast', () => {
      triggerError(401);
      expect(messageService.add).not.toHaveBeenCalled();
    });
  });

  describe('non-401 HTTP errors', () => {
    it('shows "Access denied" toast for 403', () => {
      triggerError(403);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Access denied',
        }),
      );
    });

    it('shows "Not found" toast for 404', () => {
      triggerError(404);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ summary: 'Not found' }),
      );
    });

    it('shows "Validation error" toast for 422', () => {
      triggerError(422);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ summary: 'Validation error' }),
      );
    });

    it('shows "Server error" toast for 500', () => {
      triggerError(500);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ summary: 'Server error' }),
      );
    });

    it('shows "Request failed" toast for 400', () => {
      triggerError(400);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ summary: 'Request failed' }),
      );
    });

    it('uses err.error.message as detail when available', () => {
      triggerError(500, { message: 'Database connection failed' });
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ detail: 'Database connection failed' }),
      );
    });

    it('does NOT redirect to /auth for non-401 errors', () => {
      triggerError(500);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('ApiError-shaped errors (non-HttpErrorResponse)', () => {
    it('shows a toast with the ApiError message and correct summary', () => {
      const apiError = { status: 422, message: 'Validation failed' };
      const req = new HttpRequest('GET', '/api/test');
      const next = () => throwError(() => apiError);
      TestBed.runInInjectionContext(() => {
        errorInterceptor(req, next as never).subscribe({ error: () => {} });
      });
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Validation error',
          detail: 'Validation failed',
        }),
      );
    });

    it('re-throws the original error', () => {
      const apiError = { status: 403, message: 'Forbidden' };
      const req = new HttpRequest('GET', '/api/test');
      const next = () => throwError(() => apiError);
      let caughtError: unknown;
      TestBed.runInInjectionContext(() => {
        errorInterceptor(req, next as never).subscribe({
          error: (err) => (caughtError = err),
        });
      });
      expect(caughtError).toBe(apiError);
    });
  });
});
