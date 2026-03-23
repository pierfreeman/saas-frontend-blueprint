import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar.component';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, NavbarComponent],
  template: `
    <div class="flex flex-col min-h-screen bg-surface-ground">
      <app-navbar />
      <main class="flex-1 p-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellLayoutComponent {}
