import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { ButtonModule } from 'primeng/button';

/**
 * AdminLoginComponent
 *
 * Full-screen login page for the standalone Admin Portal.
 * Delegates authentication to Auth0 (Admin-Users-DB connection).
 */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-surface-50">
      <div
        class="w-full max-w-sm p-8 bg-white rounded-2xl shadow-md flex flex-col items-center gap-6"
      >
        <div class="flex flex-col items-center gap-2">
          <i class="pi pi-shield text-4xl text-primary"></i>
          <h1 class="text-2xl font-semibold text-surface-900">Admin Portal</h1>
          <p class="text-sm text-surface-500 text-center">
            Sign in with your administrator account to continue.
          </p>
        </div>

        <p-button
          label="Sign In"
          icon="pi pi-sign-in"
          styleClass="w-full"
          (click)="login()"
        />
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  readonly #auth0 = inject(AuthService);

  login(): void {
    this.#auth0.loginWithRedirect();
  }
}
