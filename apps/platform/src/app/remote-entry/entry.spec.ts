import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RemoteEntry } from './entry';
import { AuthStore } from '@org/auth/data-access';
import type { User } from '@org/auth/data-access';

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  auth0Id: 'auth0|123',
};

describe('RemoteEntry', () => {
  let fixture: ComponentFixture<RemoteEntry>;

  function setup(currentUser: User | null) {
    const userSignal = signal(currentUser);
    TestBed.configureTestingModule({
      imports: [RemoteEntry],
      providers: [
        { provide: AuthStore, useValue: { currentUser: userSignal } },
      ],
    });
    fixture = TestBed.createComponent(RemoteEntry);
    fixture.detectChanges();
  }

  it('creates the component', () => {
    setup(mockUser);
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('when a user is available', () => {
    beforeEach(() => setup(mockUser));

    it('displays the logged-in user email', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('test@example.com');
    });
  });

  describe('when no user is set yet', () => {
    beforeEach(() => setup(null));

    it('shows loading text', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Loading');
    });

    it('does not show a user email', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('Logged in as');
    });
  });
});
