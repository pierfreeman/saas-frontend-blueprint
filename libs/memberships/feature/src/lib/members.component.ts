import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  MembershipsStore,
  MembershipSummary,
  MembershipRole,
} from '@saas-frontend/memberships/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import {
  PermissionsService,
  PERMISSIONS,
} from '@saas-frontend/shared/util-rbac';

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn' | 'danger';

const ROLE_SEVERITY: Record<string, TagSeverity> = {
  OWNER: 'warn',
  ADMIN: 'info',
  MEMBER: 'success',
  READ_ONLY: 'secondary',
};

const STATUS_SEVERITY: Record<string, TagSeverity> = {
  INVITED: 'warn',
  SUSPENDED: 'danger',
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
    TitleCasePipe,
    FormsModule,
    RouterLink,
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
        <div class="flex items-center gap-2">
          <p-button
            label="Export CSV"
            icon="pi pi-download"
            size="small"
            severity="secondary"
            [disabled]="members().length === 0 || loading()"
            (onClick)="downloadCsv()"
          />
          @if (canInviteByPermission()) {
            <div class="flex flex-col items-end gap-1">
              <p-button
                label="Invite member"
                icon="pi pi-user-plus"
                [disabled]="atSeatLimit()"
                (onClick)="openInviteDialog()"
              />
              @if (atSeatLimit()) {
                <p class="text-xs text-orange-600 m-0">
                  Seat limit reached ({{ members().length }}/{{ maxSeats() }}).
                  <a routerLink="/billing" class="underline text-orange-600"
                    >Upgrade</a
                  >
                  to add more.
                </p>
              }
            </div>
          }
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
        } @else if (error() && members().length === 0) {
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
                @if (m.user?.pictureUrl) {
                  <p-avatar
                    [image]="m.user!.pictureUrl!"
                    shape="circle"
                    styleClass="shrink-0"
                  />
                } @else {
                  <p-avatar
                    [label]="avatarLabel(m)"
                    shape="circle"
                    styleClass="shrink-0"
                  />
                }

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-surface-900 m-0 truncate">
                    {{ displayName(m) }}
                  </p>
                  <p class="text-xs text-surface-400 m-0 truncate">
                    {{ displayEmail(m) }}
                  </p>
                </div>

                @if (m.status && m.status !== 'ACTIVE') {
                  <p-tag
                    [value]="m.status | titlecase"
                    [severity]="statusSeverity(m.status)"
                    [icon]="
                      m.status === 'INVITED' ? 'pi pi-envelope' : 'pi pi-ban'
                    "
                  />
                }

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
  readonly #store = inject(MembershipsStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #ent = inject(EntitlementsStore);
  readonly #permissions = inject(PermissionsService);
  readonly #confirm = inject(ConfirmationService);
  readonly #toast = inject(MessageService);

  // ── Store-backed state ────────────────────────────────────────────────────
  readonly members = this.#store.memberships;
  readonly loading = this.#store.loadingList;
  readonly saving = this.#store.loadingMutation;
  readonly error = computed(() => this.#store.error() !== null);

  // ── RBAC computed signals ─────────────────────────────────────────────────
  readonly maxSeats = this.#ent.maxSeats;

  readonly canInviteByPermission = computed(() =>
    this.#permissions
      .currentUserPermissions()
      .has(PERMISSIONS.ORG_MEMBERS_INVITE),
  );

  readonly atSeatLimit = computed(
    () => this.members().length >= this.#ent.maxSeats(),
  );

  readonly canInvite = computed(
    () => this.canInviteByPermission() && !this.atSeatLimit(),
  );

  readonly canEditRoles = computed(() =>
    this.#permissions
      .currentUserPermissions()
      .has(PERMISSIONS.ORG_MEMBERS_ROLE_UPDATE),
  );
  readonly canRemoveMembers = computed(() =>
    this.#permissions
      .currentUserPermissions()
      .has(PERMISSIONS.ORG_MEMBERS_REMOVE),
  );

  // ── UI state ──────────────────────────────────────────────────────────────
  readonly inviteError = signal<string | null>(null);

  readonly roleOptions = ROLE_OPTIONS;
  readonly skeletonRows = new Array(4);

  inviteVisible = false;
  inviteEmail = '';
  inviteRole: MembershipRole = 'MEMBER';

  ngOnInit(): void {
    this.#loadMembers();
    this.#loadEntitlements();
  }

  avatarLabel(m: MembershipSummary): string {
    const name = this.displayName(m);
    return name.charAt(0).toUpperCase();
  }

  displayName(m: MembershipSummary): string {
    const { firstName, lastName, email } = m.user ?? {};
    if (firstName || lastName)
      return [firstName, lastName].filter(Boolean).join(' ');
    if (email) return email.split('@')[0];
    return m.userId ?? '—';
  }

  displayEmail(m: MembershipSummary): string {
    return m.user?.email ?? '';
  }

  roleSeverity(role?: string): TagSeverity {
    return ROLE_SEVERITY[role ?? ''] ?? 'secondary';
  }

  statusSeverity(status?: string): TagSeverity {
    return STATUS_SEVERITY[status ?? ''] ?? 'secondary';
  }

  canEditRole(m: MembershipSummary): boolean {
    return this.canEditRoles() && m.role !== 'OWNER';
  }

  canRemove(m: MembershipSummary): boolean {
    return this.canRemoveMembers() && m.role !== 'OWNER';
  }

  openInviteDialog(): void {
    this.inviteEmail = '';
    this.inviteRole = 'MEMBER';
    this.inviteError.set(null);
    this.inviteVisible = true;
  }

  async submitInvite(): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId || !this.inviteEmail.trim()) return;

    this.inviteError.set(null);
    const result = await this.#store.inviteMember(orgId, {
      email: this.inviteEmail.trim(),
      role: this.inviteRole,
    });

    if (result === null) {
      const err = this.#store.error();
      this.inviteError.set(err?.message ?? 'Failed to send invitation.');
    } else {
      this.inviteVisible = false;
      this.#toast.add({
        severity: 'success',
        summary: 'Invited',
        detail: `Invitation sent to ${this.inviteEmail.trim()}.`,
        life: 3000,
      });
    }
  }

  async changeRole(
    m: MembershipSummary,
    newRole: MembershipRole,
  ): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId || !m.id) return;

    await this.#store.updateMemberRole(orgId, m.id, newRole);

    if (this.#store.error()) {
      this.#toast.add({
        severity: 'error',
        summary: 'Error',
        detail: this.#store.error()?.message ?? 'Failed to update role.',
        life: 4000,
      });
    } else {
      this.#toast.add({
        severity: 'success',
        summary: 'Role updated',
        life: 3000,
      });
    }
  }

  confirmRemove(m: MembershipSummary): void {
    this.#confirm.confirm({
      message: `Remove ${m.user?.email ?? m.userId} from this organization?`,
      header: 'Confirm removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.#doRemove(m),
    });
  }

  async #doRemove(m: MembershipSummary): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId || !m.id) return;

    await this.#store.removeMember(orgId, m.id);

    if (this.#store.error()) {
      this.#toast.add({
        severity: 'error',
        summary: 'Error',
        detail: this.#store.error()?.message ?? 'Failed to remove member.',
        life: 4000,
      });
    } else {
      this.#toast.add({
        severity: 'success',
        summary: 'Removed',
        detail: 'Member removed.',
        life: 3000,
      });
    }
  }

  #loadMembers(): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;
    this.#store.loadMemberships(orgId);
  }

  #loadEntitlements(): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;
    this.#ent.loadEntitlements(orgId);
  }

  downloadCsv(): void {
    if (this.members().length === 0) return;
    const csv = this.#buildCsv(this.members());
    const orgId = this.#orgsStore.activeOrgId() ?? 'org';
    const date = new Date().toISOString().slice(0, 10);
    this.#triggerDownload(csv, `members-${orgId}-${date}.csv`);
  }

  #buildCsv(rows: MembershipSummary[]): string {
    const esc = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = [
      'id',
      'user_id',
      'email',
      'first_name',
      'last_name',
      'role',
      'status',
    ].join(',');
    const lines = rows.map((m) =>
      [
        m.id ?? '',
        m.userId ?? '',
        m.user?.email ?? '',
        m.user?.firstName ?? '',
        m.user?.lastName ?? '',
        m.role ?? '',
        m.status ?? '',
      ]
        .map(esc)
        .join(','),
    );
    return [header, ...lines].join('\r\n');
  }

  #triggerDownload(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
