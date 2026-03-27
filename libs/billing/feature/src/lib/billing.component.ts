import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { BillingApi } from '@saas-frontend/billing/data-access';
import type { SubscriptionResponse } from '@saas-frontend/billing/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { environment } from 'src/environments/environment';

type TagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast'
  | undefined;

const STATUS_LABELS: Record<string, string> = {
  NONE: 'Free',
  TRIALING: 'Trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Past Due',
  CANCELED: 'Canceled',
  UNPAID: 'Unpaid',
  INCOMPLETE: 'Incomplete',
  INCOMPLETE_EXPIRED: 'Expired',
  PAUSED: 'Paused',
};

const STATUS_SEVERITY: Record<string, TagSeverity> = {
  NONE: 'secondary',
  TRIALING: 'info',
  ACTIVE: 'success',
  PAST_DUE: 'warn',
  CANCELED: 'secondary',
  UNPAID: 'danger',
  INCOMPLETE: 'warn',
  INCOMPLETE_EXPIRED: 'danger',
  PAUSED: 'secondary',
};

@Component({
  selector: 'app-billing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="flex flex-col gap-6 max-w-2xl">
      <h1 class="text-2xl font-bold text-surface-900 m-0">Billing</h1>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <p-progressSpinner strokeWidth="3" />
        </div>
      }

      <!-- Error -->
      @if (!loading() && error()) {
        <p-card>
          <div class="flex flex-col items-center gap-4 py-6">
            <i class="pi pi-exclamation-triangle text-4xl text-red-500"></i>
            <p class="text-surface-600 m-0">{{ error() }}</p>
            <p-button label="Retry" icon="pi pi-refresh" (onClick)="load()" />
          </div>
        </p-card>
      }

      <!-- Subscription card -->
      @if (!loading() && !error() && sub()) {
        <p-card>
          <div class="flex flex-col gap-5">
            <!-- Header row -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <i class="pi pi-credit-card text-2xl text-primary"></i>
                <div>
                  <div class="font-semibold text-surface-900 text-lg">
                    {{ planTitle() }}
                  </div>
                  @if (sub()!.planId) {
                    <div class="text-surface-400 text-xs font-mono">
                      {{ sub()!.planId }}
                    </div>
                  }
                </div>
              </div>
              <p-tag [value]="statusLabel()" [severity]="statusSeverity()" />
            </div>

            <!-- Details grid -->
            @if (isActive()) {
              <div
                class="grid grid-cols-2 gap-4 border-t border-surface-100 pt-4"
              >
                <div>
                  <div
                    class="text-xs text-surface-400 uppercase tracking-wide mb-1"
                  >
                    Seats
                  </div>
                  <div class="font-semibold text-surface-800">
                    {{ maxSeats() }}
                  </div>
                </div>

                <div>
                  <div
                    class="text-xs text-surface-400 uppercase tracking-wide mb-1"
                  >
                    Subscription ID
                  </div>
                  <div class="font-mono text-xs text-surface-500 truncate">
                    {{ sub()!.subscriptionId ?? '—' }}
                  </div>
                </div>

                @if (sub()!.subscriptionPeriodStart) {
                  <div>
                    <div
                      class="text-xs text-surface-400 uppercase tracking-wide mb-1"
                    >
                      Period start
                    </div>
                    <div class="text-surface-700 text-sm">
                      {{ sub()!.subscriptionPeriodStart | date: 'mediumDate' }}
                    </div>
                  </div>
                }

                @if (sub()!.subscriptionPeriodEnd) {
                  <div>
                    <div
                      class="text-xs text-surface-400 uppercase tracking-wide mb-1"
                    >
                      Period end
                    </div>
                    <div class="text-surface-700 text-sm">
                      {{ sub()!.subscriptionPeriodEnd | date: 'mediumDate' }}
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p
                class="text-surface-500 text-sm m-0 border-t border-surface-100 pt-4"
              >
                You are currently on the free plan. Upgrade to unlock additional
                seats, storage, and premium features.
              </p>
            }

            <!-- Cancel-at-period-end warning -->
            @if (sub()!.cancelAtPeriodEnd) {
              <div
                class="flex items-start gap-3 rounded-lg bg-orange-50 border border-orange-200 p-3"
              >
                <i class="pi pi-exclamation-circle text-orange-500 mt-0.5"></i>
                <p class="text-orange-700 text-sm m-0">
                  Your subscription will be cancelled at the end of the current
                  billing period
                  @if (sub()!.subscriptionPeriodEnd) {
                    ({{ sub()!.subscriptionPeriodEnd | date: 'mediumDate' }})
                  }
                  . You can reactivate it anytime from the billing portal.
                </p>
              </div>
            }

            <!-- Past due / unpaid warning -->
            @if (isPastDue()) {
              <div
                class="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3"
              >
                <i class="pi pi-exclamation-triangle text-red-500 mt-0.5"></i>
                <p class="text-red-700 text-sm m-0">
                  Your payment is past due. Please update your payment method in
                  the billing portal to keep your subscription active.
                </p>
              </div>
            }

            <!-- Action buttons -->
            <div class="flex gap-3 pt-2">
              @if (isActive() || isPastDue() || isCanceledButAccess()) {
                <p-button
                  label="Manage Billing"
                  icon="pi pi-external-link"
                  [loading]="redirecting()"
                  (onClick)="openPortal()"
                />
                @if (isActive() && !sub()!.cancelAtPeriodEnd) {
                  <p-button
                    label="Cancel Subscription"
                    severity="danger"
                    [outlined]="true"
                    icon="pi pi-times"
                    [loading]="cancelling()"
                    (onClick)="confirmCancel()"
                  />
                }
              } @else {
                <p-button
                  label="Upgrade to Pro"
                  icon="pi pi-arrow-up"
                  [loading]="redirecting()"
                  (onClick)="upgrade()"
                />
              }
            </div>
          </div>
        </p-card>
      }
    </div>
  `,
})
export class BillingComponent implements OnInit {
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #billingApi = inject(BillingApi);
  readonly #ent = inject(EntitlementsStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #messageService = inject(MessageService);

  readonly planTitle = computed(() => {
    const p = this.#ent.plan();
    if (p === 'ENTERPRISE') return 'Enterprise Plan';
    if (p === 'PRO') return 'Pro Plan';
    return 'Free Plan';
  });

  readonly maxSeats = this.#ent.maxSeats;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly sub = signal<SubscriptionResponse | null>(null);
  readonly redirecting = signal(false);
  readonly cancelling = signal(false);

  readonly statusLabel = computed(
    () => STATUS_LABELS[this.sub()?.billingStatus ?? 'NONE'] ?? 'Unknown',
  );
  readonly statusSeverity = computed<TagSeverity>(
    () => STATUS_SEVERITY[this.sub()?.billingStatus ?? 'NONE'],
  );

  readonly isActive = computed(() => {
    const s = this.sub()?.billingStatus;
    return s === 'ACTIVE' || s === 'TRIALING';
  });

  readonly isPastDue = computed(() => {
    const s = this.sub()?.billingStatus;
    return s === 'PAST_DUE' || s === 'UNPAID';
  });

  /** Canceled but period hasn't ended yet — still has access, show portal. */
  readonly isCanceledButAccess = computed(() => {
    const s = this.sub();
    return (
      s?.billingStatus === 'CANCELED' &&
      s.cancelAtPeriodEnd &&
      !!s.subscriptionPeriodEnd
    );
  });

  #orgId(): string {
    return this.#orgsStore.activeOrgId() ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const orgId = this.#orgId();
    if (!orgId) return;
    this.loading.set(true);
    this.error.set(null);
    this.#ent.loadEntitlements(orgId);
    this.#billingApi.getSubscription(orgId).subscribe({
      next: (data) => {
        this.sub.set(data);
        this.loading.set(false);
        this.#ent.invalidateCache(orgId);
      },
      error: () => {
        this.error.set('Failed to load billing information.');
        this.loading.set(false);
      },
    });
  }

  upgrade(): void {
    const orgId = this.#orgId();
    const origin = globalThis.location.origin;
    this.redirecting.set(true);
    this.#billingApi
      .createCheckoutSession({
        orgId,
        priceId: environment.stripePriceId,
        successUrl: `${origin}/billing`,
        cancelUrl: `${origin}/billing`,
      })
      .subscribe({
        next: ({ url }) => {
          globalThis.location.href = url;
        },
        error: () => {
          this.redirecting.set(false);
          this.#messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not start checkout. Please try again.',
          });
        },
      });
  }

  openPortal(): void {
    const orgId = this.#orgId();
    const origin = globalThis.location.origin;
    this.redirecting.set(true);
    this.#billingApi
      .createPortalSession({ orgId, returnUrl: `${origin}/billing` })
      .subscribe({
        next: ({ url }) => {
          globalThis.location.href = url;
        },
        error: () => {
          this.redirecting.set(false);
          this.#messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not open billing portal. Please try again.',
          });
        },
      });
  }

  confirmCancel(): void {
    this.#confirmationService.confirm({
      header: 'Cancel Subscription',
      message:
        'Your subscription will remain active until the end of the current billing period. Are you sure you want to cancel?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Cancel',
      rejectLabel: 'Keep Subscription',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.#cancelSubscription(),
    });
  }

  #cancelSubscription(): void {
    const orgId = this.#orgId();
    this.cancelling.set(true);
    this.#billingApi.cancelSubscription({ orgId }).subscribe({
      next: ({ message }) => {
        this.cancelling.set(false);
        this.#messageService.add({
          severity: 'success',
          summary: 'Subscription Canceled',
          detail: message,
        });
        this.load();
      },
      error: () => {
        this.cancelling.set(false);
        this.#messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not cancel subscription. Please try again.',
        });
      },
    });
  }
}
