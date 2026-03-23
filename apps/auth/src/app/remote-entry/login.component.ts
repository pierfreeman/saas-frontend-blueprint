import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-login',
  template: `<p>Redirecting to login…</p>`,
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);

  ngOnInit() {
    this.auth.loginWithRedirect();
  }
}
