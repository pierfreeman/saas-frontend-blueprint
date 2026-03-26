import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { TestBed } from '@angular/core/testing';

describe('OrganizationsStore', () => {
  let store: OrganizationsStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(OrganizationsStore);
  });

  it('initialises activeOrgId as null when localStorage is empty', () => {
    expect(store.activeOrgId()).toBeNull();
  });

  it('initialises activeOrgName as null when localStorage is empty', () => {
    expect(store.activeOrgName()).toBeNull();
  });

  it('auto-hydrates activeOrgId from localStorage on init', () => {
    localStorage.setItem('saas.activeOrgId', 'org-persisted');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const freshStore = TestBed.inject(OrganizationsStore);
    expect(freshStore.activeOrgId()).toBe('org-persisted');
  });

  it('auto-hydrates activeOrgName from localStorage on init', () => {
    localStorage.setItem('saas.activeOrgId', 'org-persisted');
    localStorage.setItem('saas.activeOrgName', 'Acme Corp');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const freshStore = TestBed.inject(OrganizationsStore);
    expect(freshStore.activeOrgName()).toBe('Acme Corp');
  });

  it('hasActiveOrg is false when no org is set', () => {
    expect(store.hasActiveOrg()).toBe(false);
  });

  describe('setActiveOrg()', () => {
    it('updates activeOrgId signal', () => {
      store.setActiveOrg('org-1');
      expect(store.activeOrgId()).toBe('org-1');
    });

    it('persists id to localStorage', () => {
      store.setActiveOrg('org-2');
      expect(localStorage.getItem('saas.activeOrgId')).toBe('org-2');
    });

    it('stores org name when provided', () => {
      store.setActiveOrg('org-1', 'Acme Corp');
      expect(store.activeOrgName()).toBe('Acme Corp');
      expect(localStorage.getItem('saas.activeOrgName')).toBe('Acme Corp');
    });

    it('clears org name when not provided', () => {
      store.setActiveOrg('org-1', 'Old Name');
      store.setActiveOrg('org-2');
      expect(store.activeOrgName()).toBeNull();
      expect(localStorage.getItem('saas.activeOrgName')).toBeNull();
    });

    it('hasActiveOrg becomes true', () => {
      store.setActiveOrg('org-1');
      expect(store.hasActiveOrg()).toBe(true);
    });
  });

  describe('clearActiveOrg()', () => {
    it('resets id and name signals to null', () => {
      store.setActiveOrg('org-1', 'Acme Corp');
      store.clearActiveOrg();
      expect(store.activeOrgId()).toBeNull();
      expect(store.activeOrgName()).toBeNull();
    });

    it('removes both keys from localStorage', () => {
      store.setActiveOrg('org-1', 'Acme Corp');
      store.clearActiveOrg();
      expect(localStorage.getItem('saas.activeOrgId')).toBeNull();
      expect(localStorage.getItem('saas.activeOrgName')).toBeNull();
    });
  });
});
