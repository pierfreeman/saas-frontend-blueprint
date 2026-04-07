import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  AdminApi,
  AdminOrganizationListItem,
  OrgStatus,
  BillingStatus,
  PLAN_TIERS,
  PlanTier,
} from '@saas-frontend/admin/data-access';

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn' | 'danger';

const ORG_STATUS_SEVERITY: Record<OrgStatus, TagSeverity> = {
  ACTIVE: 'success',
  SUSPENDED: 'warn',
  DELETED: 'danger',
  PENDING_DELETION: 'secondary',
};

const BILLING_STATUS_SEVERITY: Record<BillingStatus, TagSeverity> = {
  ACTIVE: 'success',
  TRIALING: 'info',
  PAST_DUE: 'warn',
  UNPAID: 'danger',
  CANCELED: 'secondary',
  NONE: 'secondary',
};

const STATUS_OPTIONS: { label: string; value: OrgStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Pending Deletion', value: 'PENDING_DELETION' },
  { label: 'Deleted', value: 'DELETED' },
];

const PLAN_OPTIONS: { label: string; value: PlanTier }[] = PLAN_TIERS.map(
  (t) => ({ label: t, value: t }),
);

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    FormsModule,
    DatePipe,
    CardModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    PaginatorModule,
    DialogModule,
    ToastModule,
  ],
  template: `
    <p-toast />
    <div class="flex flex-col gap-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 m-0">Organizations</h1>
          <p class="text-surface-500 mt-1 mb-0 text-sm">
            {{ total() }} organizations total
          </p>
        </div>
        <p-button
          label="Provision Organization"
          icon="pi pi-plus"
          (onClick)="openProvisionDialog()"
        />
      </div>

      <!-- Filters -->
      <p-card>
        <div class="flex flex-wrap gap-3 items-center">
          <div class="flex-1 min-w-52">
            <input
              pInputText
              type="text"
              placeholder="Search by name or ID..."
              class="w-full"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange()"
            />
          </div>
          <p-select
            [options]="statusOptions"
            [(ngModel)]="selectedStatus"
            optionLabel="label"
            optionValue="value"
            placeholder="Status"
            class="w-40"
            (ngModelChange)="onFilterChange()"
          />
        </div>
      </p-card>

      <!-- Loading skeletons -->
      @if (loading()) {
        <div class="flex flex-col gap-3">
          @for (_ of skeletons; track $index) {
            <p-card>
              <div class="flex items-center gap-4">
                <p-skeleton width="12rem" height="1.2rem" />
                <p-skeleton width="5rem" height="1.5rem" borderRadius="1rem" />
                <p-skeleton width="5rem" height="1.5rem" borderRadius="1rem" />
                <p-skeleton width="4rem" height="1rem" styleClass="ml-auto" />
              </div>
            </p-card>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && organizations().length === 0) {
        <p-card>
          <div class="flex flex-col items-center py-12 text-surface-500">
            <span class="pi pi-building text-5xl mb-4 opacity-30"></span>
            <p class="text-lg font-medium">No organizations found</p>
            <p class="text-sm">Try adjusting your search or filters.</p>
          </div>
        </p-card>
      }

      <!-- Org rows -->
      @if (!loading() && organizations().length > 0) {
        <div class="flex flex-col gap-2">
          @for (org of organizations(); track org.id) {
            <p-card
              class="cursor-pointer hover:shadow-md transition-shadow"
              (click)="goToDetail(org)"
            >
              <div class="flex flex-wrap items-center gap-4">
                <!-- Name -->
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-surface-900 m-0 truncate">
                    {{ org.name }}
                  </p>
                  <p class="text-xs text-surface-400 m-0 font-mono">
                    {{ org.id }}
                  </p>
                </div>

                <!-- Tags -->
                <div class="flex items-center gap-2">
                  <p-tag
                    [value]="'Org: ' + org.status"
                    [severity]="orgStatusSeverity(org.status)"
                    [rounded]="true"
                  />
                  <p-tag
                    [value]="'Billing: ' + org.billingStatus"
                    [severity]="billingStatusSeverity(org.billingStatus)"
                    [rounded]="true"
                  />
                </div>

                <!-- Members -->
                <div class="text-sm text-surface-500 whitespace-nowrap">
                  <span class="pi pi-users mr-1"></span>
                  {{ org.membersCount }}
                </div>

                <!-- Plan -->
                <div
                  class="text-sm text-surface-500 whitespace-nowrap w-24 truncate text-right"
                >
                  {{ org.planId ?? '—' }}
                </div>

                <!-- Date -->
                <div class="text-xs text-surface-400 whitespace-nowrap">
                  {{ org.createdAt | date: 'mediumDate' }}
                </div>

                <!-- Arrow -->
                <span
                  class="pi pi-chevron-right text-surface-400 text-xs"
                ></span>
              </div>
            </p-card>
          }
        </div>

        <!-- Paginator -->
        @if (total() > PAGE_SIZE) {
          <p-paginator
            [rows]="PAGE_SIZE"
            [totalRecords]="total()"
            [first]="offset()"
            (onPageChange)="onPageChange($event)"
          />
        }
      }
    </div>

    <!-- Provision Organization Dialog -->
    <p-dialog
      header="Provision Organization"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '28rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="org-name"
            >Organization name *</label
          >
          <input
            inputId="org-name"
            pInputText
            type="text"
            placeholder="Acme Corp"
            class="w-full"
            [(ngModel)]="provisionForm.name"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="owner-email"
            >Owner email *</label
          >
          <input
            inputId="owner-email"
            pInputText
            type="email"
            placeholder="owner@acme.com"
            class="w-full"
            [(ngModel)]="provisionForm.ownerEmail"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="plan-tier"
            >Plan tier</label
          >
          <p-select
            inputId="plan-tier"
            [options]="planOptions"
            [(ngModel)]="provisionForm.plan"
            optionLabel="label"
            optionValue="value"
            placeholder="FREE"
            class="w-full"
            appendTo="body"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="dialogVisible = false"
          [disabled]="saving()"
        />
        <p-button
          label="Provision"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="
            !provisionForm.name.trim() || !provisionForm.ownerEmail.trim()
          "
          (onClick)="submitProvision()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class AdminOrganizationsComponent implements OnInit {
  readonly #api = inject(AdminApi);
  readonly #router = inject(Router);
  readonly #toast = inject(MessageService);

  readonly PAGE_SIZE = PAGE_SIZE;
  readonly statusOptions = STATUS_OPTIONS;
  readonly planOptions = PLAN_OPTIONS;
  readonly skeletons = new Array(5);

  searchTerm = '';
  selectedStatus: OrgStatus | null = null;

  readonly organizations = signal<AdminOrganizationListItem[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);
  readonly saving = signal(false);

  dialogVisible = false;
  provisionForm: { name: string; ownerEmail: string; plan: PlanTier } = {
    name: '',
    ownerEmail: '',
    plan: 'FREE',
  };

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly orgStatusSeverity = (status: OrgStatus): TagSeverity =>
    ORG_STATUS_SEVERITY[status] ?? 'secondary';

  readonly billingStatusSeverity = (status: BillingStatus): TagSeverity =>
    BILLING_STATUS_SEVERITY[status] ?? 'secondary';

  ngOnInit(): void {
    this.load();
  }

  openProvisionDialog(): void {
    this.provisionForm = { name: '', ownerEmail: '', plan: 'FREE' };
    this.dialogVisible = true;
  }

  submitProvision(): void {
    if (
      !this.provisionForm.name.trim() ||
      !this.provisionForm.ownerEmail.trim()
    )
      return;
    this.saving.set(true);
    this.#api
      .provisionOrganization({
        name: this.provisionForm.name.trim(),
        ownerEmail: this.provisionForm.ownerEmail.trim(),
        plan: this.provisionForm.plan,
      })
      .subscribe({
        next: (org) => {
          this.saving.set(false);
          this.dialogVisible = false;
          this.#toast.add({
            severity: 'success',
            summary: 'Organization provisioned',
            detail: `"${org.name}" created and invite sent to ${this.provisionForm.ownerEmail}.`,
          });
          this.#router.navigate(['/admin/organizations', org.id]);
        },
        error: () => {
          this.saving.set(false);
          this.#toast.add({
            severity: 'error',
            summary: 'Provisioning failed',
            detail: 'Could not create the organization. Please try again.',
          });
        },
      });
  }

  onSearchChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.offset.set(0);
      this.load();
    }, 300);
  }

  onFilterChange(): void {
    this.offset.set(0);
    this.load();
  }

  onPageChange(event: PaginatorState): void {
    this.offset.set(event.first ?? 0);
    this.load();
  }

  goToDetail(org: AdminOrganizationListItem): void {
    this.#router.navigate(['/admin/organizations', org.id]);
  }

  private load(): void {
    this.loading.set(true);
    this.#api
      .getOrganizations({
        search: this.searchTerm || undefined,
        status: this.selectedStatus ?? undefined,
        limit: PAGE_SIZE,
        offset: this.offset(),
      })
      .subscribe({
        next: (result) => {
          this.organizations.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
