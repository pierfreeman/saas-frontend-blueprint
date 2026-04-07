import { TestBed } from '@angular/core/testing';
import { AdminDeletionTabComponent } from './admin-deletion-tab.component';
import type { AdminOrganizationDetail } from '@saas-frontend/admin/data-access';

function makeOrg(
  overrides: Partial<AdminOrganizationDetail> = {},
): AdminOrganizationDetail {
  return {
    id: 'org-1',
    name: 'Acme Corp',
    status: 'ACTIVE',
    billingStatus: 'ACTIVE',
    planId: 'price_pro',
    membersCount: 5,
    createdAt: '2024-01-01T00:00:00.000Z',
    stripeCustomerId: 'cus_abc',
    subscriptionId: 'sub_xyz',
    subscriptionPeriodEnd: null,
    cancelAtPeriodEnd: false,
    recentActivity: [],
    entitlements: {
      organizationId: 'org-1',
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      advancedAnalytics: true,
      customReports: true,
      apiAccess: true,
      ssoEnabled: false,
      prioritySupport: false,
      maxSeats: 10,
      storageLimitBytes: 5368709120,
    },
    deletionRequestedAt: null,
    deletionScheduledAt: null,
    deletionCompletedAt: null,
    retentionPeriodDays: null,
    ...overrides,
  };
}

describe('AdminDeletionTabComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDeletionTabComponent],
    }).compileComponents();
  });

  it('shows empty state when no deletion has been requested', () => {
    const fixture = TestBed.createComponent(AdminDeletionTabComponent);
    fixture.componentInstance.org = makeOrg();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No deletion requested for this organization.',
    );
  });

  it('shows deletion info card when deletionRequestedAt is set', () => {
    const org = makeOrg({
      status: 'PENDING_DELETION',
      deletionRequestedAt: '2025-05-01T00:00:00.000Z',
      deletionScheduledAt: '2025-06-01T00:00:00.000Z',
      retentionPeriodDays: null,
    });
    const fixture = TestBed.createComponent(AdminDeletionTabComponent);
    fixture.componentInstance.org = org;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Deletion Request');
    expect(fixture.nativeElement.textContent).toContain('Requested at');
    expect(fixture.nativeElement.textContent).toContain('Scheduled for');
  });

  it('returns "warn" severity for PENDING_DELETION status', () => {
    const fixture = TestBed.createComponent(AdminDeletionTabComponent);
    fixture.componentInstance.org = makeOrg({
      status: 'PENDING_DELETION',
      deletionRequestedAt: '2025-05-01T00:00:00.000Z',
      deletionScheduledAt: '2025-06-01T00:00:00.000Z',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.statusSeverity).toBe('warn');
  });

  it('returns "danger" severity for DELETED status', () => {
    const fixture = TestBed.createComponent(AdminDeletionTabComponent);
    fixture.componentInstance.org = makeOrg({
      status: 'DELETED',
      deletionRequestedAt: '2025-05-01T00:00:00.000Z',
      deletionScheduledAt: '2025-06-01T00:00:00.000Z',
      deletionCompletedAt: '2025-06-01T12:00:00.000Z',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.statusSeverity).toBe('danger');
  });

  it('shows custom retention period when set', () => {
    const fixture = TestBed.createComponent(AdminDeletionTabComponent);
    fixture.componentInstance.org = makeOrg({
      status: 'PENDING_DELETION',
      deletionRequestedAt: '2025-05-01T00:00:00.000Z',
      deletionScheduledAt: '2025-06-01T00:00:00.000Z',
      retentionPeriodDays: 30,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('30 days (custom)');
  });

  it('shows "Default" for null retention period', () => {
    const fixture = TestBed.createComponent(AdminDeletionTabComponent);
    fixture.componentInstance.org = makeOrg({
      status: 'PENDING_DELETION',
      deletionRequestedAt: '2025-05-01T00:00:00.000Z',
      deletionScheduledAt: '2025-06-01T00:00:00.000Z',
      retentionPeriodDays: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Default');
  });
});
