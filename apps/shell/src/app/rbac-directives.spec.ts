import { Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import {
  HasPermissionDirective,
  PermissionsService,
  PERMISSIONS,
} from '@saas-frontend/shared/util-rbac';
import { HasPlanDirective } from '@saas-frontend/shared/util-rbac';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';

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
    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn).toBeNull();
  });

  it('shows the element when the user has the required permission', () => {
    permsSignal.set(new Set([PERMISSIONS.ORG_BILLING_MANAGE]));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn).not.toBeNull();
  });

  it('hides the element again when the permission is revoked', () => {
    // Grant permission
    permsSignal.set(new Set([PERMISSIONS.ORG_BILLING_MANAGE]));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    // Revoke permission
    permsSignal.set(new Set());
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn).toBeNull();
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
        {
          provide: EntitlementsStore,
          useValue: { plan: planSignal },
        },
      ],
    });
    fixture = TestBed.createComponent(TestHasPlanComponent);
    fixture.detectChanges();
  });

  it('hides the element when plan is null (not loaded)', () => {
    const el = fixture.debugElement.query(By.css('div'));
    expect(el).toBeNull();
  });

  it('hides the element when on FREE plan', () => {
    planSignal.set('FREE');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.css('div'));
    expect(el).toBeNull();
  });

  it('shows the element when on PRO plan', () => {
    planSignal.set('PRO');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.css('div'));
    expect(el).not.toBeNull();
  });

  it('shows the element when on ENTERPRISE plan', () => {
    planSignal.set('ENTERPRISE');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.css('div'));
    expect(el).not.toBeNull();
  });

  it('accepts a single plan string (not array)', () => {
    // Use a component that passes a single plan string
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

    const el = singleFixture.debugElement.query(By.css('div'));
    expect(el).not.toBeNull();
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

    const el = fixture.debugElement.query(By.css('div'));
    expect(el).toBeNull();
  });
});
