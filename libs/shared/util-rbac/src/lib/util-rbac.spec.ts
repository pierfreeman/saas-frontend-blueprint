import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { resolvePermissions } from './resolve-permissions';
import { PERMISSIONS } from './permissions.constants';
import { PermissionsService } from './permissions.service';
import { hasPermission } from './has-permission';
import { HasPermissionDirective } from './has-permission.directive';
import { HasPlanDirective } from './has-plan.directive';
import { HasEntitlementDirective } from './has-entitlement.directive';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import {
  EntitlementsStore,
  type OrganizationEntitlements,
} from '@saas-frontend/entitlements/data-access';

// ── resolvePermissions() ───────────────────────────────────────────────────

describe('resolvePermissions()', () => {
  it('returns all permissions for OWNER role', () => {
    const perms = resolvePermissions('OWNER');
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_BILLING_MANAGE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_INVITE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_REMOVE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_ROLE_UPDATE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_EXPORT)).toBe(true);
  });

  it('returns correct permissions for ADMIN role (no billing or export)', () => {
    const perms = resolvePermissions('ADMIN');
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_INVITE)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_BILLING_MANAGE)).toBe(false);
    expect(perms.has(PERMISSIONS.ANALYTICS_EXPORT)).toBe(false);
  });

  it('returns limited permissions for MEMBER role', () => {
    const perms = resolvePermissions('MEMBER');
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(false);
  });

  it('returns only ORG_READ for READ_ONLY role', () => {
    const perms = resolvePermissions('READ_ONLY');
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.size).toBe(1);
  });

  it('returns a Set instance', () => {
    expect(resolvePermissions('MEMBER')).toBeInstanceOf(Set);
  });
});

// ── PermissionsService ─────────────────────────────────────────────────────

describe('PermissionsService', () => {
  function setup(role: string | null) {
    const mockStore = { currentUserRole: vi.fn(() => role) };
    TestBed.configureTestingModule({
      providers: [{ provide: MembershipsStore, useValue: mockStore }],
    });
    return TestBed.inject(PermissionsService);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('returns an empty Set when role is null', () => {
    const svc = setup(null);
    expect(svc.currentUserPermissions().size).toBe(0);
  });

  it('returns OWNER permissions when role is OWNER', () => {
    const svc = setup('OWNER');
    expect(
      svc.currentUserPermissions().has(PERMISSIONS.ORG_BILLING_MANAGE),
    ).toBe(true);
  });

  it('returns MEMBER permissions when role is MEMBER', () => {
    const svc = setup('MEMBER');
    const perms = svc.currentUserPermissions();
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(false);
  });
});

// ── hasPermission() ────────────────────────────────────────────────────────

describe('hasPermission()', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('returns true when the current user has the permission', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MembershipsStore,
          useValue: { currentUserRole: vi.fn(() => 'OWNER') },
        },
      ],
    });
    expect(
      TestBed.runInInjectionContext(() =>
        hasPermission(PERMISSIONS.ORG_BILLING_MANAGE),
      ),
    ).toBe(true);
  });

  it('returns false when the current user lacks the permission', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MembershipsStore,
          useValue: { currentUserRole: vi.fn(() => 'MEMBER') },
        },
      ],
    });
    expect(
      TestBed.runInInjectionContext(() =>
        hasPermission(PERMISSIONS.ORG_BILLING_MANAGE),
      ),
    ).toBe(false);
  });

  it('returns false when no role (null)', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MembershipsStore,
          useValue: { currentUserRole: vi.fn(() => null) },
        },
      ],
    });
    expect(
      TestBed.runInInjectionContext(() => hasPermission(PERMISSIONS.ORG_READ)),
    ).toBe(false);
  });
});

// ── HasPermissionDirective ─────────────────────────────────────────────────

@Component({
  template: `<button *hasPermission="permission">secret</button>`,
  imports: [HasPermissionDirective],
})
class TestHasPermissionComponent {
  permission = PERMISSIONS.ORG_BILLING_MANAGE;
}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<TestHasPermissionComponent>;
  let permsSignal: ReturnType<typeof signal<Set<string>>>;

  beforeEach(() => {
    permsSignal = signal<Set<string>>(new Set());
    TestBed.configureTestingModule({
      imports: [TestHasPermissionComponent],
      providers: [
        {
          provide: PermissionsService,
          useValue: { currentUserPermissions: permsSignal },
        },
      ],
    });
    fixture = TestBed.createComponent(TestHasPermissionComponent);
    fixture.detectChanges();
  });

  it('hides the element when the user lacks the permission', () => {
    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
  });

  it('shows the element when the user has the required permission', () => {
    permsSignal.set(new Set([PERMISSIONS.ORG_BILLING_MANAGE]));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('button'))).not.toBeNull();
  });

  it('hides the element again when the permission is revoked', () => {
    permsSignal.set(new Set([PERMISSIONS.ORG_BILLING_MANAGE]));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    permsSignal.set(new Set());
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
  });
});

// ── HasPlanDirective ───────────────────────────────────────────────────────

@Component({
  template: `<div *hasPlan="plans">pro feature</div>`,
  imports: [HasPlanDirective],
})
class TestHasPlanComponent {
  plans: 'FREE' | 'PRO' | 'ENTERPRISE' | ('FREE' | 'PRO' | 'ENTERPRISE')[] = [
    'PRO',
    'ENTERPRISE',
  ];
}

describe('HasPlanDirective', () => {
  let fixture: ComponentFixture<TestHasPlanComponent>;
  let planSignal: ReturnType<
    typeof signal<'FREE' | 'PRO' | 'ENTERPRISE' | null>
  >;

  beforeEach(() => {
    planSignal = signal<'FREE' | 'PRO' | 'ENTERPRISE' | null>(null);
    TestBed.configureTestingModule({
      imports: [TestHasPlanComponent],
      providers: [
        { provide: EntitlementsStore, useValue: { plan: planSignal } },
      ],
    });
    fixture = TestBed.createComponent(TestHasPlanComponent);
    fixture.detectChanges();
  });

  it('hides the element when plan is null', () => {
    expect(fixture.debugElement.query(By.css('div'))).toBeNull();
  });

  it('hides the element when on FREE plan', () => {
    planSignal.set('FREE');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('div'))).toBeNull();
  });

  it('shows the element when on PRO plan', () => {
    planSignal.set('PRO');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('div'))).not.toBeNull();
  });

  it('shows the element when on ENTERPRISE plan', () => {
    planSignal.set('ENTERPRISE');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('div'))).not.toBeNull();
  });

  it('accepts a single plan string', () => {
    @Component({
      template: `<div *hasPlan="'PRO'">pro feature</div>`,
      imports: [HasPlanDirective],
    })
    class SinglePlanComponent {}

    const singleFixture = TestBed.createComponent(SinglePlanComponent);
    planSignal.set('PRO');
    singleFixture.detectChanges();
    TestBed.flushEffects();
    singleFixture.detectChanges();
    expect(singleFixture.debugElement.query(By.css('div'))).not.toBeNull();
  });

  it('hides when plan changes from PRO to FREE', () => {
    planSignal.set('PRO');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    planSignal.set('FREE');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('div'))).toBeNull();
  });
});

// ── HasEntitlementDirective ────────────────────────────────────────────────

@Component({
  template: `<span *hasEntitlement="'ssoEnabled'">SSO Settings</span>`,
  imports: [HasEntitlementDirective],
})
class TestHasEntitlementComponent {}

function makeEntitlements(
  overrides: Partial<OrganizationEntitlements> = {},
): OrganizationEntitlements {
  return {
    plan: 'FREE',
    advancedAnalytics: false,
    customReports: false,
    apiAccess: false,
    ssoEnabled: false,
    prioritySupport: false,
    maxSeats: 3,
    storageLimitBytes: 100 * 1024 * 1024,
    ...overrides,
  };
}

describe('HasEntitlementDirective', () => {
  let fixture: ComponentFixture<TestHasEntitlementComponent>;
  let entitlementsSignal: ReturnType<
    typeof signal<OrganizationEntitlements | null>
  >;

  beforeEach(() => {
    entitlementsSignal = signal<OrganizationEntitlements | null>(null);
    TestBed.configureTestingModule({
      imports: [TestHasEntitlementComponent],
      providers: [
        {
          provide: EntitlementsStore,
          useValue: { entitlements: entitlementsSignal },
        },
      ],
    });
    fixture = TestBed.createComponent(TestHasEntitlementComponent);
    fixture.detectChanges();
  });

  it('hides the element when entitlements are null (not loaded)', () => {
    expect(fixture.debugElement.query(By.css('span'))).toBeNull();
  });

  it('hides the element when the boolean flag is false', () => {
    entitlementsSignal.set(makeEntitlements({ ssoEnabled: false }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('span'))).toBeNull();
  });

  it('shows the element when the boolean flag is true', () => {
    entitlementsSignal.set(makeEntitlements({ ssoEnabled: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('span'))).not.toBeNull();
  });

  it('hides the element again when the flag changes from true to false', () => {
    entitlementsSignal.set(makeEntitlements({ ssoEnabled: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    entitlementsSignal.set(makeEntitlements({ ssoEnabled: false }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('span'))).toBeNull();
  });

  it('shows the element for maxSeats when value is > 0', () => {
    @Component({
      template: `<div *hasEntitlement="'maxSeats'">seats block</div>`,
      imports: [HasEntitlementDirective],
    })
    class MaxSeatsComponent {}

    const seatsFixture = TestBed.createComponent(MaxSeatsComponent);
    entitlementsSignal.set(makeEntitlements({ maxSeats: 10 }));
    seatsFixture.detectChanges();
    TestBed.flushEffects();
    seatsFixture.detectChanges();
    expect(seatsFixture.debugElement.query(By.css('div'))).not.toBeNull();
  });

  it('hides the element for maxSeats when value is 0', () => {
    @Component({
      template: `<div *hasEntitlement="'maxSeats'">seats block</div>`,
      imports: [HasEntitlementDirective],
    })
    class MaxSeatsZeroComponent {}

    const seatsFixture = TestBed.createComponent(MaxSeatsZeroComponent);
    entitlementsSignal.set(makeEntitlements({ maxSeats: 0 }));
    seatsFixture.detectChanges();
    TestBed.flushEffects();
    seatsFixture.detectChanges();
    expect(seatsFixture.debugElement.query(By.css('div'))).toBeNull();
  });
});
