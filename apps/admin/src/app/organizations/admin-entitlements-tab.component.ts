import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApi,
  EntitlementOverride,
  OrganizationEntitlements,
  OVERRIDE_KEYS,
  OverrideKey,
  SetFeatureFlagOverridePayload,
} from '@saas-frontend/admin/data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

type OverrideKeyItem = { label: string; value: OverrideKey };
type OverrideValueType = 'boolean' | 'number';

const BOOLEAN_KEYS: OverrideKey[] = [
  'advancedAnalytics',
  'customReports',
  'apiAccess',
  'ssoEnabled',
  'prioritySupport',
];
const NUMBER_KEYS: OverrideKey[] = ['maxSeats', 'storageLimitBytes'];

const KEY_ITEMS: OverrideKeyItem[] = OVERRIDE_KEYS.map((k) => ({
  label: k,
  value: k,
}));

@Component({
  selector: 'app-admin-entitlements-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    DatePipe,
    FormsModule,
    CardModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    MessageModule,
    ToastModule,
    TableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    InputNumberModule,
    DatePickerModule,
  ],
  template: `
    <p-toast />

    <!-- Loading skeleton -->
    @if (loading()) {
      <div class="flex flex-col gap-3 mt-4">
        <p-skeleton width="100%" height="3rem" />
        <p-skeleton width="100%" height="10rem" />
      </div>
    }

    @if (!loading()) {
      <!-- Current entitlements (effective, with overrides applied) -->
      <p-card class="mb-4 mt-2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold m-0">Effective Entitlements</h3>
          <p-tag
            [value]="'Plan: ' + (entitlements()?.plan ?? '—')"
            severity="info"
            [rounded]="true"
          />
        </div>
        @if (entitlements()) {
          <div class="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            @for (key of booleanKeys; track key) {
              <div
                class="flex items-center justify-between py-1 border-b border-surface-100"
              >
                <span class="text-surface-600 font-mono text-xs">{{
                  key
                }}</span>
                <span class="flex items-center gap-1">
                  <p-tag
                    [value]="entitlements()![key] ? 'true' : 'false'"
                    [severity]="entitlements()![key] ? 'success' : 'secondary'"
                    [rounded]="true"
                  />
                  @if (hasOverride(key)) {
                    <span
                      class="pi pi-bolt text-amber-500 text-xs"
                      title="Admin override active"
                    ></span>
                  }
                </span>
              </div>
            }
            @for (key of numberKeys; track key) {
              <div
                class="flex items-center justify-between py-1 border-b border-surface-100"
              >
                <span class="text-surface-600 font-mono text-xs">{{
                  key
                }}</span>
                <span class="flex items-center gap-1">
                  <span class="font-mono text-xs font-semibold">{{
                    entitlements()![key]
                  }}</span>
                  @if (hasOverride(key)) {
                    <span
                      class="pi pi-bolt text-amber-500 text-xs"
                      title="Admin override active"
                    ></span>
                  }
                </span>
              </div>
            }
          </div>
        }
      </p-card>

      <!-- Active overrides table -->
      <p-card class="mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold m-0">
            Overrides
            @if (overrides().length > 0) {
              <span class="ml-2 text-xs font-normal text-amber-600">
                ({{ overrides().length }} active)
              </span>
            }
          </h3>
          <p-button
            label="Add Override"
            icon="pi pi-plus"
            size="small"
            (onClick)="openAddDialog()"
          />
        </div>

        @if (overrides().length === 0) {
          <p class="text-surface-400 text-sm">
            No overrides set. Plan defaults apply.
          </p>
        } @else {
          <p-table
            [value]="overrides()"
            [tableStyle]="{ 'min-width': '40rem' }"
          >
            <ng-template #header>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Reason</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </ng-template>
            <ng-template #body let-override>
              <tr>
                <td class="font-mono text-xs">{{ override.key }}</td>
                <td>
                  <p-tag
                    [value]="String(override.value)"
                    [severity]="
                      override.value === true
                        ? 'success'
                        : override.value === false
                          ? 'secondary'
                          : 'info'
                    "
                    [rounded]="true"
                  />
                </td>
                <td class="text-sm text-surface-600 max-w-xs truncate">
                  {{ override.reason }}
                </td>
                <td class="text-xs text-surface-400">
                  {{
                    override.expiresAt
                      ? (override.expiresAt | date: 'mediumDate')
                      : '—'
                  }}
                </td>
                <td>
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    size="small"
                    severity="secondary"
                    (onClick)="openEditDialog(override)"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    size="small"
                    severity="danger"
                    [loading]="deletingKey() === override.key"
                    (onClick)="confirmDelete(override.key)"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </p-card>
    }

    <!-- Add / Edit Override Dialog -->
    <p-dialog
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '28rem' }"
      [header]="
        editingOverride() ? 'Edit Override' : 'Add Entitlement Override'
      "
    >
      <div class="flex flex-col gap-4 pt-2">
        <!-- Key selector -->
        <div class="flex flex-col gap-1">
          <label for="override-key" class="text-sm font-medium"
            >Feature flag key</label
          >
          <p-select
            inputId="override-key"
            [options]="keyItems"
            optionLabel="label"
            optionValue="value"
            [ngModel]="formKey()"
            (ngModelChange)="formKey.set($event)"
            [disabled]="!!editingOverride()"
            placeholder="Select a key"
            class="w-full"
          />
        </div>

        <!-- Value -->
        <div class="flex flex-col gap-1">
          <label for="override-value" class="text-sm font-medium">Value</label>
          @if (valueType() === 'boolean') {
            <div class="flex items-center gap-2">
              <p-checkbox
                inputId="override-value"
                [(ngModel)]="formBoolValue"
                [binary]="true"
              />
              <label for="override-value" class="text-sm">{{
                formBoolValue ? 'true' : 'false'
              }}</label>
            </div>
          } @else {
            <p-inputnumber
              inputId="override-value"
              [(ngModel)]="formNumValue"
              [min]="0"
              class="w-full"
            />
          }
        </div>

        <!-- Reason (required) -->
        <div class="flex flex-col gap-1">
          <label for="override-reason" class="text-sm font-medium">
            Reason <span class="text-red-500">*</span>
          </label>
          <input
            id="override-reason"
            pInputText
            [(ngModel)]="form.reason"
            placeholder="e.g., Enterprise trial — Acme Corp"
            class="w-full"
          />
        </div>

        <!-- Expires at (optional) -->
        <div class="flex flex-col gap-1">
          <label for="override-expires" class="text-sm font-medium">
            Expires at <span class="text-surface-400 text-xs">(optional)</span>
          </label>
          <p-datepicker
            inputId="override-expires"
            [(ngModel)]="form.expiresAt"
            dateFormat="yy-mm-dd"
            [showIcon]="true"
            placeholder="Leave empty for permanent"
            class="w-full"
          />
        </div>
      </div>

      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="dialogVisible = false"
        />
        <p-button
          [label]="editingOverride() ? 'Update' : 'Save'"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="!formKey() || !form.reason"
          (onClick)="saveOverride()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class AdminEntitlementsTabComponent implements OnInit {
  readonly #api = inject(AdminApi);
  readonly #toast = inject(MessageService);

  @Input() orgId = '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingKey = signal<string | null>(null);
  readonly entitlements = signal<OrganizationEntitlements | null>(null);
  readonly overrides = signal<EntitlementOverride[]>([]);
  readonly editingOverride = signal<EntitlementOverride | null>(null);

  readonly overrideKeySet = computed(
    () => new Set(this.overrides().map((o) => o.key)),
  );

  dialogVisible = false;
  form: { reason: string; expiresAt: Date | null } = {
    reason: '',
    expiresAt: null,
  };
  formKey = signal<OverrideKey | null>(null);
  formBoolValue = false;
  formNumValue = 0;

  readonly booleanKeys = BOOLEAN_KEYS;
  readonly numberKeys = NUMBER_KEYS;
  readonly keyItems = KEY_ITEMS;

  // eslint-disable-next-line @typescript-eslint/unbound-method
  readonly String = String;

  readonly valueType = computed<OverrideValueType>(() => {
    const key = this.formKey();
    if (!key) return 'boolean';
    return NUMBER_KEYS.includes(key) ? 'number' : 'boolean';
  });

  hasOverride(key: OverrideKey | string): boolean {
    return this.overrideKeySet().has(key as OverrideKey);
  }

  ngOnInit(): void {
    this.#loadAll();
  }

  openAddDialog(): void {
    this.editingOverride.set(null);
    this.formKey.set(null);
    this.form = { reason: '', expiresAt: null };
    this.formBoolValue = false;
    this.formNumValue = 0;
    this.dialogVisible = true;
  }

  openEditDialog(override: EntitlementOverride): void {
    this.editingOverride.set(override);
    this.formKey.set(override.key);
    this.form = {
      reason: override.reason,
      expiresAt: override.expiresAt ? new Date(override.expiresAt) : null,
    };
    if (typeof override.value === 'boolean') {
      this.formBoolValue = override.value;
    } else {
      this.formNumValue = override.value;
    }
    this.dialogVisible = true;
  }

  saveOverride(): void {
    const key = this.formKey();
    if (!key || !this.form.reason) return;

    const value: boolean | number =
      this.valueType() === 'boolean' ? this.formBoolValue : this.formNumValue;

    const payload: SetFeatureFlagOverridePayload = {
      key,
      value,
      reason: this.form.reason,
      expiresAt: this.form.expiresAt
        ? this.form.expiresAt.toISOString()
        : undefined,
    };

    this.saving.set(true);
    this.#api.setFeatureFlagOverride(this.orgId, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.#toast.add({
          severity: 'success',
          summary: 'Override saved',
          life: 3000,
        });
        this.#loadAll();
      },
      error: () => {
        this.saving.set(false);
        this.#toast.add({
          severity: 'error',
          summary: 'Failed to save override',
          life: 4000,
        });
      },
    });
  }

  confirmDelete(key: string): void {
    this.deletingKey.set(key);
    this.#api.deleteFeatureFlagOverride(this.orgId, key).subscribe({
      next: () => {
        this.deletingKey.set(null);
        this.#toast.add({
          severity: 'success',
          summary: 'Override removed',
          life: 3000,
        });
        this.#loadAll();
      },
      error: () => {
        this.deletingKey.set(null);
        this.#toast.add({
          severity: 'error',
          summary: 'Failed to remove override',
          life: 4000,
        });
      },
    });
  }

  #loadAll(): void {
    this.loading.set(true);
    let entitlementsDone = false;
    let overridesDone = false;

    const maybeDone = (): void => {
      if (entitlementsDone && overridesDone) this.loading.set(false);
    };

    this.#api.getEntitlements(this.orgId).subscribe({
      next: (e) => {
        this.entitlements.set(e);
        entitlementsDone = true;
        maybeDone();
      },
      error: () => {
        entitlementsDone = true;
        maybeDone();
      },
    });

    this.#api.listFeatureFlagOverrides(this.orgId).subscribe({
      next: (o) => {
        this.overrides.set(o);
        overridesDone = true;
        maybeDone();
      },
      error: () => {
        overridesDone = true;
        maybeDone();
      },
    });
  }
}
