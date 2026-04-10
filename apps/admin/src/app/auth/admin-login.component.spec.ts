import { TestBed } from '@angular/core/testing';
import { AuthService } from '@auth0/auth0-angular';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLoginComponent } from './admin-login.component';

describe('AdminLoginComponent', () => {
  const mockAuth0 = { loginWithRedirect: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [{ provide: AuthService, useValue: mockAuth0 }],
    }).compileComponents();
  });

  it('renders the Sign In button', () => {
    const fixture = TestBed.createComponent(AdminLoginComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sign In');
  });

  it('calls loginWithRedirect when login() is invoked', () => {
    const fixture = TestBed.createComponent(AdminLoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.login();
    expect(mockAuth0.loginWithRedirect).toHaveBeenCalledOnce();
  });
});
