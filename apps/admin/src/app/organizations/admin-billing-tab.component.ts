import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  Input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  AdminApi,
  AdminBillingOverview,
  BillingStatus,
} from '@saas-frontend/admin/data-access';

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn' | 'danger';

const BILLING_STATUS_SEVERITY: Record<BillingStatus, TagSeverity> = {
  ACTIVE: 'success',
  TRIALING: 'info',
  PAST_DUE: 'warn',
  UNPAID: 'danger',
  CANCELED: 'secondary',
  NONE: 'secondary',
};

@Component({
  selector: 'app-admin-billing-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CardModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    MessageModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="flex flex-col gap-4 pt-4">
      @if (loading()) {
        <div class="grid grid-cols-2 gap-4">
          @for (_ of skeletons; track $index) {
            <div
              class="flex flex-col gap-2 p-4 border border-surface-200 rounded-lg"
            >
              <p-skeleton width="8rem" height="0.8rem" />
              <p-skeleton width="12rem" height="1rem" />
            </div>
          }
        </div>
      }

      @if (!loading() && overview()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Billing status -->
          <div class="p-4 border border-surface-200 rounded-lg bg-surface-0">
            <p
              class="text-xs text-surface-400 uppercase tracking-wide m-0 mb-1"
            >
              Status
            </p>
            <p-tag
              [value]="overview()!.billingStatus"
              [severity]="billingSeverity(overview()!.billingStatus)"
              [rounded]="true"
            />
          </div>

          <!-- Plan -->
          <div class="p-4 border border-surface-200 rounded-lg bg-surface-0">
            <p
              class="text-xs text-surface-400 uppercase tracking-wide m-0 mb-1"
            >
              Plan
            </p>
            <p class="font-medium text-surface-900 m-0">
              {{ overview()!.planId ?? '—' }}
            </p>
          </div>

          <!-- Stripe customer ID -->
          <div class="p-4 border border-surface-200 rounded-lg bg-surface-0">
            <p
              class="text-xs text-surface-400 uppercase tracking-wide m-0 mb-1"
            >
              Stripe Customer
            </p>
            <p class="font-mono text-sm text-surface-700 m-0">
              {{ overview()!.stripeCustomerId ?? '—' }}
            </p>
          </div>

          <!-- Subscription ID -->
          <div class="p-4 border border-surface-200 rounded-lg bg-surface-0">
            <p
              class="text-xs text-surface-400 uppercase tracking-wide m-0 mb-1"
            >
              Subscription ID
            </p>
            <p class="font-mono text-sm text-surface-700 m-0">
              {{ overview()!.subscriptionId ?? '—' }}
            </p>
          </div>

          <!-- Period end -->
          <div class="p-4 border border-surface-200 rounded-lg bg-surface-0">
            <p
              class="text-xs text-surface-400 uppercase tracking-wide m-0 mb-1"
            >
              Current Period End
            </p>
            <p class="font-medium text-surface-900 m-0">
              {{
                overview()!.subscriptionPeriodEnd
                  ? (overview()!.subscriptionPeriodEnd! | date: 'mediumDate')
                  : '—'
              }}
            </p>
          </div>

          <!-- Cancel at period end -->
          <div class="p-4 border border-surface-200 rounded-lg bg-surface-0">
            <p
              class="text-xs text-surface-400 uppercase tracking-wide m-0 mb-1"
            >
              Cancel at Period End
            </p>
            <p-tag
              [value]="overview()!.cancelAtPeriodEnd ? 'Yes' : 'No'"
              [severity]="overview()!.cancelAtPeriodEnd ? 'warn' : 'success'"
              [rounded]="true"
            />
          </div>
        </div>

        <!-- Stripe portal button -->
        @if (overview()!.stripeCustomerId) {
          <div class="flex justify-end">
            <p-button
              label="Open Stripe Portal"
              icon="pi pi-external-link"
              severity="secondary"
              [loading]="openingPortal()"
              (onClick)="openPortal()"
            />
          </div>
        }
      }
    </div>
  `,
})
export class AdminBillingTabComponent implements OnInit {
  @Input({ required: true }) orgId!: string;

  readonly #api = inject(AdminApi);
  readonly #messageService = inject(MessageService);

  readonly skeletons = Array(6);
  readonly overview = signal<AdminBillingOverview | null>(null);
  readonly loading = signal(true);
  readonly openingPortal = signal(false);

  readonly billingSeverity = (status: BillingStatus): TagSeverity =>
    BILLING_STATUS_SEVERITY[status] ?? 'secondary';

  ngOnInit(): void {
    this.#api.getBillingOverview(this.orgId).subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openPortal(): void {
    this.openingPortal.set(true);
    const returnUrl = window.location.href;
    this.#api.getBillingPortalUrl(this.orgId, returnUrl).subscribe({
      next: ({ url }) => {
        this.openingPortal.set(false);
        window.open(url, '_blank');
      },
      error: () => {
        this.openingPortal.set(false);
        this.#messageService.add({
          severity: 'error',
          summary: 'Could not open billing portal',
        });
      },
    });
  }
}
