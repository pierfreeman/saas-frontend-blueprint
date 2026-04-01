import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import {
  AdminApi,
  AdminOrganizationDetail,
  OrgStatus,
  BillingStatus,
} from '@saas-frontend/admin/data-access';
import { AdminMembersTabComponent } from './admin-members-tab.component';
import { AdminBillingTabComponent } from './admin-billing-tab.component';
import { AdminActivityTabComponent } from './admin-activity-tab.component';

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn' | 'danger';

const ORG_STATUS_SEVERITY: Record<OrgStatus, TagSeverity> = {
  ACTIVE: 'success',
  SUSPENDED: 'warn',
  DELETED: 'danger',
  PENDING: 'secondary',
};

const BILLING_STATUS_SEVERITY: Record<BillingStatus, TagSeverity> = {
  ACTIVE: 'success',
  TRIALING: 'info',
  PAST_DUE: 'warn',
  UNPAID: 'danger',
  CANCELED: 'secondary',
  NONE: 'secondary',
};

@Component({
  selector: 'app-admin-org-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CardModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    TabsModule,
    MessageModule,
    AdminMembersTabComponent,
    AdminBillingTabComponent,
    AdminActivityTabComponent,
  ],
  template: `
    <!-- Back button -->
    <div class="mb-4">
      <p-button
        icon="pi pi-arrow-left"
        label="Back to Organizations"
        [text]="true"
        (onClick)="goBack()"
      />
    </div>

    <!-- Error -->
    @if (error()) {
      <p-message severity="error" [text]="error()!" />
    }

    <!-- Loading -->
    @if (loading()) {
      <p-card class="mb-4">
        <div class="flex flex-col gap-3">
          <p-skeleton width="18rem" height="2rem" />
          <p-skeleton width="10rem" height="1rem" />
          <div class="flex gap-2 mt-2">
            <p-skeleton width="6rem" height="1.5rem" borderRadius="1rem" />
            <p-skeleton width="6rem" height="1.5rem" borderRadius="1rem" />
          </div>
        </div>
      </p-card>
    }

    <!-- Organization header card -->
    @if (!loading() && org()) {
      <p-card class="mb-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-surface-900 m-0">
              {{ org()!.name }}
            </h1>
            <p class="text-xs text-surface-400 font-mono m-0 mt-1">
              {{ org()!.id }}
            </p>
            <div class="flex gap-2 mt-3">
              <p-tag
                [value]="org()!.status"
                [severity]="orgStatusSeverity(org()!.status)"
                [rounded]="true"
              />
              <p-tag
                [value]="org()!.billingStatus"
                [severity]="billingStatusSeverity(org()!.billingStatus)"
                [rounded]="true"
              />
              @if (org()!.planId) {
                <p-tag
                  [value]="'Plan: ' + org()!.planId!"
                  severity="info"
                  [rounded]="true"
                />
              }
            </div>
          </div>
          <div class="flex flex-col items-end gap-1 text-sm text-surface-500">
            <span>
              <span class="pi pi-users mr-1"></span>
              {{ org()!.membersCount }} members
            </span>
            <span> Created {{ org()!.createdAt | date: 'mediumDate' }} </span>
          </div>
        </div>
      </p-card>

      <!-- Tab panel -->
      <p-tabs value="members">
        <p-tablist>
          <p-tab value="members">
            <span class="pi pi-users mr-2"></span>Members
          </p-tab>
          <p-tab value="billing">
            <span class="pi pi-credit-card mr-2"></span>Billing
          </p-tab>
          <p-tab value="activity">
            <span class="pi pi-list mr-2"></span>Activity
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <p-tabpanel value="members">
            <app-admin-members-tab [orgId]="orgId" />
          </p-tabpanel>
          <p-tabpanel value="billing">
            <app-admin-billing-tab [orgId]="orgId" />
          </p-tabpanel>
          <p-tabpanel value="activity">
            <app-admin-activity-tab [orgId]="orgId" />
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    }
  `,
})
export class AdminOrgDetailComponent implements OnInit {
  readonly #api = inject(AdminApi);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly org = signal<AdminOrganizationDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  orgId = '';

  readonly orgStatusSeverity = (status: OrgStatus): TagSeverity =>
    ORG_STATUS_SEVERITY[status] ?? 'secondary';

  readonly billingStatusSeverity = (status: BillingStatus): TagSeverity =>
    BILLING_STATUS_SEVERITY[status] ?? 'secondary';

  ngOnInit(): void {
    this.orgId = this.#route.snapshot.paramMap.get('orgId') ?? '';
    this.#api.getOrganizationDetail(this.orgId).subscribe({
      next: (detail) => {
        this.org.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load organization.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.#router.navigate(['/admin/organizations']);
  }
}
