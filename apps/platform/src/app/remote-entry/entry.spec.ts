import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RemoteEntry } from './entry';
import { AuthApi } from '@org/auth/data-access';
import type { User } from '@org/auth/data-access';

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  auth0Id: 'auth0|123',
};

describe('RemoteEntry', () => {
  let fixture: ComponentFixture<RemoteEntry>;
  let getMeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMeSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [RemoteEntry],
      providers: [{ provide: AuthApi, useValue: { getMe: getMeSpy } }],
    });
  });

  describe('when getMe() succeeds', () => {
    beforeEach(() => {
      getMeSpy.mockReturnValue(of(mockUser));
      fixture = TestBed.createComponent(RemoteEntry);
    });

    it('creates the component', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('displays the logged-in user email after ngOnInit', () => {
      fixture.detectChanges(); // triggers ngOnInit; of() is synchronous so signal is set immediately
      fixture.detectChanges(); // re-render with updated signal
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('test@example.com');
    });

    it('does not show an error message on success', () => {
      fixture.detectChanges();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[style*="color:red"]')).toBeNull();
    });
  });

  describe('when getMe() fails', () => {
    beforeEach(() => {
      getMeSpy.mockReturnValue(throwError(() => new Error('Unauthorized')));
      fixture = TestBed.createComponent(RemoteEntry);
    });

    it('shows the error message', () => {
      fixture.detectChanges();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Unauthorized');
    });

    it('does not show a user email on error', () => {
      fixture.detectChanges();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('Logged in as');
    });
  });
});
