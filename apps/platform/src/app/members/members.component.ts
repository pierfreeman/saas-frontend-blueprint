import { Component, inject, OnInit, signal } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import {
  MembershipsApi,
  MembershipSummary,
} from '@org/memberships/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

const ROLE_SEVERITY: Record<string, 'success' | 'info' | 'secondary' | 'warn'> =
  {
    OWNER: 'warn',
    ADMIN: 'info',
    MEMBER: 'success',
    READ_ONLY: 'secondary',
  };

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CardModule, TagModule, SkeletonModule, AvatarModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 m-0">Members</h1>
          <p class="text-surface-500 mt-1 mb-0 text-sm">
            People with access to this organization.
          </p>
        </div>
      </div>

      <p-card>
        @if (loading()) {
          <div class="flex flex-col gap-3">
            @for (_ of skeletonRows; track $index) {
              <div class="flex items-center gap-3">
                <p-skeleton shape="circle" size="2.25rem" />
                <div class="flex flex-col gap-1 flex-1">
                  <p-skeleton width="40%" height="0.875rem" />
                  <p-skeleton width="25%" height="0.75rem" />
                </div>
                <p-skeleton
                  width="4rem"
                  height="1.5rem"
                  borderRadius="9999px"
                />
              </div>
            }
          </div>
        } @else if (error()) {
          <p class="text-red-500 text-sm m-0">
            Failed to load members. Please try again.
          </p>
        } @else if (members().length === 0) {
          <p class="text-surface-500 text-sm m-0">No members found.</p>
        } @else {
          <ul
            class="flex flex-col divide-y divide-surface-100 m-0 p-0 list-none"
          >
            @for (m of members(); track m.id) {
              <li class="flex items-center gap-3 py-3">
                <p-avatar
                  [label]="avatarLabel(m)"
                  shape="circle"
                  styleClass="shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-surface-900 m-0 truncate">
                    {{ m.userId }}
                  </p>
                  <p class="text-xs text-surface-400 m-0">
                    {{ m.status ?? 'ACTIVE' }}
                  </p>
                </div>
                <p-tag
                  [value]="m.role ?? '—'"
                  [severity]="roleSeverity(m.role)"
                />
              </li>
            }
          </ul>
        }
      </p-card>
    </div>
  `,
})
export class MembersComponent implements OnInit {
  readonly #api = inject(MembershipsApi);
  readonly #orgsStore = inject(OrganizationsStore);

  readonly members = signal<MembershipSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly skeletonRows = new Array(4);

  ngOnInit(): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) {
      this.loading.set(false);
      return;
    }
    this.#api.getMemberships(orgId).subscribe({
      next: (list) => {
        this.members.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  avatarLabel(m: MembershipSummary): string {
    return (m.userId ?? '?').charAt(0).toUpperCase();
  }

  roleSeverity(role?: string): 'success' | 'info' | 'secondary' | 'warn' {
    return ROLE_SEVERITY[role ?? ''] ?? 'secondary';
  }
}
