import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { MessageService } from 'primeng/api';
import { PersonalSettingsComponent } from './personal-settings.component';
import { AuthStore } from '@saas-frontend/auth/data-access';
import type { User } from '@saas-frontend/auth/data-access';

const baseUser: User = {
  id: 'u1',
  auth0Id: 'auth0|1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  pictureUrl: null,
};

function setup(user: User | null = baseUser) {
  const currentUser = signal<User | null>(user);
  const mockStore = {
    currentUser,
    updateProfile: vi.fn(() => Promise.resolve(user ?? baseUser)),
  } as unknown as AuthStore;

  TestBed.configureTestingModule({
    imports: [PersonalSettingsComponent],
    providers: [{ provide: AuthStore, useValue: mockStore }],
  });

  const fixture: ComponentFixture<PersonalSettingsComponent> =
    TestBed.createComponent(PersonalSettingsComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  // MessageService is provided at the component level; retrieve it from the
  // component's own injector so we can spy on its add() method.
  const toast = fixture.debugElement.injector.get(MessageService);
  vi.spyOn(toast, 'add');

  return { fixture, component, mockStore, currentUser, toast };
}

describe('PersonalSettingsComponent', () => {
  describe('computed display properties', () => {
    it('returns the user email', () => {
      const { component } = setup();
      expect(component.email()).toBe('alice@example.com');
    });

    it('returns empty string when no user', () => {
      const { component } = setup(null);
      expect(component.email()).toBe('');
    });

    it('displayName returns firstName + lastName when both present', () => {
      const { component } = setup();
      expect(component.displayName()).toBe('Alice Smith');
    });

    it('displayName uses only firstName when lastName is absent', () => {
      const { component } = setup({
        ...baseUser,
        firstName: 'Alice',
        lastName: null,
      });
      expect(component.displayName()).toBe('Alice');
    });

    it('displayName falls back to email local part when no name', () => {
      const { component } = setup({
        ...baseUser,
        firstName: null,
        lastName: null,
      });
      expect(component.displayName()).toBe('alice');
    });

    it('displayName returns Unknown when no user at all', () => {
      const { component } = setup(null);
      expect(component.displayName()).toBe('Unknown');
    });

    it('avatarLabel returns first char of displayName uppercased', () => {
      const { component } = setup();
      expect(component.avatarLabel()).toBe('A');
    });

    it('pictureUrl returns null when not set', () => {
      const { component } = setup();
      expect(component.pictureUrl()).toBeNull();
    });

    it('pictureUrl returns the URL when set', () => {
      const { component } = setup({
        ...baseUser,
        pictureUrl: 'https://example.com/pic.jpg',
      });
      expect(component.pictureUrl()).toBe('https://example.com/pic.jpg');
    });
  });

  describe('hasChanges', () => {
    it('is false when drafts match current user', () => {
      const { component } = setup();
      expect(component.hasChanges()).toBe(false);
    });

    it('is true when draftFirstName differs from user firstName', () => {
      const { component } = setup();
      component.draftFirstName.set('Bob');
      expect(component.hasChanges()).toBe(true);
    });

    it('is true when draftLastName differs from user lastName', () => {
      const { component } = setup();
      component.draftLastName.set('Jones');
      expect(component.hasChanges()).toBe(true);
    });

    it('is true when draftPictureUrl differs from user pictureUrl', () => {
      const { component } = setup();
      component.draftPictureUrl.set('https://new.example.com/pic.jpg');
      expect(component.hasChanges()).toBe(true);
    });

    it('is false when draft is reset back to original value', () => {
      const { component } = setup();
      component.draftFirstName.set('Changed');
      expect(component.hasChanges()).toBe(true);
      component.draftFirstName.set('Alice');
      expect(component.hasChanges()).toBe(false);
    });
  });

  describe('save()', () => {
    it('calls authStore.updateProfile with the current draft values', async () => {
      const { component, mockStore } = setup();
      component.draftFirstName.set('Bob');
      component.draftLastName.set('Jones');

      await component.save();

      expect(mockStore.updateProfile).toHaveBeenCalledWith({
        firstName: 'Bob',
        lastName: 'Jones',
        pictureUrl: undefined,
      });
    });

    it('sends undefined for empty string fields', async () => {
      const { component, mockStore } = setup();
      component.draftFirstName.set('');
      component.draftLastName.set('');
      component.draftPictureUrl.set('');

      await component.save();

      expect(mockStore.updateProfile).toHaveBeenCalledWith({
        firstName: undefined,
        lastName: undefined,
        pictureUrl: undefined,
      });
    });

    it('shows a success toast on success', async () => {
      const { component, toast } = setup();
      component.draftFirstName.set('Carol');

      await component.save();

      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('shows an error toast when updateProfile throws', async () => {
      const currentUser = signal<User | null>(baseUser);
      const mockStore = {
        currentUser,
        updateProfile: vi.fn(() => Promise.reject(new Error('Network error'))),
      } as unknown as AuthStore;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [PersonalSettingsComponent],
        providers: [{ provide: AuthStore, useValue: mockStore }],
      });

      const fixture = TestBed.createComponent(PersonalSettingsComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const toast = fixture.debugElement.injector.get(MessageService);
      vi.spyOn(toast, 'add');

      component.draftFirstName.set('Dave');
      await component.save();

      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });

    it('resets saving to false after success', async () => {
      const { component } = setup();
      component.draftFirstName.set('Eve');

      await component.save();

      expect(component.saving()).toBe(false);
    });

    it('resets saving to false after error', async () => {
      const currentUser = signal<User | null>(baseUser);
      const mockStore = {
        currentUser,
        updateProfile: vi.fn(() => Promise.reject(new Error('fail'))),
      } as unknown as AuthStore;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [PersonalSettingsComponent],
        providers: [{ provide: AuthStore, useValue: mockStore }],
      });

      const fixture = TestBed.createComponent(PersonalSettingsComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.draftFirstName.set('Frank');
      await component.save();

      expect(component.saving()).toBe(false);
    });
  });
});
