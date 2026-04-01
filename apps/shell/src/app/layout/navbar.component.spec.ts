import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { OrgContextService } from '@saas-frontend/shared/util-org-context';
import { describe, expect, it, vi } from 'vitest';
import { NavbarComponent } from './navbar.component';

// ── Setup helper ──────────────────────────────────────────────────────────────

function setup(
  opts: {
    canManage?: boolean;
    email?: string;
    pictureUrl?: string | null;
    isSystemAdmin?: boolean;
  } = {},
) {
  const {
    canManage = false,
    email = 'alice@example.com',
    pictureUrl = null,
    isSystemAdmin = false,
  } = opts;

  const mockAuth = {
    logout: vi.fn(),
  } as unknown as AuthService;

  const mockAuthStore = {
    currentUser: signal({ email, pictureUrl, isSystemAdmin }),
    clearUser: vi.fn(),
  } as unknown as AuthStore;

  const mockOrgsStore = {
    clearActiveOrg: vi.fn(),
  } as unknown as OrganizationsStore;

  const mockOrgContext = {
    canManageOrg: signal(canManage),
  } as unknown as OrgContextService;

  TestBed.configureTestingModule({
    imports: [NavbarComponent],
    providers: [
      provideRouter([{ path: '**', redirectTo: '' }]),
      { provide: AuthService, useValue: mockAuth },
      { provide: AuthStore, useValue: mockAuthStore },
      { provide: OrganizationsStore, useValue: mockOrgsStore },
      { provide: OrgContextService, useValue: mockOrgContext },
    ],
  });

  const fixture = TestBed.createComponent(NavbarComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, mockAuth, mockAuthStore, mockOrgsStore };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('NavbarComponent', () => {
  // ── mobileMenuOpen ──────────────────────────────────────────────────────────

  describe('mobileMenuOpen', () => {
    it('starts as false', () => {
      const { component } = setup();
      expect(component.mobileMenuOpen()).toBe(false);
    });

    it('toggleMobileMenu() sets it to true when false', () => {
      const { component } = setup();
      component.toggleMobileMenu();
      expect(component.mobileMenuOpen()).toBe(true);
    });

    it('toggleMobileMenu() sets it back to false on second call', () => {
      const { component } = setup();
      component.toggleMobileMenu();
      component.toggleMobileMenu();
      expect(component.mobileMenuOpen()).toBe(false);
    });

    it('closes on NavigationEnd event', async () => {
      const { component } = setup();
      component.mobileMenuOpen.set(true);

      const router = TestBed.inject(Router);
      await router.navigateByUrl('/');
      expect(component.mobileMenuOpen()).toBe(false);
    });
  });

  // ── navigateTo ──────────────────────────────────────────────────────────────

  describe('navigateTo()', () => {
    it('navigates to the given path', async () => {
      const { component } = setup();
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigateByUrl');
      component.navigateTo('/personal-settings');
      expect(spy).toHaveBeenCalledWith('/personal-settings');
    });
  });

  // ── mobilLogout ─────────────────────────────────────────────────────────────

  describe('mobilLogout()', () => {
    it('clears user and org state', () => {
      const { component, mockAuthStore, mockOrgsStore } = setup();
      component.mobilLogout();
      expect(mockAuthStore.clearUser).toHaveBeenCalled();
      expect(mockOrgsStore.clearActiveOrg).toHaveBeenCalled();
    });

    it('calls Auth0 logout', () => {
      const { component, mockAuth } = setup();
      component.mobilLogout();
      expect(mockAuth.logout).toHaveBeenCalledWith({ openUrl: false });
    });

    it('redirects to /auth', () => {
      const { component } = setup();
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigateByUrl');
      component.mobilLogout();
      expect(spy).toHaveBeenCalledWith('/auth');
    });
  });

  // ── avatarLabel ─────────────────────────────────────────────────────────────

  describe('avatarLabel()', () => {
    it('returns the uppercase first letter of the email', () => {
      const { component } = setup({ email: 'bob@example.com' });
      expect(component.avatarLabel()).toBe('B');
    });

    it('returns "?" when email is empty', () => {
      const { component } = setup({ email: '' });
      expect(component.avatarLabel()).toBe('?');
    });
  });

  // ── avatarPicture ────────────────────────────────────────────────────────────

  describe('avatarPicture()', () => {
    it('returns null when no pictureUrl is set', () => {
      const { component } = setup({ pictureUrl: null });
      expect(component.avatarPicture()).toBeNull();
    });

    it('returns the pictureUrl when set', () => {
      const { component } = setup({
        pictureUrl: 'https://example.com/pic.jpg',
      });
      expect(component.avatarPicture()).toBe('https://example.com/pic.jpg');
    });
  });

  // ── isSystemAdmin ────────────────────────────────────────────────────────────

  describe('isSystemAdmin()', () => {
    it('returns false when isSystemAdmin is false', () => {
      const { component } = setup({ isSystemAdmin: false });
      expect(component.isSystemAdmin()).toBe(false);
    });

    it('returns true when isSystemAdmin is true', () => {
      const { component } = setup({ isSystemAdmin: true });
      expect(component.isSystemAdmin()).toBe(true);
    });

    it('does not render admin link in desktop sidebar when false', () => {
      const { fixture } = setup({ isSystemAdmin: false });
      const links = fixture.debugElement.queryAll(
        By.css('a[routerLink="/admin"]'),
      );
      expect(links).toHaveLength(0);
    });

    it('renders admin link in desktop sidebar when true', () => {
      const { fixture } = setup({ isSystemAdmin: true });
      const links = fixture.debugElement.queryAll(
        By.css('a[routerLink="/admin"]'),
      );
      expect(links.length).toBeGreaterThan(0);
    });
  });

  // ── showOrgSettings ─────────────────────────────────────────────────────────

  describe('showOrgSettings()', () => {
    it('returns true when canManageOrg is true', () => {
      const { component } = setup({ canManage: true });
      expect(component.showOrgSettings()).toBe(true);
    });

    it('returns false when canManageOrg is false', () => {
      const { component } = setup({ canManage: false });
      expect(component.showOrgSettings()).toBe(false);
    });
  });

  // ── avatarMenuItems commands ─────────────────────────────────────────────────

  describe('avatarMenuItems commands', () => {
    it('Personal Settings command navigates to /personal-settings', () => {
      const { component } = setup();
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate');
      component.avatarMenuItems[0].command!({});
      expect(spy).toHaveBeenCalledWith(['/personal-settings']);
    });

    it('Switch organization command navigates to /org/select', () => {
      const { component } = setup();
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate');
      component.avatarMenuItems[1].command!({});
      expect(spy).toHaveBeenCalledWith(['/org/select']);
    });

    it('Logout command (index 3, after separator) calls logout flow', () => {
      const { component, mockAuth, mockAuthStore, mockOrgsStore } = setup();
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigateByUrl');
      component.avatarMenuItems[3].command!({});
      expect(mockAuthStore.clearUser).toHaveBeenCalled();
      expect(mockOrgsStore.clearActiveOrg).toHaveBeenCalled();
      expect(mockAuth.logout).toHaveBeenCalledWith({ openUrl: false });
      expect(spy).toHaveBeenCalledWith('/auth');
    });
  });

  // ── mobile drawer template bindings ─────────────────────────────────────────

  describe('mobile drawer template bindings', () => {
    it('visibleChange=false on drawer closes mobileMenuOpen', () => {
      const { fixture, component } = setup();
      component.mobileMenuOpen.set(true);
      fixture.detectChanges();
      const drawer = fixture.debugElement.query(By.css('p-drawer'));
      drawer.triggerEventHandler('visibleChange', false);
      expect(component.mobileMenuOpen()).toBe(false);
    });

    it('Personal Settings button in drawer triggers navigateTo', () => {
      const { fixture } = setup();
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigateByUrl');
      // Open drawer to ensure content is rendered
      fixture.componentInstance.mobileMenuOpen.set(true);
      fixture.detectChanges();
      const buttons = fixture.debugElement.queryAll(
        By.css('button[type="button"]'),
      );
      const btn = buttons.find((b) =>
        b.nativeElement.textContent.includes('Personal Settings'),
      );
      btn?.triggerEventHandler('click', null);
      expect(spy).toHaveBeenCalledWith('/personal-settings');
    });
  });
});
