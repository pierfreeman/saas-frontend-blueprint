import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  Input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
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
    FormsModule,
    CardModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    MessageModule,
    ToastModule,
    DialogModule,
    InputTextModule,
    DatePickerModule,
    TextareaModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <!-- ─── Change Plan Dialog ─── -->
    <p-dialog
      header="Change Subscription Plan"
      [modal]="true"
      [(visible)]="showChangePlanDialog"
      [style]="{ width: '28rem' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="priceId" class="text-sm font-medium text-surface-700">
            Stripe Price ID
          </label>
          <input
            id="priceId"
            pInputText
            [(ngModel)]="planPriceId"
            placeholder="price_xxx"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="planReason" class="text-sm font-medium text-surface-700">
            Reason <span class="text-surface-400">(optional)</span>
          </label>
          <textarea
            id="planReason"
            pTextarea
            [(ngModel)]="planReason"
            placeholder="e.g. Enterprise upgrade agreed with sales"
            rows="2"
            class="w-full"
          ></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="showChangePlanDialog.set(false)"
        />
        <p-button
          label="Change Plan"
          [loading]="savingPlan()"
          [disabled]="!planPriceId().trim()"
          (onClick)="submitChangePlan()"
        />
      </ng-template>
    </p-dialog>

    <!-- ─── Extend Trial Dialog ─── -->
    <p-dialog
      header="Extend Trial"
      [modal]="true"
      [(visible)]="showExtendTrialDialog"
      [style]="{ width: '24rem' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="trialEnd" class="text-sm font-medium text-surface-700">
            New Trial End Date
          </label>
          <p-datepicker
            inputId="trialEnd"
            [(ngModel)]="trialEndDate"
            [minDate]="minTrialDate"
            dateFormat="yy-mm-dd"
            [showIcon]="true"
            class="w-full"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="showExtendTrialDialog.set(false)"
        />
        <p-button
          label="Extend Trial"
          [loading]="savingTrial()"
          [disabled]="!trialEndDate()"
          (onClick)="submitExtendTrial()"
        />
      </ng-template>
    </p-dialog>

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

        <!-- Action buttons -->
        <div class="flex flex-wrap gap-2 justify-end">
          @if (overview()!.stripeCustomerId) {
            <p-button
              label="Open Stripe Portal"
              icon="pi pi-external-link"
              severity="secondary"
              [loading]="openingPortal()"
              (onClick)="openPortal()"
            />
          }
          @if (overview()!.subscriptionId) {
            <p-button
              label="Change Plan"
              icon="pi pi-sync"
              severity="secondary"
              (onClick)="openChangePlanDialog()"
            />
          }
          @if (overview()!.billingStatus === 'TRIALING') {
            <p-button
              label="Extend Trial"
              icon="pi pi-calendar-plus"
              severity="secondary"
              (onClick)="openExtendTrialDialog()"
            />
          }
        </div>
      }
    </div>
  `,
})
export class AdminBillingTabComponent implements OnInit {
  @Input({ required: true }) orgId!: string;

  readonly #api = inject(AdminApi);
  readonly #messageService = inject(MessageService);

  readonly skeletons = new Array(6);
  readonly overview = signal<AdminBillingOverview | null>(null);
  readonly loading = signal(true);
  readonly openingPortal = signal(false);

  // Change Plan dialog
  readonly showChangePlanDialog = signal(false);
  readonly planPriceId = signal('');
  readonly planReason = signal('');
  readonly savingPlan = signal(false);

  // Extend Trial dialog
  readonly showExtendTrialDialog = signal(false);
  readonly trialEndDate = signal<Date | null>(null);
  readonly savingTrial = signal(false);
  readonly minTrialDate = new Date();

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
    const returnUrl = globalThis.location.href;
    this.#api.getBillingPortalUrl(this.orgId, returnUrl).subscribe({
      next: ({ url }) => {
        this.openingPortal.set(false);
        globalThis.open(url, '_blank');
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

  openChangePlanDialog(): void {
    this.planPriceId.set('');
    this.planReason.set('');
    this.showChangePlanDialog.set(true);
  }

  submitChangePlan(): void {
    const priceId = this.planPriceId().trim();
    if (!priceId) return;
    this.savingPlan.set(true);
    const reason = this.planReason().trim() || undefined;
    this.#api.changePlan(this.orgId, { priceId, reason }).subscribe({
      next: () => {
        this.savingPlan.set(false);
        this.showChangePlanDialog.set(false);
        this.#messageService.add({
          severity: 'success',
          summary: 'Plan change initiated',
          detail: 'Stripe will sync the updated subscription shortly.',
        });
      },
      error: () => {
        this.savingPlan.set(false);
        this.#messageService.add({
          severity: 'error',
          summary: 'Could not change plan',
        });
      },
    });
  }

  openExtendTrialDialog(): void {
    this.trialEndDate.set(null);
    this.showExtendTrialDialog.set(true);
  }

  submitExtendTrial(): void {
    const trialEnd = this.trialEndDate();
    if (!trialEnd) return;
    this.savingTrial.set(true);
    this.#api
      .extendTrial(this.orgId, { trialEnd: trialEnd.toISOString() })
      .subscribe({
        next: () => {
          this.savingTrial.set(false);
          this.showExtendTrialDialog.set(false);
          this.#messageService.add({
            severity: 'success',
            summary: 'Trial extended',
            detail: `Trial now ends on ${trialEnd.toLocaleDateString()}.`,
          });
        },
        error: () => {
          this.savingTrial.set(false);
          this.#messageService.add({
            severity: 'error',
            summary: 'Could not extend trial',
          });
        },
      });
  }
}
