import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MemberMultiselectComponent } from '@saas-frontend/memberships/ui';
import type { MembershipSummary } from '@saas-frontend/memberships/data-access';
import {
  type EventForm,
  browserTimezone,
  TIMEZONE_OPTIONS,
  REMINDER_OPTIONS,
} from './planning.utils';
import { PlanningRruleBuilderComponent } from './planning-rrule-builder.component';

const DEFAULT_FORM: EventForm = {
  title: '',
  startUtc: '',
  endUtc: '',
  isAllDay: false,
  description: '',
  location: '',
  eventTimezone: browserTimezone(),
  rrule: '',
  attendeeIds: [],
  notifyAttendees: false,
  reminderMinutes: null,
};

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000; // 60 minutes

@Component({
  selector: 'app-planning-event-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    MemberMultiselectComponent,
    PlanningRruleBuilderComponent,
  ],
  template: `
    <p-dialog
      [header]="editMode ? 'Edit event' : 'New event'"
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        @if (checkingConflicts) {
          <div
            class="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs text-surface-600"
          >
            Checking conflicts...
          </div>
        } @else if (conflictCount > 0) {
          <div
            class="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-800"
          >
            {{ conflictCount }} potential
            {{ conflictCount === 1 ? 'conflict' : 'conflicts' }} found in this
            time range.
            @if (conflictPreview.length > 0) {
              <ul class="mt-2 ml-4 list-disc">
                @for (line of conflictPreview; track $index) {
                  <li>{{ line }}</li>
                }
              </ul>
            }
          </div>
        }

        <!-- Title -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="evtTitle">
            Title <span class="text-red-500">*</span>
          </label>
          <input
            id="evtTitle"
            pInputText
            [(ngModel)]="form.title"
            placeholder="Event title"
            class="w-full"
          />
        </div>

        <!-- All-day -->
        <div class="flex items-center gap-2">
          <p-checkbox
            [(ngModel)]="form.isAllDay"
            [binary]="true"
            inputId="evtAllDay"
            (ngModelChange)="onAllDayToggle($event)"
          />
          <label for="evtAllDay" class="text-sm text-surface-700">
            All-day event
          </label>
        </div>

        <!-- Start -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">
            Start (UTC) <span class="text-red-500">*</span>
          </label>
          <p-datepicker
            [(ngModel)]="startDate"
            (ngModelChange)="onStartChange($event)"
            [showTime]="!form.isAllDay"
            [hourFormat]="'24'"
            [showButtonBar]="true"
            [showOnFocus]="true"
            [showIcon]="true"
            [fluid]="true"
            dateFormat="dd/mm/yy"
            appendTo="body"
          />
        </div>

        <!-- End -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">
            End (UTC)
          </label>
          <p-datepicker
            [(ngModel)]="endDate"
            (ngModelChange)="onEndChange($event)"
            [showTime]="!form.isAllDay"
            [hourFormat]="'24'"
            [showButtonBar]="true"
            [showOnFocus]="true"
            [showIcon]="true"
            [fluid]="true"
            dateFormat="dd/mm/yy"
            appendTo="body"
            [minDate]="startDate ?? undefined"
          />
        </div>

        <!-- Timezone -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Timezone</label>
          <p-select
            [(ngModel)]="form.eventTimezone"
            [options]="timezoneOptions"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            filterBy="label"
            [fluid]="true"
            appendTo="body"
          />
        </div>

        <!-- Location -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="evtLocation">
            Location
          </label>
          <input
            id="evtLocation"
            pInputText
            [(ngModel)]="form.location"
            placeholder="Optional"
            class="w-full"
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="evtDesc">
            Description
          </label>
          <textarea
            id="evtDesc"
            pInputText
            rows="3"
            [(ngModel)]="form.description"
            placeholder="Optional"
            class="w-full"
          ></textarea>
        </div>

        <!-- Recurrence (RRULE) — visual builder -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Recurrence</label>
          <app-planning-rrule-builder [(rrule)]="form.rrule" />
        </div>

        <!-- Attendees -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Attendees</label>
          <app-member-multiselect
            [members]="members"
            [(ngModel)]="form.attendeeIds"
          />
        </div>

        <!-- Reminder -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Reminder</label>
          <p-select
            [(ngModel)]="form.reminderMinutes"
            [options]="reminderOptions"
            optionLabel="label"
            optionValue="value"
            [fluid]="true"
            appendTo="body"
          />
        </div>

        <!-- Notify attendees (edit mode only) -->
        @if (editMode) {
          <div class="flex items-center gap-2">
            <p-checkbox
              [(ngModel)]="form.notifyAttendees"
              [binary]="true"
              inputId="evtNotify"
              [disabled]="!isDirty"
            />
            <label
              for="evtNotify"
              class="text-sm"
              [class.text-surface-400]="!isDirty"
              [class.text-surface-700]="isDirty"
            >
              Notify attendees of this update
            </label>
          </div>
        }

        <div class="flex justify-end gap-2 pt-2">
          <p-button label="Cancel" severity="secondary" (onClick)="cancel()" />
          <p-button
            [label]="editMode ? 'Save changes' : 'Create'"
            [loading]="saving"
            [disabled]="
              !form.title.trim() || !startDate || (editMode && !isDirty)
            "
            (onClick)="submit()"
          />
        </div>
      </div>
    </p-dialog>
  `,
})
export class PlanningEventFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  @Input() editMode = false;
  @Input() saving = false;
  @Input() checkingConflicts = false;
  @Input() conflictCount = 0;
  @Input() conflictPreview: string[] = [];
  @Input() initialForm: EventForm = { ...DEFAULT_FORM };
  @Input() members: MembershipSummary[] = [];

  @Output() readonly submitted = new EventEmitter<EventForm>();
  @Output() readonly draftChanged = new EventEmitter<EventForm>();

  protected readonly timezoneOptions = TIMEZONE_OPTIONS;
  protected readonly reminderOptions = REMINDER_OPTIONS;

  protected form: EventForm = { ...DEFAULT_FORM };
  protected startDate: Date | null = null;
  protected endDate: Date | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.form = { ...this.initialForm };
      this.startDate = this.#parseIso(this.initialForm.startUtc);
      this.endDate = this.#parseIso(this.initialForm.endUtc);
      this.#emitDraftChanged();
    }
  }

  protected onStartChange(date: Date | null): void {
    this.startDate = date;
    if (!date) return;
    // Auto-set end to start+60min when end is empty or is before the new start
    if (!this.endDate || this.endDate <= date) {
      this.endDate = new Date(date.getTime() + DEFAULT_EVENT_DURATION_MS);
    }
    this.#emitDraftChanged();
  }

  protected onEndChange(date: Date | null): void {
    this.endDate = date;
    this.#emitDraftChanged();
  }

  protected onAllDayToggle(isAllDay: boolean): void {
    if (!isAllDay && this.startDate) {
      // Switching from all-day to timed: snap to 09:00 / 10:00
      const s = new Date(this.startDate);
      s.setHours(9, 0, 0, 0);
      this.startDate = s;
      this.endDate = new Date(s.getTime() + DEFAULT_EVENT_DURATION_MS);
    }
    this.#emitDraftChanged();
  }

  protected cancel(): void {
    this.visibleChange.emit(false);
  }

  protected get isDirty(): boolean {
    const f = this.form;
    const i = this.initialForm;
    const startIso = this.startDate?.toISOString() ?? '';
    const endIso = this.endDate?.toISOString() ?? '';
    const attendeesChanged =
      f.attendeeIds.length !== i.attendeeIds.length ||
      [...f.attendeeIds].sort((a, b) => a.localeCompare(b)).join() !==
        [...i.attendeeIds].sort((a, b) => a.localeCompare(b)).join();
    return (
      f.title.trim() !== i.title.trim() ||
      f.description !== i.description ||
      f.location !== i.location ||
      f.isAllDay !== i.isAllDay ||
      f.rrule !== i.rrule ||
      attendeesChanged ||
      startIso !== i.startUtc ||
      endIso !== i.endUtc ||
      f.reminderMinutes !== i.reminderMinutes
    );
  }

  protected submit(): void {
    if (!this.startDate) return;
    this.submitted.emit({
      ...this.form,
      startUtc: this.startDate.toISOString(),
      endUtc: this.endDate?.toISOString() ?? '',
    });
  }

  #parseIso(iso: string): Date | null {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  #emitDraftChanged(): void {
    this.draftChanged.emit({
      ...this.form,
      startUtc: this.startDate?.toISOString() ?? '',
      endUtc: this.endDate?.toISOString() ?? '',
    });
  }
}
