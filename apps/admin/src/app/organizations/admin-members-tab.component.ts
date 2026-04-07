import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  Input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  AdminApi,
  AdminMemberItem,
  MembershipRole,
} from '@saas-frontend/admin/data-access';

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn';

const ROLE_SEVERITY: Record<MembershipRole, TagSeverity> = {
  OWNER: 'warn',
  ADMIN: 'info',
  MEMBER: 'success',
  READ_ONLY: 'secondary',
};

const STATUS_SEVERITY: Record<string, TagSeverity> = {
  ACTIVE: 'success',
  INVITED: 'info',
  SUSPENDED: 'warn',
};

const ROLE_OPTIONS: { label: string; value: MembershipRole }[] = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' },
  { label: 'Read only', value: 'READ_ONLY' },
];

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-members-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    CardModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    AvatarModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
    PaginatorModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="flex flex-col gap-4 pt-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between">
        <span class="text-surface-500 text-sm"> {{ total() }} members </span>
        <p-button
          label="Invite member"
          icon="pi pi-user-plus"
          size="small"
          (onClick)="inviteDialog = true"
        />
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex flex-col gap-2">
          @for (_ of skeletons; track $index) {
            <div
              class="flex items-center gap-3 p-3 border border-surface-200 rounded-lg"
            >
              <p-skeleton shape="circle" size="2.5rem" />
              <div class="flex-1">
                <p-skeleton width="10rem" height="1rem" />
                <p-skeleton width="7rem" height="0.8rem" styleClass="mt-1" />
              </div>
              <p-skeleton width="4rem" height="1.5rem" borderRadius="1rem" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && members().length === 0) {
        <div class="flex flex-col items-center py-8 text-surface-500">
          <span class="pi pi-users text-4xl mb-3 opacity-30"></span>
          <p>No members found.</p>
        </div>
      }

      <!-- Member list -->
      @if (!loading() && members().length > 0) {
        <div class="flex flex-col gap-2">
          @for (member of members(); track member.id) {
            <div
              class="flex flex-wrap items-center gap-3 p-3 border border-surface-200 rounded-lg bg-surface-0"
            >
              <!-- Avatar -->
              <p-avatar
                [label]="memberInitials(member)"
                [image]="member.user.pictureUrl ?? undefined"
                shape="circle"
                size="normal"
              />

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-surface-900 m-0 truncate">
                  {{ member.user.firstName ?? '' }}
                  {{ member.user.lastName ?? '' }}
                </p>
                <p class="text-xs text-surface-400 m-0 truncate">
                  {{ member.user.email }}
                </p>
              </div>

              <!-- Tags -->
              <div class="flex items-center gap-2">
                <p-tag
                  [value]="member.role"
                  [severity]="roleSeverity(member.role)"
                  [rounded]="true"
                />
                <p-tag
                  [value]="member.status"
                  [severity]="statusSeverity(member.status)"
                  [rounded]="true"
                />
              </div>

              <!-- Date -->
              <span class="text-xs text-surface-400 whitespace-nowrap">
                {{ member.createdAt | date: 'mediumDate' }}
              </span>

              <!-- Actions -->
              <div class="flex items-center gap-1">
                <p-button
                  icon="pi pi-pencil"
                  [text]="true"
                  size="small"
                  severity="secondary"
                  pTooltip="Change role"
                  (onClick)="openChangeRole(member)"
                />
                <p-button
                  icon="pi pi-trash"
                  [text]="true"
                  size="small"
                  severity="danger"
                  pTooltip="Remove member"
                  (onClick)="confirmRemove(member)"
                />
              </div>
            </div>
          }
        </div>

        @if (total() > PAGE_SIZE) {
          <p-paginator
            [rows]="PAGE_SIZE"
            [totalRecords]="total()"
            [first]="offset()"
            (onPageChange)="onPageChange($event)"
          />
        }
      }
    </div>

    <!-- Invite dialog -->
    <p-dialog
      header="Invite member"
      [(visible)]="inviteDialog"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="invite-email" class="text-sm font-medium">Email</label>
          <input
            pInputText
            id="invite-email"
            type="email"
            placeholder="user@example.com"
            [(ngModel)]="inviteEmail"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="invite-role" class="text-sm font-medium">Role</label>
          <p-select
            inputId="invite-role"
            [options]="roleOptions"
            [(ngModel)]="inviteRole"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          [text]="true"
          severity="secondary"
          (onClick)="inviteDialog = false"
        />
        <p-button
          label="Invite"
          icon="pi pi-send"
          [loading]="mutating()"
          [disabled]="!inviteEmail"
          (onClick)="submitInvite()"
        />
      </ng-template>
    </p-dialog>

    <!-- Change role dialog -->
    <p-dialog
      header="Change role"
      [(visible)]="changeRoleDialog"
      [modal]="true"
      [style]="{ width: '22rem' }"
    >
      <div class="flex flex-col gap-1 pt-2">
        <label for="change-role" class="text-sm font-medium">New role</label>
        <p-select
          inputId="change-role"
          [options]="roleOptions"
          [(ngModel)]="selectedRole"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          [text]="true"
          severity="secondary"
          (onClick)="changeRoleDialog = false"
        />
        <p-button
          label="Save"
          [loading]="mutating()"
          (onClick)="submitChangeRole()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class AdminMembersTabComponent implements OnInit {
  @Input({ required: true }) orgId!: string;

  readonly #api = inject(AdminApi);
  readonly #messageService = inject(MessageService);
  readonly #confirmationService = inject(ConfirmationService);

  readonly PAGE_SIZE = PAGE_SIZE;
  readonly roleOptions = ROLE_OPTIONS;
  readonly skeletons = new Array(5);

  readonly members = signal<AdminMemberItem[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);
  readonly mutating = signal(false);

  inviteDialog = false;
  inviteEmail = '';
  inviteRole: MembershipRole = 'MEMBER';

  changeRoleDialog = false;
  selectedMemberId: string | null = null;
  selectedRole: MembershipRole = 'MEMBER';

  readonly roleSeverity = (role: MembershipRole): TagSeverity =>
    ROLE_SEVERITY[role] ?? 'secondary';

  readonly statusSeverity = (status: string): TagSeverity =>
    (STATUS_SEVERITY[status] ?? 'secondary') as TagSeverity;

  readonly memberInitials = (m: AdminMemberItem): string => {
    const first = m.user.firstName?.[0] ?? '';
    const last = m.user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || m.user.email[0].toUpperCase();
  };

  ngOnInit(): void {
    this.load();
  }

  onPageChange(event: PaginatorState): void {
    this.offset.set(event.first ?? 0);
    this.load();
  }

  openChangeRole(member: AdminMemberItem): void {
    this.selectedMemberId = member.id;
    this.selectedRole = member.role;
    this.changeRoleDialog = true;
  }

  confirmRemove(member: AdminMemberItem): void {
    this.#confirmationService.confirm({
      message: `Remove ${member.user.email} from this organization?`,
      header: 'Remove member',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.submitRemove(member.id),
    });
  }

  submitInvite(): void {
    this.mutating.set(true);
    this.#api
      .inviteMember(this.orgId, this.inviteEmail, this.inviteRole)
      .subscribe({
        next: () => {
          this.inviteDialog = false;
          this.inviteEmail = '';
          this.mutating.set(false);
          this.#messageService.add({
            severity: 'success',
            summary: 'Invitation sent',
          });
          this.load();
        },
        error: () => {
          this.mutating.set(false);
          this.#messageService.add({
            severity: 'error',
            summary: 'Failed to invite member',
          });
        },
      });
  }

  submitChangeRole(): void {
    if (!this.selectedMemberId) return;
    this.mutating.set(true);
    this.#api
      .changeRole(this.orgId, this.selectedMemberId, this.selectedRole)
      .subscribe({
        next: () => {
          this.changeRoleDialog = false;
          this.mutating.set(false);
          this.#messageService.add({
            severity: 'success',
            summary: 'Role updated',
          });
          this.load();
        },
        error: () => {
          this.mutating.set(false);
          this.#messageService.add({
            severity: 'error',
            summary: 'Failed to update role',
          });
        },
      });
  }

  submitRemove(memberId: string): void {
    this.#api.removeMember(this.orgId, memberId).subscribe({
      next: () => {
        this.#messageService.add({
          severity: 'success',
          summary: 'Member removed',
        });
        this.load();
      },
      error: () => {
        this.#messageService.add({
          severity: 'error',
          summary: 'Failed to remove member',
        });
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.#api
      .listMembers(this.orgId, { limit: PAGE_SIZE, offset: this.offset() })
      .subscribe({
        next: (result) => {
          this.members.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
