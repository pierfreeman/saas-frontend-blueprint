import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  MembershipsApi,
  MembershipSummary,
  MembershipRole,
} from '@org/memberships/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn';

const ROLE_SEVERITY: Record<string, TagSeverity> = {
  OWNER: 'warn',
  ADMIN: 'info',
  MEMBER: 'success',
  READ_ONLY: 'secondary',
};

const ROLE_OPTIONS: { label: string; value: MembershipRole }[] = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' },
  { label: 'Read only', value: 'READ_ONLY' },
];

@Component({
  selector: 'app-members',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    CardModule,
    TagModule,
    SkeletonModule,
    AvatarModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 m-0">Members</h1>
          <p class="text-surface-500 mt-1 mb-0 text-sm">
            People with access to this organization.
          </p>
        </div>
        <p-button
          label="Invite member"
          icon="pi pi-user-plus"
          (onClick)="openInviteDialog()"
        />
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

                @if (canEditRole(m)) {
                  <p-select
                    [options]="roleOptions"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="m.role"
                    (ngModelChange)="changeRole(m, $event)"
                    [disabled]="saving()"
                    styleClass="text-sm"
                    appendTo="body"
                  />
                } @else {
                  <p-tag
                    [value]="m.role ?? '—'"
                    [severity]="roleSeverity(m.role)"
                  />
                }

                @if (canRemove(m)) {
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    size="small"
                    [disabled]="saving()"
                    (onClick)="confirmRemove(m)"
                    pTooltip="Remove member"
                    tooltipPosition="left"
                  />
                }
              </li>
            }
          </ul>
        }
      </p-card>
    </div>

    <p-dialog
      header="Invite member"
      [(visible)]="inviteVisible"
      [modal]="true"
      [style]="{ width: '28rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="inviteEmail"
            >Email</label
          >
          <input
            id="inviteEmail"
            pInputText
            type="email"
            [(ngModel)]="inviteEmail"
            placeholder="alice@example.com"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700" for="inviteRole"
            >Role</label
          >
          <p-select
            inputId="inviteRole"
            [options]="roleOptions"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="inviteRole"
            appendTo="body"
            class="w-full"
          />
        </div>
        @if (inviteError()) {
          <p class="text-red-500 text-sm m-0">{{ inviteError() }}</p>
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="inviteVisible = false"
        />
        <p-button
          label="Invite"
          icon="pi pi-send"
          [loading]="saving()"
          [disabled]="!inviteEmail.trim()"
          (onClick)="submitInvite()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class MembersComponent implements OnInit {
  readonly #api = inject(MembershipsApi);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #confirm = inject(ConfirmationService);
  readonly #toast = inject(MessageService);

  readonly members = signal<MembershipSummary[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly inviteError = signal<string | null>(null);

  readonly roleOptions = ROLE_OPTIONS;
  readonly skeletonRows = new Array(4);

  inviteVisible = false;
  inviteEmail = '';
  inviteRole: MembershipRole = 'MEMBER';

  ngOnInit(): void {
    this.#loadMembers();
  }

  avatarLabel(m: MembershipSummary): string {
    return (m.userId ?? '?').charAt(0).toUpperCase();
  }

  roleSeverity(role?: string): TagSeverity {
    return ROLE_SEVERITY[role ?? ''] ?? 'secondary';
  }

  canEditRole(m: MembershipSummary): boolean {
    return m.role !== 'OWNER';
  }

  canRemove(m: MembershipSummary): boolean {
    return m.role !== 'OWNER';
  }

  openInviteDialog(): void {
    this.inviteEmail = '';
    this.inviteRole = 'MEMBER';
    this.inviteError.set(null);
    this.inviteVisible = true;
  }

  submitInvite(): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId || !this.inviteEmail.trim()) return;

    this.saving.set(true);
    this.inviteError.set(null);

    this.#api
      .inviteMember(orgId, {
        email: this.inviteEmail.trim(),
        role: this.inviteRole,
      })
      .subscribe({
        next: () => {
          this.inviteVisible = false;
          this.saving.set(false);
          this.#toast.add({
            severity: 'success',
            summary: 'Invited',
            detail: `Invitation sent to ${this.inviteEmail.trim()}.`,
            life: 3000,
          });
          // Reload the members list to reflect any newly created membership
          this.#loadMembers();
        },
        error: (err) => {
          this.inviteError.set(
            err?.error?.message ?? 'Failed to send invitation.',
          );
          this.saving.set(false);
        },
      });
  }

  changeRole(m: MembershipSummary, newRole: MembershipRole): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId || !m.id) return;

    this.saving.set(true);
    this.#api.updateMembership(orgId, m.id, { role: newRole }).subscribe({
      next: (updated) => {
        this.members.update((list) =>
          list.map((item) =>
            item.id === m.id ? { ...item, role: updated.role } : item,
          ),
        );
        this.saving.set(false);
        this.#toast.add({
          severity: 'success',
          summary: 'Role updated',
          life: 3000,
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.#toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Failed to update role.',
          life: 4000,
        });
      },
    });
  }

  confirmRemove(m: MembershipSummary): void {
    this.#confirm.confirm({
      message: `Remove member ${m.userId} from this organization?`,
      header: 'Confirm removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.#doRemove(m),
    });
  }

  #doRemove(m: MembershipSummary): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId || !m.id) return;

    this.saving.set(true);
    this.#api.deleteMembership(orgId, m.id).subscribe({
      next: () => {
        this.members.update((list) => list.filter((item) => item.id !== m.id));
        this.saving.set(false);
        this.#toast.add({
          severity: 'success',
          summary: 'Removed',
          detail: 'Member removed.',
          life: 3000,
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.#toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Failed to remove member.',
          life: 4000,
        });
      },
    });
  }

  #loadMembers(): void {
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
}
