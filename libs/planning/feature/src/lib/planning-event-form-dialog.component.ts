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
import { type EventForm } from './planning.utils';

const DEFAULT_FORM: EventForm = {
  title: '',
  startUtc: '',
  endUtc: '',
  isAllDay: false,
  description: '',
  location: '',
  eventTimezone: 'UTC',
  rrule: '',
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
            [showOnFocus]="false"
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
            [showTime]="!form.isAllDay"
            [hourFormat]="'24'"
            [showButtonBar]="true"
            [showOnFocus]="false"
            [fluid]="true"
            dateFormat="dd/mm/yy"
            appendTo="body"
            [minDate]="startDate ?? undefined"
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

        <!-- Recurrence (RRULE) — plain text input; visual builder UI is deferred -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="evtRrule">
            Recurrence (RRULE)
          </label>
          <input
            id="evtRrule"
            pInputText
            [(ngModel)]="form.rrule"
            placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR"
            class="w-full"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <p-button label="Cancel" severity="secondary" (onClick)="cancel()" />
          <p-button
            [label]="editMode ? 'Save changes' : 'Create'"
            [loading]="saving"
            [disabled]="!form.title.trim() || !startDate"
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
  @Input() initialForm: EventForm = { ...DEFAULT_FORM };

  @Output() readonly submitted = new EventEmitter<EventForm>();

  protected form: EventForm = { ...DEFAULT_FORM };
  protected startDate: Date | null = null;
  protected endDate: Date | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.form = { ...this.initialForm };
      this.startDate = this.#parseIso(this.initialForm.startUtc);
      this.endDate = this.#parseIso(this.initialForm.endUtc);
    }
  }

  protected onStartChange(date: Date | null): void {
    this.startDate = date;
    if (!date) return;
    // Auto-set end to start+60min when end is empty or is before the new start
    if (!this.endDate || this.endDate <= date) {
      this.endDate = new Date(date.getTime() + DEFAULT_EVENT_DURATION_MS);
    }
  }

  protected onAllDayToggle(isAllDay: boolean): void {
    if (!isAllDay && this.startDate) {
      // Switching from all-day to timed: snap to 09:00 / 10:00
      const s = new Date(this.startDate);
      s.setHours(9, 0, 0, 0);
      this.startDate = s;
      this.endDate = new Date(s.getTime() + DEFAULT_EVENT_DURATION_MS);
    }
  }

  protected cancel(): void {
    this.visibleChange.emit(false);
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
    return isNaN(d.getTime()) ? null : d;
  }
}
