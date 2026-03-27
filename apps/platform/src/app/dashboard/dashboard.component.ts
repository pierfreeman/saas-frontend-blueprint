import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { MembershipsApi } from '@saas-frontend/memberships/data-access';
import {
  BillingApi,
  SubscriptionResponse,
} from '@saas-frontend/billing/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import {
  StorageApi,
  StorageQuotaResponse,
} from '@saas-frontend/storage/data-access';

function formatStorageBytes(bytes: string | null | undefined): string {
  if (!bytes) return '—';
  const n = Number.parseInt(bytes, 10);
  if (Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1_073_741_824) return `${(n / 1_048_576).toFixed(1)} MB`;
  return `${(n / 1_073_741_824).toFixed(2)} GB`;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CardModule, SkeletonModule, TagModule, RouterLink],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Welcome header -->
      <div>
        <h1 class="text-2xl font-bold text-surface-900 m-0">
          Welcome back{{ name() ? ', ' + name() : '' }}!
        </h1>
        <p class="text-surface-500 mt-1 mb-0">{{ email() }}</p>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Members -->
        <a routerLink="/members" class="no-underline">
          <p-card
            styleClass="text-center hover:shadow-md transition-shadow cursor-pointer"
          >
            @if (loadingMembers()) {
              <p-skeleton
                height="2.25rem"
                width="3rem"
                styleClass="mx-auto mb-1"
              />
            } @else {
              <div class="text-3xl font-bold text-primary">
                {{ memberCount() }}
              </div>
            }
            <div class="text-surface-500 text-sm mt-1">Members</div>
          </p-card>
        </a>

        <!-- Plan -->
        <p-card styleClass="text-center">
          @if (loadingBilling()) {
            <p-skeleton
              height="2.25rem"
              width="5rem"
              styleClass="mx-auto mb-1"
            />
          } @else {
            <div class="text-3xl font-bold text-primary">
              {{ planLabel() }}
            </div>
          }
          <div class="text-surface-500 text-sm mt-1">Plan</div>
        </p-card>

        <!-- Seats -->
        <p-card styleClass="text-center">
          @if (loadingBilling()) {
            <p-skeleton
              height="2.25rem"
              width="3rem"
              styleClass="mx-auto mb-1"
            />
          } @else {
            <div class="text-3xl font-bold text-primary">{{ seatCount() }}</div>
          }
          <div class="text-surface-500 text-sm mt-1">Seats</div>
        </p-card>

        <!-- Storage -->
        <a routerLink="/storage" class="no-underline">
          <p-card
            styleClass="text-center hover:shadow-md transition-shadow cursor-pointer"
          >
            @if (loadingStorage()) {
              <p-skeleton
                height="2.25rem"
                width="6rem"
                styleClass="mx-auto mb-1"
              />
            } @else {
              <div class="text-3xl font-bold text-primary">
                {{ storageUsedLabel() }}
              </div>
            }
            <div class="text-surface-500 text-sm mt-1">
              Storage
              @if (storageLimitLabel()) {
                <span class="text-surface-400">
                  / {{ storageLimitLabel() }}</span
                >
              }
            </div>
          </p-card>
        </a>
      </div>

      <!-- Recent activity placeholder -->
      <p-card header="Recent activity">
        <p class="text-surface-500 text-sm m-0">No activity yet.</p>
      </p-card>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #membershipsApi = inject(MembershipsApi);
  readonly #billingApi = inject(BillingApi);
  readonly #entsStore = inject(EntitlementsStore);
  readonly #storageApi = inject(StorageApi);

  readonly memberCount = signal<number | null>(null);
  readonly subscription = signal<SubscriptionResponse | null>(null);
  readonly storageQuota = signal<StorageQuotaResponse | null>(null);
  readonly loadingMembers = signal(true);
  readonly loadingBilling = signal(true);
  readonly loadingStorage = signal(true);

  readonly email = () => this.#authStore.currentUser()?.email ?? '';
  readonly name = () =>
    this.#authStore.currentUser()?.email?.split('@')[0] ?? '';

  readonly planLabel = () => {
    const sub = this.subscription();
    if (!sub) return '—';
    const status = sub.billingStatus;
    if (status === 'NONE') return 'Free';
    if (status === 'ACTIVE' || status === 'TRIALING') return 'Pro';
    if (status === 'CANCELED' || status === 'PAUSED') return 'Free';
    return (
      status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ')
    );
  };

  readonly seatCount = () => this.#entsStore.maxSeats();

  readonly storageUsedLabel = computed(() =>
    formatStorageBytes(this.storageQuota()?.storageUsedBytes ?? null),
  );
  readonly storageLimitLabel = computed(() =>
    formatStorageBytes(this.storageQuota()?.storageLimitBytes ?? null),
  );

  ngOnInit(): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) {
      this.loadingMembers.set(false);
      this.loadingBilling.set(false);
      this.loadingStorage.set(false);
      return;
    }

    this.#membershipsApi.getMemberships(orgId).subscribe({
      next: (list) => {
        this.memberCount.set(list.length);
        this.loadingMembers.set(false);
      },
      error: () => this.loadingMembers.set(false),
    });

    this.#billingApi.getSubscription(orgId).subscribe({
      next: (sub) => {
        this.subscription.set(sub);
        this.loadingBilling.set(false);
      },
      error: () => this.loadingBilling.set(false),
    });

    this.#storageApi.getStorageQuota().subscribe({
      next: (quota) => {
        this.storageQuota.set(quota);
        this.loadingStorage.set(false);
      },
      error: () => this.loadingStorage.set(false),
    });
  }
}
