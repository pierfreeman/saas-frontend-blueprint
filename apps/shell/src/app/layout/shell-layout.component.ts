import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { NavbarComponent } from './navbar.component';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, NavbarComponent, ToastModule],
  template: `
    <div class="flex flex-col min-h-screen bg-surface-100">
      <app-navbar />
      <main class="flex-1 p-6">
        <router-outlet />
      </main>
    </div>
    <p-toast position="bottom-right" />
  `,
})
export class ShellLayoutComponent {}
