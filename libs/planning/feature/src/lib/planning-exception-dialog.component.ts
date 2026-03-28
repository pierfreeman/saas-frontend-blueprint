import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { type EventOccurrence } from '@saas-frontend/planning/data-access';
import { toLocalDatetimeInput } from './planning.utils';

interface ExceptionForm {
  isCancelled: boolean;
  startUtc: string;
  endUtc: string;
  title: string;
}

@Component({
  selector: 'app-planning-exception-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
  ],
  template: `
    <p-dialog
      header="Override occurrence"
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <p class="text-sm text-surface-600 m-0">
          Override or cancel a single occurrence of this recurring event.
          Original start:
          <strong>{{ occurrence?.originalStartUtc | date: 'medium' }}</strong>
        </p>

        <!-- Cancel occurrence -->
        <div class="flex items-center gap-2">
          <p-checkbox
            [(ngModel)]="exceptionForm.isCancelled"
            [binary]="true"
            inputId="excCancel"
          />
          <label for="excCancel" class="text-sm text-surface-700">
            Cancel this occurrence
          </label>
        </div>

        <!-- Override start/end/title -->
        @if (!exceptionForm.isCancelled) {
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700" for="excStart">
              New start (UTC)
            </label>
            <input
              id="excStart"
              pInputText
              type="datetime-local"
              [(ngModel)]="exceptionForm.startUtc"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700" for="excEnd">
              New end (UTC)
            </label>
            <input
              id="excEnd"
              pInputText
              type="datetime-local"
              [(ngModel)]="exceptionForm.endUtc"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700" for="excTitle">
              Override title
            </label>
            <input
              id="excTitle"
              pInputText
              [(ngModel)]="exceptionForm.title"
              placeholder="Leave blank to keep original"
              class="w-full"
            />
          </div>
        }

        <div class="flex justify-end gap-2 pt-2">
          <p-button
            label="Cancel"
            severity="secondary"
            (onClick)="visibleChange.emit(false)"
          />
          <p-button label="Save" [loading]="saving" (onClick)="submit()" />
        </div>
      </div>
    </p-dialog>
  `,
})
export class PlanningExceptionDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  @Input() saving = false;
  @Input() occurrence: EventOccurrence | null = null;

  @Output() readonly submitted = new EventEmitter<ExceptionForm>();

  protected exceptionForm: ExceptionForm = {
    isCancelled: false,
    startUtc: '',
    endUtc: '',
    title: '',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      const occ = this.occurrence;
      this.exceptionForm = {
        isCancelled: false,
        startUtc: occ ? toLocalDatetimeInput(occ.startUtc) : '',
        endUtc: occ ? toLocalDatetimeInput(occ.endUtc) : '',
        title: '',
      };
    }
  }

  protected submit(): void {
    this.submitted.emit({ ...this.exceptionForm });
  }
}
