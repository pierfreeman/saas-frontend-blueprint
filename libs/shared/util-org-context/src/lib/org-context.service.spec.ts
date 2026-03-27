import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OrgContextService } from './org-context.service';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { NotificationsSocketService } from '@saas-frontend/notifications/data-access';

function makeOrgsStore(
  activeOrgId: string | null = null,
  activeOrgName: string | null = null,
) {
  return {
    activeOrgId: signal(activeOrgId),
    activeOrgName: signal(activeOrgName),
    setActiveOrg: vi.fn(),
  };
}

function makeMembershipsStore() {
  return {
    flush: vi.fn(),
    loadMemberships: vi.fn().mockResolvedValue(undefined),
  };
}

function makeEntitlementsStore(
  plan: 'FREE' | 'PRO' | 'ENTERPRISE' | null = null,
) {
  return {
    plan: signal(plan),
    isFree: signal(plan === 'FREE'),
    isPro: signal(plan === 'PRO'),
    isEnterprise: signal(plan === 'ENTERPRISE'),
    flush: vi.fn(),
    loadEntitlements: vi.fn().mockResolvedValue(undefined),
    invalidateCache: vi.fn().mockResolvedValue(undefined),
  };
}

function makeNotificationsWs() {
  return {
    disconnect: vi.fn(),
    connect: vi.fn(),
  };
}

function setup(
  orgsStore = makeOrgsStore(),
  membershipsStore = makeMembershipsStore(),
  entitlementsStore = makeEntitlementsStore(),
  notificationsWs = makeNotificationsWs(),
) {
  TestBed.configureTestingModule({
    providers: [
      { provide: OrganizationsStore, useValue: orgsStore },
      { provide: MembershipsStore, useValue: membershipsStore },
      { provide: EntitlementsStore, useValue: entitlementsStore },
      { provide: NotificationsSocketService, useValue: notificationsWs },
    ],
  });
  return {
    service: TestBed.inject(OrgContextService),
    orgsStore,
    membershipsStore,
    entitlementsStore,
    notificationsWs,
  };
}

describe('OrgContextService', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── Computed signals (delegates) ───────────────────────────────────────────

  it('activeOrgId() delegates to OrganizationsStore', () => {
    const { service } = setup(makeOrgsStore('org-123'));
    expect(service.activeOrgId()).toBe('org-123');
  });

  it('activeOrgName() delegates to OrganizationsStore', () => {
    const { service } = setup(makeOrgsStore('org-1', 'Acme Corp'));
    expect(service.activeOrgName()).toBe('Acme Corp');
  });

  it('plan() delegates to EntitlementsStore', () => {
    const { service } = setup(
      makeOrgsStore(),
      makeMembershipsStore(),
      makeEntitlementsStore('PRO'),
    );
    expect(service.plan()).toBe('PRO');
  });

  it('isFree() is true when plan is FREE', () => {
    const { service } = setup(
      makeOrgsStore(),
      makeMembershipsStore(),
      makeEntitlementsStore('FREE'),
    );
    expect(service.isFree()).toBe(true);
  });

  it('isPro() is true when plan is PRO', () => {
    const { service } = setup(
      makeOrgsStore(),
      makeMembershipsStore(),
      makeEntitlementsStore('PRO'),
    );
    expect(service.isPro()).toBe(true);
  });

  it('isEnterprise() is true when plan is ENTERPRISE', () => {
    const { service } = setup(
      makeOrgsStore(),
      makeMembershipsStore(),
      makeEntitlementsStore('ENTERPRISE'),
    );
    expect(service.isEnterprise()).toBe(true);
  });

  // ── setNavRole() / currentNavRole / canManageOrg ──────────────────────────

  it('currentNavRole() starts as null', () => {
    const { service } = setup();
    expect(service.currentNavRole()).toBeNull();
  });

  it('setNavRole() updates currentNavRole', () => {
    const { service } = setup();
    service.setNavRole('OWNER');
    expect(service.currentNavRole()).toBe('OWNER');
  });

  it('canManageOrg() is true for OWNER role', () => {
    const { service } = setup();
    service.setNavRole('OWNER');
    expect(service.canManageOrg()).toBe(true);
  });

  it('canManageOrg() is true for ADMIN role', () => {
    const { service } = setup();
    service.setNavRole('ADMIN');
    expect(service.canManageOrg()).toBe(true);
  });

  it('canManageOrg() is false for MEMBER role', () => {
    const { service } = setup();
    service.setNavRole('MEMBER');
    expect(service.canManageOrg()).toBe(false);
  });

  it('canManageOrg() is false when no role is set', () => {
    const { service } = setup();
    expect(service.canManageOrg()).toBe(false);
  });

  // ── switchOrg() ───────────────────────────────────────────────────────────

  it('switchOrg() flushes memberships store', () => {
    const { service, membershipsStore } = setup();
    service.switchOrg('org-2');
    expect(membershipsStore.flush).toHaveBeenCalled();
  });

  it('switchOrg() flushes entitlements store', () => {
    const { service, entitlementsStore } = setup();
    service.switchOrg('org-2');
    expect(entitlementsStore.flush).toHaveBeenCalled();
  });

  it('switchOrg() disconnects the notifications WS', () => {
    const { service, notificationsWs } = setup();
    service.switchOrg('org-2');
    expect(notificationsWs.disconnect).toHaveBeenCalled();
  });

  it('switchOrg() calls setActiveOrg with the new orgId and name', () => {
    const { service, orgsStore } = setup();
    service.switchOrg('org-2', 'Beta Corp');
    expect(orgsStore.setActiveOrg).toHaveBeenCalledWith('org-2', 'Beta Corp');
  });

  it('switchOrg() resets navRole to null', () => {
    const { service } = setup();
    service.setNavRole('OWNER');
    service.switchOrg('org-2');
    expect(service.currentNavRole()).toBeNull();
  });

  it('switchOrg() kicks off background reload of memberships', async () => {
    const { service, membershipsStore } = setup();
    service.switchOrg('org-2');
    await Promise.resolve(); // let microtasks settle
    expect(membershipsStore.loadMemberships).toHaveBeenCalledWith('org-2');
  });

  it('switchOrg() reconnects the notifications WS for the new org', async () => {
    const { service, notificationsWs } = setup();
    service.switchOrg('org-2');
    await Promise.resolve();
    expect(notificationsWs.connect).toHaveBeenCalledWith('org-2');
  });

  // ── loadEntitlements() / invalidateEntitlements() ─────────────────────────

  it('loadEntitlements() delegates to EntitlementsStore', async () => {
    const { service, entitlementsStore } = setup();
    await service.loadEntitlements('org-1');
    expect(entitlementsStore.loadEntitlements).toHaveBeenCalledWith('org-1');
  });

  it('invalidateEntitlements() calls invalidateCache on EntitlementsStore', async () => {
    const { service, entitlementsStore } = setup();
    await service.invalidateEntitlements('org-1');
    expect(entitlementsStore.invalidateCache).toHaveBeenCalledWith('org-1');
  });
});
