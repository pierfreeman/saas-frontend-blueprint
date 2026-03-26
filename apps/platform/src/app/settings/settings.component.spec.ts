import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SettingsComponent } from '@org/organizations/feature-settings';
import { AuthStore } from '@org/auth/data-access';
import {
  OrganizationsStore,
  OrganizationsApi,
} from '@org/organizations/data-access';
import { ConfirmationService, MessageService } from 'primeng/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(
  opts: {
    email?: string;
    orgName?: string;
    orgId?: string | null;
    updateError?: boolean;
  } = {},
) {
  const {
    email = 'alice@example.com',
    orgName = 'Acme Corp',
    orgId = 'org-1',
    updateError = false,
  } = opts;

  const activeOrgName = signal<string | null>(orgName);
  const setActiveOrgMock = vi.fn((id: string, name: string) => {
    activeOrgName.set(name);
  });

  const mockAuth = {
    currentUser: signal({ email }),
  } as unknown as AuthStore;

  const mockOrgs = {
    activeOrgId: signal<string | null>(orgId),
    activeOrgName,
    setActiveOrg: setActiveOrgMock,
  } as unknown as OrganizationsStore;

  const mockOrgsApi = {
    updateOrganization: vi.fn(() =>
      updateError
        ? throwError(() => ({ error: { message: 'Update failed' } }))
        : of({ id: 'org-1', name: 'New Name' }),
    ),
    requestDeletion: vi.fn(() => of({ message: 'Deletion requested' })),
    requestExport: vi.fn(() => of({ message: 'Export requested' })),
  } as unknown as OrganizationsApi;

  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [
      { provide: AuthStore, useValue: mockAuth },
      { provide: OrganizationsStore, useValue: mockOrgs },
      { provide: OrganizationsApi, useValue: mockOrgsApi },
      ConfirmationService,
      MessageService,
    ],
  });

  const fixture = TestBed.createComponent(SettingsComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, mockOrgs, mockOrgsApi, setActiveOrgMock };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('SettingsComponent', () => {
  describe('initialisation', () => {
    it('populates orgNameDraft from the active org name', () => {
      const { component } = setup({ orgName: 'Acme Corp' });
      expect(component.orgNameDraft).toBe('Acme Corp');
    });

    it('exposes the activeOrgId from the store', () => {
      const { component } = setup({ orgId: 'org-abc' });
      expect(component.activeOrgId()).toBe('org-abc');
    });
  });

  describe('user info helpers', () => {
    it('email returns current user email', () => {
      const { component } = setup({ email: 'bob@test.com' });
      expect(component.email()).toBe('bob@test.com');
    });

    it('name returns the part before the @ sign', () => {
      const { component } = setup({ email: 'charlie@example.com' });
      expect(component.name()).toBe('charlie');
    });

    it('avatarLabel returns uppercased first char of email', () => {
      const { component } = setup({ email: 'dave@x.com' });
      expect(component.avatarLabel()).toBe('D');
    });
  });

  describe('canSaveName', () => {
    it('returns false when draft equals current name', () => {
      const { component } = setup({ orgName: 'Acme Corp' });
      component.orgNameDraft = 'Acme Corp';
      expect(component.canSaveName()).toBe(false);
    });

    it('returns false when draft is empty', () => {
      const { component } = setup({});
      component.orgNameDraft = '   ';
      expect(component.canSaveName()).toBe(false);
    });

    it('returns true when draft differs from current and is non-empty', () => {
      const { component } = setup({ orgName: 'Acme Corp' });
      component.orgNameDraft = 'New Name';
      expect(component.canSaveName()).toBe(true);
    });
  });

  describe('saveName', () => {
    it('calls updateOrganization and updates store on success', () => {
      const { component, mockOrgsApi, setActiveOrgMock } = setup({});
      component.orgNameDraft = 'New Name';
      component.saveName();
      expect(mockOrgsApi.updateOrganization).toHaveBeenCalledWith('org-1', {
        name: 'New Name',
      });
      expect(setActiveOrgMock).toHaveBeenCalledWith('org-1', 'New Name');
    });

    it('does nothing when orgId is null', () => {
      const { component, mockOrgsApi } = setup({ orgId: null });
      component.orgNameDraft = 'New Name';
      component.saveName();
      expect(mockOrgsApi.updateOrganization).not.toHaveBeenCalled();
    });

    it('does nothing when name is empty', () => {
      const { component, mockOrgsApi } = setup({});
      component.orgNameDraft = '  ';
      component.saveName();
      expect(mockOrgsApi.updateOrganization).not.toHaveBeenCalled();
    });

    it('resets savingName to false after success', () => {
      const { component } = setup({});
      component.orgNameDraft = 'New Name';
      component.saveName();
      expect(component.savingName()).toBe(false);
    });

    it('resets savingName to false on error', () => {
      const { component } = setup({ updateError: true });
      component.orgNameDraft = 'New Name';
      component.saveName();
      expect(component.savingName()).toBe(false);
    });
  });

  describe('requestExport', () => {
    it('calls requestExport API with orgId', () => {
      const { component, mockOrgsApi } = setup({});
      component.requestExport();
      expect(mockOrgsApi.requestExport).toHaveBeenCalledWith('org-1');
    });

    it('does nothing when orgId is null', () => {
      const { component, mockOrgsApi } = setup({ orgId: null });
      component.requestExport();
      expect(mockOrgsApi.requestExport).not.toHaveBeenCalled();
    });

    it('resets requestingExport to false after API call', () => {
      const { component } = setup({});
      component.requestExport();
      expect(component.requestingExport()).toBe(false);
    });
  });
});
