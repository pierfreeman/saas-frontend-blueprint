import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { filter, take } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonModule, CardModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-100">
      <p-card class="w-full max-w-sm">
        <ng-template pTemplate="header">
          <div class="flex flex-col items-center pt-8 pb-2 px-6">
            <span class="text-3xl font-bold tracking-tight text-primary mb-1"
              >SaaS App</span
            >
            <span class="text-sm text-color-secondary"
              >Sign in to continue</span
            >
          </div>
        </ng-template>
        <ng-template pTemplate="content">
          <p-button
            label="Continue with your account"
            icon="pi pi-sign-in"
            styleClass="w-full"
            (onClick)="login()"
          />
        </ng-template>
      </p-card>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  ngOnInit(): void {
    // If already authenticated, skip the login page
    this.#auth.isAuthenticated$
      .pipe(
        filter((ok) => ok),
        take(1),
      )
      .subscribe(() => this.#router.navigateByUrl('/'));
  }

  login(): void {
    this.#auth.loginWithRedirect();
  }
}
