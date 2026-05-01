import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCallbackComponent } from './admin-callback.component';
import { AdminAuthStore, AdminUserProfile } from './admin-auth.store';
import { ADMIN_API_BASE_URL } from '@saas-frontend/shared/util-types';

const mockProfile: AdminUserProfile = {
  adminUserId: 'uuid-1',
  auth0Id: 'auth0|abc',
  email: 'admin@example.com',
  displayName: 'Admin',
};

describe('AdminCallbackComponent', () => {
  let isAuthenticated$: Subject<boolean>;

  const mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
  const mockHttp = { get: vi.fn() };
  const mockStore = { setUser: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    isAuthenticated$ = new Subject<boolean>();

    await TestBed.configureTestingModule({
      imports: [AdminCallbackComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated$: isAuthenticated$.asObservable() },
        },
        { provide: HttpClient, useValue: mockHttp },
        { provide: Router, useValue: mockRouter },
        { provide: AdminAuthStore, useValue: mockStore },
        { provide: ADMIN_API_BASE_URL, useValue: 'http://localhost:3001' },
      ],
    }).compileComponents();
  });

  it('renders the loading spinner', () => {
    const fixture = TestBed.createComponent(AdminCallbackComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.pi-spinner')).toBeTruthy();
  });

  it('does nothing when not yet authenticated', () => {
    const fixture = TestBed.createComponent(AdminCallbackComponent);
    fixture.detectChanges();
    isAuthenticated$.next(false);
    expect(mockHttp.get).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('fetches profile and navigates to /organizations on success', async () => {
    mockHttp.get.mockReturnValue(of(mockProfile));
    const fixture = TestBed.createComponent(AdminCallbackComponent);
    fixture.detectChanges();

    isAuthenticated$.next(true);
    // flush microtasks from firstValueFrom + async navigate
    await Promise.resolve();
    await Promise.resolve();

    expect(mockHttp.get).toHaveBeenCalledWith('http://localhost:3001/admin/me');
    expect(mockStore.setUser).toHaveBeenCalledWith(mockProfile);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/organizations']);
  });

  it('navigates to /login when the API call fails', async () => {
    mockHttp.get.mockReturnValue(throwError(() => new Error('Unauthorized')));
    const fixture = TestBed.createComponent(AdminCallbackComponent);
    fixture.detectChanges();

    isAuthenticated$.next(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockStore.setUser).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
