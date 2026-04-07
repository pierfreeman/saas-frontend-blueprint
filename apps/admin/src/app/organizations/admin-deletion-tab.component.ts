import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AdminOrganizationDetail } from '@saas-frontend/admin/data-access';

type DeletionTagSeverity = 'warn' | 'danger' | 'secondary';

function deletionStatusSeverity(
  org: AdminOrganizationDetail,
): DeletionTagSeverity {
  if (org.status === 'DELETED') return 'danger';
  if (org.status === 'PENDING_DELETION') return 'warn';
  return 'secondary';
}

@Component({
  selector: 'app-admin-deletion-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, CardModule, TagModule],
  template: `
    <div class="mt-4">
      @if (!org.deletionRequestedAt) {
        <!-- Empty state -->
        <p-card>
          <div class="flex flex-col items-center gap-3 py-6">
            <span class="pi pi-check-circle text-4xl text-green-500"></span>
            <p class="text-surface-500 text-center m-0">
              No deletion requested for this organization.
            </p>
          </div>
        </p-card>
      } @else {
        <!-- Deletion info -->
        <p-card>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-surface-900 m-0">
              Deletion Request
            </h3>
            <p-tag
              [value]="org.status"
              [severity]="statusSeverity"
              [rounded]="true"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Requested at -->
            <div>
              <p
                class="text-xs text-surface-400 font-medium uppercase tracking-wider m-0 mb-1"
              >
                Requested at
              </p>
              <p class="text-surface-900 m-0">
                {{ org.deletionRequestedAt | date: 'medium' }}
              </p>
            </div>

            <!-- Scheduled at -->
            <div>
              <p
                class="text-xs text-surface-400 font-medium uppercase tracking-wider m-0 mb-1"
              >
                Scheduled for
              </p>
              <p class="text-surface-900 m-0">
                {{ org.deletionScheduledAt | date: 'medium' }}
              </p>
            </div>

            <!-- Completed at -->
            @if (org.deletionCompletedAt) {
              <div>
                <p
                  class="text-xs text-surface-400 font-medium uppercase tracking-wider m-0 mb-1"
                >
                  Completed at
                </p>
                <p class="text-surface-900 m-0">
                  {{ org.deletionCompletedAt | date: 'medium' }}
                </p>
              </div>
            }

            <!-- Retention period -->
            <div>
              <p
                class="text-xs text-surface-400 font-medium uppercase tracking-wider m-0 mb-1"
              >
                Retention period
              </p>
              <p class="text-surface-900 m-0">
                @if (org.retentionPeriodDays !== null) {
                  {{ org.retentionPeriodDays }} days (custom)
                } @else {
                  Default
                }
              </p>
            </div>
          </div>

          <p class="text-xs text-surface-400 mt-6 m-0">
            <span class="pi pi-info-circle mr-1"></span>
            Deletion is executed by the background worker. No manual action is
            available from this interface.
          </p>
        </p-card>
      }
    </div>
  `,
})
export class AdminDeletionTabComponent {
  @Input() org!: AdminOrganizationDetail;

  get statusSeverity(): DeletionTagSeverity {
    return deletionStatusSeverity(this.org);
  }
}
