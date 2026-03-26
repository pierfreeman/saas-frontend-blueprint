import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-callback',
  template: `<p>Completing login…</p>`,
})
export class CallbackComponent implements OnInit {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  ngOnInit(): void {
    // If Auth0 returned an error (e.g. access_denied), navigate home and let
    // the shell's authGuard redirect to login.
    const error = this.#route.snapshot.queryParamMap.get('error');
    if (error) {
      console.error('[auth] callback error:', error);
      this.#router.navigateByUrl('/');
      return;
    }

    // Wait for Auth0 SDK to finish processing the callback (code exchange).
    // The shell's provideAppInitializer has already loaded user + orgs.
    this.#auth.isLoading$
      .pipe(
        filter((loading) => !loading),
        take(1),
      )
      .subscribe(() => {
        this.#router.navigateByUrl('/');
      });
  }
}
