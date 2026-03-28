import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RRule } from 'rrule';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';

export type RruleFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RruleEndType = 'never' | 'count' | 'until';

interface RruleState {
  freq: RruleFreq;
  interval: number;
  byweekday: number[]; // 0=MO … 6=SU
  endType: RruleEndType;
  count: number;
  until: Date | null;
}

const FREQ_OPTIONS: { label: string; value: RruleFreq }[] = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const DAY_OPTIONS: { label: string; value: number; short: string }[] = [
  { label: 'Monday', value: 0, short: 'Mo' },
  { label: 'Tuesday', value: 1, short: 'Tu' },
  { label: 'Wednesday', value: 2, short: 'We' },
  { label: 'Thursday', value: 3, short: 'Th' },
  { label: 'Friday', value: 4, short: 'Fr' },
  { label: 'Saturday', value: 5, short: 'Sa' },
  { label: 'Sunday', value: 6, short: 'Su' },
];

const FREQ_LABEL: Record<RruleFreq, string> = {
  none: '',
  daily: 'day(s)',
  weekly: 'week(s)',
  monthly: 'month(s)',
  yearly: 'year(s)',
};

const FREQ_RRULE: Record<RruleFreq, number> = {
  none: -1,
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

const RRULE_FREQ: Record<number, RruleFreq> = {
  [RRule.DAILY]: 'daily',
  [RRule.WEEKLY]: 'weekly',
  [RRule.MONTHLY]: 'monthly',
  [RRule.YEARLY]: 'yearly',
};

const DEFAULT_STATE: RruleState = {
  freq: 'none',
  interval: 1,
  byweekday: [],
  endType: 'never',
  count: 10,
  until: null,
};

@Component({
  selector: 'app-planning-rrule-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    FormsModule,
    SelectModule,
    InputNumberModule,
    RadioButtonModule,
    DatePickerModule,
  ],
  template: `
    <!-- Frequency selector -->
    <p-select
      [(ngModel)]="state.freq"
      [options]="freqOptions"
      optionLabel="label"
      optionValue="value"
      [fluid]="true"
      (ngModelChange)="onFreqChange()"
    />

    @if (state.freq !== 'none') {
      <!-- Interval row -->
      <div class="flex items-center gap-2 mt-3">
        <span class="text-sm text-surface-600 whitespace-nowrap">Every</span>
        <p-inputnumber
          [(ngModel)]="state.interval"
          [min]="1"
          [max]="99"
          [showButtons]="false"
          inputStyleClass="w-16 text-center"
          (ngModelChange)="emit()"
        />
        <span class="text-sm text-surface-600 whitespace-nowrap">{{
          freqLabel
        }}</span>
      </div>

      <!-- By-day (weekly only) -->
      @if (state.freq === 'weekly') {
        <div class="flex gap-1 mt-3 flex-wrap">
          @for (day of dayOptions; track day.value) {
            <button
              type="button"
              class="w-8 h-8 rounded-full text-xs font-medium transition-colors
                     border border-surface-300 cursor-pointer select-none
                     focus:outline-none focus:ring-2 focus:ring-primary"
              [class.bg-primary]="isDaySelected(day.value)"
              [class.text-white]="isDaySelected(day.value)"
              [class.text-surface-600]="!isDaySelected(day.value)"
              [class.bg-surface-0]="!isDaySelected(day.value)"
              (click)="toggleDay(day.value)"
            >
              {{ day.short }}
            </button>
          }
        </div>
      }

      <!-- End type -->
      <div class="flex flex-col gap-2 mt-3">
        <span class="text-sm font-medium text-surface-700">Ends</span>

        <div class="flex items-center gap-2">
          <p-radiobutton
            name="endType"
            value="never"
            [(ngModel)]="state.endType"
            inputId="rtNever"
            (ngModelChange)="emit()"
          />
          <label for="rtNever" class="text-sm text-surface-700 cursor-pointer"
            >Never</label
          >
        </div>

        <div class="flex items-center gap-2">
          <p-radiobutton
            name="endType"
            value="count"
            [(ngModel)]="state.endType"
            inputId="rtCount"
            (ngModelChange)="emit()"
          />
          <label for="rtCount" class="text-sm text-surface-700 cursor-pointer"
            >After</label
          >
          <p-inputnumber
            [(ngModel)]="state.count"
            [min]="1"
            [max]="999"
            [showButtons]="false"
            [disabled]="state.endType !== 'count'"
            inputStyleClass="w-16 text-center"
            (ngModelChange)="onCountChange()"
          />
          <span class="text-sm text-surface-600">occurrences</span>
        </div>

        <div class="flex items-center gap-2">
          <p-radiobutton
            name="endType"
            value="until"
            [(ngModel)]="state.endType"
            inputId="rtUntil"
            (ngModelChange)="emit()"
          />
          <label for="rtUntil" class="text-sm text-surface-700 cursor-pointer"
            >On date</label
          >
          <p-datepicker
            [(ngModel)]="state.until"
            [disabled]="state.endType !== 'until'"
            dateFormat="dd/mm/yy"
            [showButtonBar]="true"
            [showOnFocus]="false"
            appendTo="body"
            (ngModelChange)="onUntilChange()"
          />
        </div>
      </div>
    }
  `,
})
export class PlanningRruleBuilderComponent implements OnChanges {
  @Input() rrule = '';
  @Output() readonly rruleChange = new EventEmitter<string>();

  protected readonly freqOptions = FREQ_OPTIONS;
  protected readonly dayOptions = DAY_OPTIONS;

  protected state: RruleState = { ...DEFAULT_STATE };

  get freqLabel(): string {
    return FREQ_LABEL[this.state.freq];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rrule']) {
      this.state = this.#parse(this.rrule);
    }
  }

  protected onFreqChange(): void {
    // If switching to weekly with no days selected, pre-select Monday
    if (this.state.freq === 'weekly' && this.state.byweekday.length === 0) {
      this.state.byweekday = [0]; // Monday
    }
    this.emit();
  }

  protected isDaySelected(day: number): boolean {
    return this.state.byweekday.includes(day);
  }

  protected toggleDay(day: number): void {
    if (this.state.byweekday.includes(day)) {
      // Keep at least one day selected
      if (this.state.byweekday.length > 1) {
        this.state.byweekday = this.state.byweekday.filter((d) => d !== day);
      }
    } else {
      this.state.byweekday = [...this.state.byweekday, day].sort(
        (a, b) => a - b,
      );
    }
    this.emit();
  }

  protected onCountChange(): void {
    this.state.endType = 'count';
    this.emit();
  }

  protected onUntilChange(): void {
    this.state.endType = 'until';
    this.emit();
  }

  protected emit(): void {
    this.rruleChange.emit(this.#build(this.state));
  }

  #parse(rruleStr: string): RruleState {
    if (!rruleStr?.trim()) return { ...DEFAULT_STATE };
    try {
      const r = RRule.fromString(rruleStr);
      const opts = r.origOptions;
      const freq = RRULE_FREQ[opts.freq as number] ?? 'none';
      const byweekday = opts.byweekday
        ? (opts.byweekday as { weekday: number }[]).map((w) => w.weekday)
        : [];
      let endType: RruleEndType = 'never';
      let count = DEFAULT_STATE.count;
      let until: Date | null = null;
      if (opts.count != null) {
        endType = 'count';
        count = opts.count;
      } else if (opts.until != null) {
        endType = 'until';
        until =
          opts.until instanceof Date
            ? opts.until
            : new Date(opts.until as string);
      }
      return {
        freq,
        interval: opts.interval ?? 1,
        byweekday,
        endType,
        count,
        until,
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  #build(state: RruleState): string {
    if (state.freq === 'none') return '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: Record<string, any> = {
      freq: FREQ_RRULE[state.freq],
      interval: state.interval,
    };
    if (state.freq === 'weekly' && state.byweekday.length > 0) {
      opts['byweekday'] = state.byweekday;
    }
    if (state.endType === 'count') {
      opts['count'] = state.count;
    } else if (state.endType === 'until' && state.until) {
      opts['until'] = state.until;
    }
    return new RRule(opts).toString().replace(/^RRULE:/, '');
  }
}
