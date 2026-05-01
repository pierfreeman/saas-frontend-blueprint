import { TestBed } from '@angular/core/testing';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  provideRouter,
} from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  const mockAuth0 = { logout: vi.fn(() => ({ subscribe: vi.fn() })) };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth0 },
      ],
    }).compileComponents();
  });

  it('renders the sidebar and main area', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('aside')).toBeTruthy();
    expect(el.querySelector('main')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('logout menu item calls auth0.logout', () => {
    mockAuth0.logout.mockReturnValue({ subscribe: vi.fn() });
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const logoutItem = component.menuItems.find((i) => i.label === 'Logout');
    expect(logoutItem).toBeDefined();
    logoutItem!.command!({} as never);
    expect(mockAuth0.logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: globalThis.location.origin + '/login' },
    });
  });
});
