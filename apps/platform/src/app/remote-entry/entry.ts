import { Component, inject, signal, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AuthApi } from '@org/auth/data-access';
import type { User } from '@org/auth/data-access';

@Component({
  selector: 'app-platform-entry',
  template: `
    @if (user()) {
      <p>
        Logged in as <strong>{{ user()!.email }}</strong>
      </p>
    } @else if (error()) {
      <p style="color:red">API error: {{ error() }}</p>
    } @else {
      <p>Loading user…</p>
    }
  `,
})
export class RemoteEntry implements OnInit {
  readonly #authApi = inject(AuthApi);

  readonly user = signal<User | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.#authApi
      .getMe()
      .pipe(
        catchError((err) => {
          this.error.set(err?.message ?? 'Unknown error');
          return of(null);
        }),
      )
      .subscribe((u) => this.user.set(u));
  }
}
