import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { errorInterceptor } from './error.interceptor';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

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
    const sub = http.get('/api/test').subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush(body, { status, statusText: '' });
    return sub;
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

  describe('non-401 errors', () => {
    it('shows an error toast for 403', () => {
      triggerError(403);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Access denied',
        }),
      );
    });

    it('shows an error toast for 500', () => {
      triggerError(500);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Server error' }),
      );
    });

    it('does NOT redirect to /auth', () => {
      triggerError(500);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
