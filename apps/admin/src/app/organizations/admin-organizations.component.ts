import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
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
import {
  AdminApi,
  AdminOrganizationListItem,
  OrgStatus,
  BillingStatus,
} from '@saas-frontend/admin/data-access';

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

const STATUS_OPTIONS: { label: string; value: OrgStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Deleted', value: 'DELETED' },
];

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  ],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 m-0">Organizations</h1>
          <p class="text-surface-500 mt-1 mb-0 text-sm">
            {{ total() }} organizations total
          </p>
        </div>
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
  `,
})
export class AdminOrganizationsComponent implements OnInit {
  readonly #api = inject(AdminApi);
  readonly #router = inject(Router);

  readonly PAGE_SIZE = PAGE_SIZE;
  readonly statusOptions = STATUS_OPTIONS;
  readonly skeletons = Array(5);

  searchTerm = '';
  selectedStatus: OrgStatus | null = null;

  readonly organizations = signal<AdminOrganizationListItem[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly orgStatusSeverity = (status: OrgStatus): TagSeverity =>
    ORG_STATUS_SEVERITY[status] ?? 'secondary';

  readonly billingStatusSeverity = (status: BillingStatus): TagSeverity =>
    BILLING_STATUS_SEVERITY[status] ?? 'secondary';

  ngOnInit(): void {
    this.load();
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
