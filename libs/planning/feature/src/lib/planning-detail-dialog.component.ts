import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import {
  type EventDetail,
  type EventOccurrence,
  type RSVPStatus,
} from '@saas-frontend/planning/data-access';

@Component({
  selector: 'app-planning-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ButtonModule, DialogModule, SkeletonModule, TagModule],
  template: `
    <p-dialog
      header="Event details"
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: '40rem' }"
      [draggable]="false"
    >
      @if (loadingDetail) {
        <div class="flex flex-col gap-2 pt-2">
          <p-skeleton height="1.5rem" styleClass="w-3/4" />
          <p-skeleton height="1rem" styleClass="w-1/2" />
          <p-skeleton height="1rem" styleClass="w-2/3" />
        </div>
      } @else if (event) {
        <div class="flex flex-col gap-4 pt-2">
          <!-- Title + tags -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xl font-semibold text-surface-900">{{
              event.title
            }}</span>
            @if (event.rrule) {
              <p-tag value="Recurring" severity="info" />
            }
          </div>

          <!-- Date/time -->
          <div class="flex flex-col gap-1 text-sm text-surface-700">
            <div class="flex items-center gap-1">
              <i class="pi pi-clock text-surface-400"></i>
              @if (occurrence?.isAllDay) {
                <span>{{ event.startUtc | date: 'mediumDate' }}</span>
              } @else {
                <span>
                  {{ event.startUtc | date: 'medium' }}
                  @if (event.endUtc) {
                    → {{ event.endUtc | date: 'shortTime' }}
                  }
                </span>
              }
            </div>
            @if (event.location) {
              <div class="flex items-center gap-1">
                <i class="pi pi-map-marker text-surface-400"></i>
                <span>{{ event.location }}</span>
              </div>
            }
            @if (event.description) {
              <div class="flex items-start gap-1">
                <i class="pi pi-align-left text-surface-400 mt-0.5"></i>
                <span>{{ event.description }}</span>
              </div>
            }
          </div>

          <!-- Attendees -->
          @if (event.attendees.length > 0) {
            <div class="flex flex-col gap-1">
              <p class="text-sm font-medium text-surface-700 m-0">
                Attendees ({{ event.attendees.length }})
              </p>
              <ul class="list-none p-0 m-0 flex flex-col gap-1">
                @for (att of event.attendees; track att.id) {
                  <li class="flex items-center justify-between text-sm">
                    <span class="text-surface-700">{{ att.userId }}</span>
                    <p-tag
                      [value]="att.status"
                      [severity]="rsvpSeverity(att.status)"
                    />
                  </li>
                }
              </ul>
            </div>
          }

          <!-- RSVP buttons -->
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-surface-700 m-0">Your RSVP</p>
            <div class="flex gap-2">
              <p-button
                label="Accept"
                severity="success"
                size="small"
                [loading]="saving"
                (onClick)="rsvp.emit('ACCEPTED')"
              />
              <p-button
                label="Tentative"
                severity="warn"
                size="small"
                [loading]="saving"
                (onClick)="rsvp.emit('TENTATIVE')"
              />
              <p-button
                label="Decline"
                severity="danger"
                size="small"
                [loading]="saving"
                (onClick)="rsvp.emit('DECLINED')"
              />
            </div>
          </div>

          <!-- Exceptions summary -->
          @if (event.exceptions.length > 0) {
            <div class="flex flex-col gap-1">
              <p class="text-sm font-medium text-surface-700 m-0">
                Overrides / Cancellations ({{ event.exceptions.length }})
              </p>
              <ul class="list-none p-0 m-0 flex flex-col gap-1">
                @for (exc of event.exceptions; track exc.id) {
                  <li class="flex items-center gap-2 text-sm text-surface-600">
                    <i
                      class="pi"
                      [class.pi-ban]="exc.isCancelled"
                      [class.pi-pencil]="!exc.isCancelled"
                    ></i>
                    <span>{{ exc.originalStartUtc | date: 'medium' }}</span>
                    @if (exc.isCancelled) {
                      <p-tag value="Cancelled" severity="danger" />
                    } @else {
                      <p-tag value="Override" severity="info" />
                    }
                  </li>
                }
              </ul>
            </div>
          }

          <!-- Management actions -->
          @if (canManage) {
            <div
              class="flex items-center justify-between border-t border-surface-200 pt-3"
            >
              <div class="flex gap-2">
                <p-button
                  label="Edit"
                  icon="pi pi-pencil"
                  severity="secondary"
                  size="small"
                  (onClick)="edit.emit(event)"
                />
                @if (occurrence?.isRecurring) {
                  <p-button
                    label="Override occurrence"
                    icon="pi pi-copy"
                    severity="secondary"
                    size="small"
                    (onClick)="openException.emit()"
                  />
                }
              </div>
              <p-button
                label="Delete"
                icon="pi pi-trash"
                severity="danger"
                size="small"
                [loading]="saving"
                (onClick)="deleted.emit(event)"
              />
            </div>
          }
        </div>
      }
    </p-dialog>
  `,
})
export class PlanningDetailDialogComponent {
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  @Input() event: EventDetail | null = null;
  @Input() occurrence: EventOccurrence | null = null;
  @Input() loadingDetail = false;
  @Input() saving = false;
  @Input() canManage = false;

  @Output() readonly edit = new EventEmitter<EventDetail>();
  @Output() readonly deleted = new EventEmitter<EventDetail>();
  @Output() readonly rsvp = new EventEmitter<RSVPStatus>();
  @Output() readonly openException = new EventEmitter<void>();

  protected rsvpSeverity(
    status: string,
  ): 'success' | 'warn' | 'danger' | 'secondary' {
    if (status === 'ACCEPTED') return 'success';
    if (status === 'TENTATIVE') return 'warn';
    if (status === 'DECLINED') return 'danger';
    return 'secondary';
  }
}
