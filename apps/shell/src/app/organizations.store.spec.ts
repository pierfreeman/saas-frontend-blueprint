import { OrganizationsStore } from '@org/organizations/data-access';
import { TestBed } from '@angular/core/testing';

describe('OrganizationsStore', () => {
  let store: OrganizationsStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(OrganizationsStore);
  });

  it('initialises activeOrgId as null', () => {
    expect(store.activeOrgId()).toBeNull();
  });

  it('hasActiveOrg is false when no org is set', () => {
    expect(store.hasActiveOrg()).toBe(false);
  });

  describe('setActiveOrg()', () => {
    it('updates activeOrgId signal', () => {
      store.setActiveOrg('org-1');
      expect(store.activeOrgId()).toBe('org-1');
    });

    it('persists to localStorage', () => {
      store.setActiveOrg('org-2');
      expect(localStorage.getItem('saas.activeOrgId')).toBe('org-2');
    });

    it('hasActiveOrg becomes true', () => {
      store.setActiveOrg('org-1');
      expect(store.hasActiveOrg()).toBe(true);
    });
  });

  describe('clearActiveOrg()', () => {
    it('resets signal to null', () => {
      store.setActiveOrg('org-1');
      store.clearActiveOrg();
      expect(store.activeOrgId()).toBeNull();
    });

    it('removes key from localStorage', () => {
      store.setActiveOrg('org-1');
      store.clearActiveOrg();
      expect(localStorage.getItem('saas.activeOrgId')).toBeNull();
    });
  });

  describe('hydrateFromStorage()', () => {
    it('restores a previously stored org id', () => {
      localStorage.setItem('saas.activeOrgId', 'org-restored');
      store.hydrateFromStorage();
      expect(store.activeOrgId()).toBe('org-restored');
    });

    it('leaves signal null when localStorage is empty', () => {
      store.hydrateFromStorage();
      expect(store.activeOrgId()).toBeNull();
    });
  });
});
