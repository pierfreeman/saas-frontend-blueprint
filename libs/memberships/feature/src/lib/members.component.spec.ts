import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import {
  MembershipsStore,
  MembershipSummary,
  MembershipRole,
} from '@saas-frontend/memberships/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import {
  PERMISSIONS,
  PermissionsService,
} from '@saas-frontend/shared/util-rbac';
import { ConfirmationService, MessageService } from 'primeng/api';
import { describe, expect, it, vi } from 'vitest';
import { MembersComponent } from './members.component';

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
    loadEntitlements: vi.fn(() => Promise.resolve()),
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

  return {
    fixture,
    component,
    mockStore,
    mockEnt,
    memberships,
    loadingListSig,
  };
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

    it('calls loadEntitlements with the active org id on init', () => {
      const { mockEnt } = setup({});
      expect(mockEnt.loadEntitlements).toHaveBeenCalledWith('org-1');
    });

    it('does not call loadMemberships or loadEntitlements without an org id', () => {
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

      const mockEnt = {
        maxSeats: signal(10),
        loadEntitlements: vi.fn(() => Promise.resolve()),
      } as unknown as EntitlementsStore;

      TestBed.configureTestingModule({
        imports: [MembersComponent],
        providers: [
          provideRouter([]),
          { provide: MembershipsStore, useValue: mockStore },
          {
            provide: OrganizationsStore,
            useValue: { activeOrgId: signal<string | null>(null) },
          },
          { provide: EntitlementsStore, useValue: mockEnt },
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
      expect(mockEnt.loadEntitlements).not.toHaveBeenCalled();
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
            useValue: {
              maxSeats: signal(10),
              loadEntitlements: vi.fn(() => Promise.resolve()),
            },
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

  describe('changeRole', () => {
    function setupWithErrorStore(updateRoleError: string | null = null) {
      const errorSig = signal<{ message: string } | null>(null);
      const mockStore = {
        memberships: signal([] as MembershipSummary[]),
        loadingList: signal(false),
        loadingMutation: signal(false),
        error: errorSig,
        loadMemberships: vi.fn(() => Promise.resolve()),
        inviteMember: vi.fn(() => Promise.resolve(null)),
        updateMemberRole: vi.fn(async () => {
          if (updateRoleError) errorSig.set({ message: updateRoleError });
        }),
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
            useValue: {
              maxSeats: signal(10),
              loadEntitlements: vi.fn(() => Promise.resolve()),
            },
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
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const toast = fixture.debugElement.injector.get(MessageService);
      const toastSpy = vi.spyOn(toast, 'add');
      return { component, mockStore, toastSpy };
    }

    it('calls updateMemberRole and shows success toast', async () => {
      const { component, mockStore, toastSpy } = setupWithErrorStore();
      await component.changeRole(makeMember(), 'ADMIN' as MembershipRole);
      expect(mockStore.updateMemberRole).toHaveBeenCalledWith(
        'org-1',
        'm1',
        'ADMIN',
      );
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'Role updated',
        }),
      );
    });

    it('shows error toast when store has error after updateMemberRole', async () => {
      const { component, toastSpy } = setupWithErrorStore('Role update failed');
      await component.changeRole(makeMember(), 'ADMIN' as MembershipRole);
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'Role update failed',
        }),
      );
    });

    it('returns early when member has no id', async () => {
      const { component, mockStore } = setupWithErrorStore();
      await component.changeRole(
        { ...makeMember(), id: undefined as any },
        'ADMIN' as MembershipRole,
      );
      expect(mockStore.updateMemberRole).not.toHaveBeenCalled();
    });
  });

  describe('confirmRemove and #doRemove', () => {
    function setupWithMockConfirm(removeError: string | null = null) {
      const errorSig = signal<{ message: string } | null>(null);
      const mockStore = {
        memberships: signal([] as MembershipSummary[]),
        loadingList: signal(false),
        loadingMutation: signal(false),
        error: errorSig,
        loadMemberships: vi.fn(() => Promise.resolve()),
        inviteMember: vi.fn(() => Promise.resolve(null)),
        updateMemberRole: vi.fn(() => Promise.resolve()),
        removeMember: vi.fn(async () => {
          if (removeError) errorSig.set({ message: removeError });
        }),
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
            useValue: {
              maxSeats: signal(10),
              loadEntitlements: vi.fn(() => Promise.resolve()),
            },
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
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
      const toastSvc = fixture.debugElement.injector.get(MessageService);
      const confirmSpy = vi.spyOn(confirmSvc, 'confirm');
      const toastSpy = vi.spyOn(toastSvc, 'add');
      return { component, mockStore, confirmSpy, toastSpy };
    }

    it('calls ConfirmationService.confirm with user email in message', () => {
      const { component, confirmSpy } = setupWithMockConfirm();
      component.confirmRemove(
        makeMember({ user: { email: 'remove@example.com' } }),
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('remove@example.com'),
        }),
      );
    });

    it('calls ConfirmationService.confirm with userId when user.email is absent', () => {
      const { component, confirmSpy } = setupWithMockConfirm();
      component.confirmRemove(makeMember({ userId: 'user-uuid-999' }));
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('user-uuid-999'),
        }),
      );
    });

    it('calls removeMember and shows success toast when accept is triggered', async () => {
      const { component, mockStore, confirmSpy, toastSpy } =
        setupWithMockConfirm();
      component.confirmRemove(makeMember());
      const { accept } = confirmSpy.mock.calls[0][0] as any;
      await accept();
      expect(mockStore.removeMember).toHaveBeenCalledWith('org-1', 'm1');
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success', summary: 'Removed' }),
      );
    });

    it('shows error toast when store has error after removeMember', async () => {
      const { component, confirmSpy, toastSpy } = setupWithMockConfirm(
        'Cannot remove member',
      );
      component.confirmRemove(makeMember());
      const { accept } = confirmSpy.mock.calls[0][0] as any;
      await accept();
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'Cannot remove member',
        }),
      );
    });

    it('does not call removeMember when member has no id', async () => {
      const { component, mockStore, confirmSpy } = setupWithMockConfirm();
      component.confirmRemove({ ...makeMember(), id: undefined as any });
      const { accept } = confirmSpy.mock.calls[0][0] as any;
      await accept();
      expect(mockStore.removeMember).not.toHaveBeenCalled();
    });
  });

  // ── downloadCsv ──────────────────────────────────────────────────────────
  describe('downloadCsv()', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:mock'),
        revokeObjectURL: vi.fn(),
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
        () => undefined,
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('does nothing when member list is empty', () => {
      const { component } = setup({ members: [] });
      component.downloadCsv();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('triggers a download when members are present', () => {
      const { component } = setup({ members: [makeMember()] });
      component.downloadCsv();
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    });

    it('revokes the object URL after triggering download', () => {
      const { component } = setup({ members: [makeMember()] });
      component.downloadCsv();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });

    it('generates CSV with the correct header row', async () => {
      const { component } = setup({ members: [makeMember()] });
      let capturedBlob: Blob | null = null;
      vi.mocked(
        URL.createObjectURL as ReturnType<typeof vi.fn>,
      ).mockImplementation((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock';
      });
      component.downloadCsv();
      const text = await capturedBlob!.text();
      expect(text.split('\r\n')[0]).toBe(
        'id,user_id,email,first_name,last_name,role,status',
      );
    });

    it('includes member data in CSV rows', async () => {
      const m = makeMember({
        id: 'mbr-1',
        userId: 'uid-1',
        role: 'ADMIN',
        status: 'ACTIVE',
        user: {
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
        },
      });
      const { component } = setup({ members: [m] });
      let capturedBlob: Blob | null = null;
      vi.mocked(
        URL.createObjectURL as ReturnType<typeof vi.fn>,
      ).mockImplementation((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock';
      });
      component.downloadCsv();
      const text = await capturedBlob!.text();
      const dataRow = text.split('\r\n')[1];
      expect(dataRow).toContain('mbr-1');
      expect(dataRow).toContain('uid-1');
      expect(dataRow).toContain('alice@example.com');
      expect(dataRow).toContain('Alice');
      expect(dataRow).toContain('Smith');
      expect(dataRow).toContain('ADMIN');
      expect(dataRow).toContain('ACTIVE');
    });

    it('escapes double-quotes inside field values', async () => {
      const m = makeMember({
        user: { firstName: 'Al"ice', email: 'alice@example.com' },
      });
      const { component } = setup({ members: [m] });
      let capturedBlob: Blob | null = null;
      vi.mocked(
        URL.createObjectURL as ReturnType<typeof vi.fn>,
      ).mockImplementation((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock';
      });
      component.downloadCsv();
      const text = await capturedBlob!.text();
      expect(text).toContain('"Al""ice"');
    });

    it('handles missing user fields gracefully', async () => {
      const m = makeMember({ user: undefined });
      const { component } = setup({ members: [m] });
      let capturedBlob: Blob | null = null;
      vi.mocked(
        URL.createObjectURL as ReturnType<typeof vi.fn>,
      ).mockImplementation((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock';
      });
      component.downloadCsv();
      const text = await capturedBlob!.text();
      const dataRow = text.split('\r\n')[1];
      // email, first_name, last_name should be empty quoted strings
      expect(dataRow).toContain('""');
    });

    it('filename includes orgId and today date', () => {
      const { component } = setup({ members: [makeMember()] });
      const filenames: string[] = [];
      const origCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreate(tag);
        if (tag === 'a') {
          vi.spyOn(el, 'click').mockImplementation(() => {
            filenames.push((el as HTMLAnchorElement).download);
          });
        }
        return el;
      });
      component.downloadCsv();
      const today = new Date().toISOString().slice(0, 10);
      expect(filenames[0]).toMatch(
        new RegExp(`^members-org-1-${today}\\.csv$`),
      );
    });
  });
});
