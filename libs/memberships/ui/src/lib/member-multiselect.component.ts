import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
} from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import type { MembershipSummary } from '@saas-frontend/memberships/data-access';

/** Flat option shape used by the multiselect. */
export interface MemberOption {
  userId: string;
  label: string;
  pictureUrl: string | null | undefined;
  initials: string;
}

function toOption(m: MembershipSummary): MemberOption {
  const first = m.user?.firstName ?? '';
  const last = m.user?.lastName ?? '';
  const label =
    [first, last].filter(Boolean).join(' ') ||
    m.user?.email ||
    (m.userId ?? '');
  const initials =
    ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() ||
    m.user?.email?.[0]?.toUpperCase() ||
    '?';
  return {
    userId: m.userId ?? '',
    label,
    pictureUrl: m.user?.pictureUrl,
    initials,
  };
}

/**
 * Reusable member multiselect backed by PrimeNG `p-multiselect`.
 * Implements ControlValueAccessor so it works with both template-driven
 * and reactive forms. Its value is `string[]` (array of userIds).
 *
 * Usage:
 *   <app-member-multiselect [members]="members" [(ngModel)]="form.attendeeIds" />
 */
@Component({
  selector: 'app-member-multiselect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MultiSelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MemberMultiselectComponent),
      multi: true,
    },
  ],
  template: `
    <p-multiselect
      [options]="options"
      [(ngModel)]="selectedIds"
      (ngModelChange)="onModelChange($event)"
      optionLabel="label"
      optionValue="userId"
      [filter]="true"
      filterBy="label"
      [placeholder]="placeholder"
      [fluid]="true"
      appendTo="body"
      [showClear]="true"
    >
      <!-- Option row: avatar + name -->
      <ng-template #item let-opt>
        <div class="flex items-center gap-2">
          @if (opt.pictureUrl) {
            <img
              [src]="opt.pictureUrl"
              alt=""
              class="w-6 h-6 rounded-full object-cover shrink-0"
            />
          } @else {
            <span
              class="w-6 h-6 rounded-full bg-surface-300 flex items-center justify-center text-[10px] font-semibold text-surface-700 shrink-0"
            >
              {{ opt.initials }}
            </span>
          }
          <span class="text-sm">{{ opt.label }}</span>
        </div>
      </ng-template>

      <!-- Chips in the trigger button -->
      <ng-template #selectedItems let-values>
        @if (values && values.length > 0) {
          <div class="flex flex-wrap gap-1">
            @for (v of values; track v.userId) {
              <span
                class="inline-flex items-center gap-1 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full"
              >
                @if (v.pictureUrl) {
                  <img
                    [src]="v.pictureUrl"
                    alt=""
                    class="w-4 h-4 rounded-full object-cover"
                  />
                }
                {{ v.label }}
              </span>
            }
          </div>
        } @else {
          <span class="text-surface-400 text-sm">{{ placeholder }}</span>
        }
      </ng-template>
    </p-multiselect>
  `,
})
export class MemberMultiselectComponent implements ControlValueAccessor {
  @Input() placeholder = 'Select attendees…';

  @Input() set members(value: MembershipSummary[]) {
    this.options = value.map(toOption);
  }

  protected options: MemberOption[] = [];
  protected selectedIds: string[] = [];

  // CVA plumbing — default no-ops replaced by registerOnChange / registerOnTouched
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  #onChange: (v: string[]) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  #onTouched: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.selectedIds = value ?? [];
  }

  registerOnChange(fn: (v: string[]) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  protected onModelChange(ids: string[]): void {
    this.selectedIds = ids ?? [];
    this.#onChange(this.selectedIds);
    this.#onTouched();
  }
}
