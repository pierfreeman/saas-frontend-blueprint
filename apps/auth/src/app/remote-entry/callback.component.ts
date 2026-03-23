import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-callback',
  template: `<p>Completing login…</p>`,
})
export class CallbackComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.auth.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.router.navigateByUrl('/');
      }
    });
  }
}
