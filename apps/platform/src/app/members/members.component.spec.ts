import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import {
  MembershipsStore,
  MembershipSummary,
} from '@saas-frontend/memberships/data-access';
import { MembersComponent } from '@saas-frontend/memberships/feature';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import {
  PERMISSIONS,
  PermissionsService,
} from '@saas-frontend/shared/util-rbac';
import { ConfirmationService, MessageService } from 'primeng/api';
import { describe, expect, it, vi } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMember(
  overrides: Partial<MembershipSummary> = {},
): MembershipSummary {
  return {
    id: 'm1',
    orgId: 'org-1',
    userId: 'user@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    ...overrides,
  };
}

function setup(opts: {
  members?: MembershipSummary[];
  maxSeats?: number;
  permissions?: Set<string>;
  loadingList?: boolean;
}) {
  const {
    members = [],
    maxSeats = 10,
    permissions = new Set<string>([
      PERMISSIONS.ORG_MEMBERS_INVITE,
      PERMISSIONS.ORG_MEMBERS_REMOVE,
      PERMISSIONS.ORG_MEMBERS_ROLE_UPDATE,
    ]),
    loadingList = false,
  } = opts;

  const memberships = signal<MembershipSummary[]>(members);
  const loadingListSig = signal(loadingList);

  const mockStore = {
    memberships,
    loadingList: loadingListSig,
    loadingMutation: signal(false),
    error: signal(null),
    loadMemberships: vi.fn(() => Promise.resolve()),
    inviteMember: vi.fn(() => Promise.resolve({ message: 'Invited' })),
    updateMemberRole: vi.fn(() => Promise.resolve()),
    removeMember: vi.fn(() => Promise.resolve()),
  } as unknown as MembershipsStore;

  const mockOrgs = {
    activeOrgId: signal<string | null>('org-1'),
  } as unknown as OrganizationsStore;

  const mockEnt = {
    maxSeats: signal(maxSeats),
  } as unknown as EntitlementsStore;

  const mockPermissions = {
    currentUserPermissions: signal(permissions),
  } as unknown as PermissionsService;

  TestBed.configureTestingModule({
    imports: [MembersComponent],
    providers: [
      provideRouter([]),
      { provide: MembershipsStore, useValue: mockStore },
      { provide: OrganizationsStore, useValue: mockOrgs },
      { provide: EntitlementsStore, useValue: mockEnt },
      { provide: PermissionsService, useValue: mockPermissions },
      ConfirmationService,
      MessageService,
    ],
  });

  const fixture = TestBed.createComponent(MembersComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, mockStore, memberships, loadingListSig };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('MembersComponent', () => {
  describe('canInvite and seat limit', () => {
    it('canInvite is true when below seat limit and has permission', () => {
      const { component } = setup({ members: [makeMember()], maxSeats: 10 });
      expect(component.canInvite()).toBe(true);
    });

    it('canInvite is false when at seat limit', () => {
      const members = Array.from({ length: 3 }, (_, i) =>
        makeMember({ id: `m${i}`, userId: `u${i}@x.com` }),
      );
      const { component } = setup({ members, maxSeats: 3 });
      expect(component.canInvite()).toBe(false);
    });

    it('atSeatLimit is true when count equals maxSeats', () => {
      const members = [
        makeMember(),
        makeMember({ id: 'm2', userId: 'u2@x.com' }),
      ];
      const { component } = setup({ members, maxSeats: 2 });
      expect(component.atSeatLimit()).toBe(true);
    });

    it('atSeatLimit is false below limit', () => {
      const { component } = setup({ members: [makeMember()], maxSeats: 5 });
      expect(component.atSeatLimit()).toBe(false);
    });

    it('canInvite is false when permission missing even below limit', () => {
      const { component } = setup({
        members: [],
        maxSeats: 10,
        permissions: new Set(),
      });
      expect(component.canInvite()).toBe(false);
      expect(component.canInviteByPermission()).toBe(false);
    });

    it('canInviteByPermission is true but canInvite is false at limit', () => {
      const members = [makeMember()];
      const { component } = setup({ members, maxSeats: 1 });
      expect(component.canInviteByPermission()).toBe(true);
      expect(component.canInvite()).toBe(false);
    });
  });

  describe('initialisation', () => {
    it('calls loadMemberships with the active org id on init', () => {
      const { mockStore } = setup({});
      expect(mockStore.loadMemberships).toHaveBeenCalledWith('org-1');
    });

    it('does not call loadMemberships without an org id', () => {
      const mockStore = {
        memberships: signal<MembershipSummary[]>([]),
        loadingList: signal(false),
        loadingMutation: signal(false),
        error: signal(null),
        loadMemberships: vi.fn(() => Promise.resolve()),
        inviteMember: vi.fn(() => Promise.resolve({ message: 'ok' })),
        updateMemberRole: vi.fn(() => Promise.resolve()),
        removeMember: vi.fn(() => Promise.resolve()),
      } as unknown as MembershipsStore;

      TestBed.configureTestingModule({
        imports: [MembersComponent],
        providers: [
          provideRouter([]),
          { provide: MembershipsStore, useValue: mockStore },
          {
            provide: OrganizationsStore,
            useValue: { activeOrgId: signal<string | null>(null) },
          },
          {
            provide: EntitlementsStore,
            useValue: { maxSeats: signal(10) },
          },
          {
            provide: PermissionsService,
            useValue: { currentUserPermissions: signal(new Set<string>()) },
          },
          ConfirmationService,
          MessageService,
        ],
      });

      const fixture = TestBed.createComponent(MembersComponent);
      fixture.detectChanges();
      expect(mockStore.loadMemberships).not.toHaveBeenCalled();
    });
  });

  describe('invite flow', () => {
    it('openInviteDialog resets form state', () => {
      const { component } = setup({});
      component.inviteEmail = 'old@x.com';
      component.openInviteDialog();
      expect(component.inviteEmail).toBe('');
      expect(component.inviteError()).toBeNull();
      expect(component.inviteVisible).toBe(true);
    });

    it('submitInvite calls inviteMember and closes dialog on success', async () => {
      const { component, mockStore } = setup({});
      component.inviteVisible = true;
      component.inviteEmail = 'new@x.com';
      await component.submitInvite();
      expect(mockStore.inviteMember).toHaveBeenCalledWith('org-1', {
        email: 'new@x.com',
        role: 'MEMBER',
      });
      expect(component.inviteVisible).toBe(false);
    });

    it('submitInvite sets inviteError on failure', async () => {
      const mockStore = {
        memberships: signal<MembershipSummary[]>([]),
        loadingList: signal(false),
        loadingMutation: signal(false),
        error: signal<{ message: string } | null>({
          message: 'Seat limit exceeded',
        }),
        loadMemberships: vi.fn(() => Promise.resolve()),
        inviteMember: vi.fn(() => Promise.resolve(null)),
        updateMemberRole: vi.fn(() => Promise.resolve()),
        removeMember: vi.fn(() => Promise.resolve()),
      } as unknown as MembershipsStore;

      TestBed.configureTestingModule({
        imports: [MembersComponent],
        providers: [
          provideRouter([]),
          { provide: MembershipsStore, useValue: mockStore },
          {
            provide: OrganizationsStore,
            useValue: { activeOrgId: signal('org-1') },
          },
          {
            provide: EntitlementsStore,
            useValue: { maxSeats: signal(10) },
          },
          {
            provide: PermissionsService,
            useValue: {
              currentUserPermissions: signal(
                new Set<string>([PERMISSIONS.ORG_MEMBERS_INVITE]),
              ),
            },
          },
          ConfirmationService,
          MessageService,
        ],
      });

      const fixture = TestBed.createComponent(MembersComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.inviteEmail = 'fail@x.com';
      await component.submitInvite();
      expect(component.inviteError()).toBe('Seat limit exceeded');
    });
  });

  describe('RBAC helpers', () => {
    it('canEditRole returns false for OWNER members', () => {
      const { component } = setup({});
      const owner = makeMember({ role: 'OWNER' });
      expect(component.canEditRole(owner)).toBe(false);
    });

    it('canEditRole returns true for non-owner members when permission present', () => {
      const { component } = setup({});
      const member = makeMember({ role: 'MEMBER' });
      expect(component.canEditRole(member)).toBe(true);
    });

    it('canRemove returns false for OWNER members', () => {
      const { component } = setup({});
      const owner = makeMember({ role: 'OWNER' });
      expect(component.canRemove(owner)).toBe(false);
    });

    it('canRemove returns true for non-owner members when permission present', () => {
      const { component } = setup({});
      const member = makeMember({ role: 'MEMBER' });
      expect(component.canRemove(member)).toBe(true);
    });
  });

  describe('role and avatar helpers', () => {
    it('avatarLabel returns uppercased first char of displayName', () => {
      const { component } = setup({});
      const m = makeMember({ userId: 'alice@x.com' });
      expect(component.avatarLabel(m)).toBe('A');
    });

    it('avatarLabel returns em-dash first char when userId is undefined', () => {
      const { component } = setup({});
      expect(
        component.avatarLabel({ ...makeMember(), userId: undefined as any }),
      ).toBe('—');
    });

    it('roleSeverity maps known roles', () => {
      const { component } = setup({});
      expect(component.roleSeverity('OWNER')).toBe('warn');
      expect(component.roleSeverity('ADMIN')).toBe('info');
      expect(component.roleSeverity('MEMBER')).toBe('success');
    });

    it('roleSeverity defaults to secondary for unknown role', () => {
      const { component } = setup({});
      expect(component.roleSeverity('UNKNOWN')).toBe('secondary');
    });
  });

  describe('displayName', () => {
    it('returns firstName + lastName when both are present', () => {
      const { component } = setup({});
      const m = makeMember({
        user: {
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
        },
      });
      expect(component.displayName(m)).toBe('Alice Smith');
    });

    it('returns only firstName when lastName is absent', () => {
      const { component } = setup({});
      const m = makeMember({
        user: { firstName: 'Alice', email: 'alice@example.com' },
      });
      expect(component.displayName(m)).toBe('Alice');
    });

    it('falls back to the local part of user email when no name', () => {
      const { component } = setup({});
      const m = makeMember({ user: { email: 'bob@example.com' } });
      expect(component.displayName(m)).toBe('bob');
    });

    it('falls back to userId when no user data at all', () => {
      const { component } = setup({});
      const m = makeMember({ userId: 'user-uuid-123' });
      expect(component.displayName(m)).toBe('user-uuid-123');
    });

    it('returns em-dash when user is absent and userId is undefined', () => {
      const { component } = setup({});
      const m = { ...makeMember(), userId: undefined as any };
      expect(component.displayName(m)).toBe('—');
    });
  });

  describe('displayEmail', () => {
    it('returns user email when present', () => {
      const { component } = setup({});
      const m = makeMember({ user: { email: 'carol@example.com' } });
      expect(component.displayEmail(m)).toBe('carol@example.com');
    });

    it('returns empty string when user has no email', () => {
      const { component } = setup({});
      const m = makeMember({ user: { firstName: 'Dave' } });
      expect(component.displayEmail(m)).toBe('');
    });

    it('returns empty string when user is absent', () => {
      const { component } = setup({});
      expect(component.displayEmail(makeMember())).toBe('');
    });
  });

  describe('avatarLabel with user data', () => {
    it('uses first char of firstName when present', () => {
      const { component } = setup({});
      const m = makeMember({ user: { firstName: 'Eve', email: 'e@x.com' } });
      expect(component.avatarLabel(m)).toBe('E');
    });

    it('uses first char of email local part when no name', () => {
      const { component } = setup({});
      const m = makeMember({ user: { email: 'frank@x.com' } });
      expect(component.avatarLabel(m)).toBe('F');
    });
  });
});
