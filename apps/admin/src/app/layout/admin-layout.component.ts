import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MenuModule,
    TooltipModule,
  ],
  template: `
    <div class="flex h-screen overflow-hidden bg-surface-100">
      <!-- Sidebar (icon-only, matches shell) -->
      <aside
        class="hidden lg:flex flex-col w-17 h-full bg-surface-0 border-r border-surface-200 shrink-0 select-none"
      >
        <!-- Brand -->
        <a
          routerLink="/organizations"
          class="flex items-center justify-center h-16 border-b border-surface-100 no-underline shrink-0"
          aria-label="Home"
        >
          <div
            class="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center"
          >
            <i class="pi pi-shield text-white text-sm"></i>
          </div>
        </a>

        <!-- Nav -->
        <nav class="flex flex-col items-center gap-1 py-3 flex-1">
          <a
            routerLink="/organizations"
            routerLinkActive="!text-primary"
            pTooltip="Organizations"
            tooltipPosition="right"
            class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
          >
            <i class="pi pi-building"></i>
          </a>
        </nav>

        <!-- Bottom: contextual menu -->
        <div
          class="flex flex-col items-center gap-1 pb-4 pt-2 border-t border-surface-100"
        >
          <p-menu #menu [model]="menuItems" [popup]="true" appendTo="body" />
          <button
            type="button"
            pTooltip="Admin menu"
            tooltipPosition="right"
            class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
            (click)="menu.toggle($event)"
            aria-label="Admin menu"
          >
            <i class="pi pi-ellipsis-v"></i>
          </button>
        </div>
      </aside>

      <!-- Main area -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <!-- Topbar -->
        <header
          class="flex items-center gap-3 px-4 lg:px-6 h-16 bg-surface-0 border-b border-surface-200 shrink-0"
        >
          <span class="text-sm font-semibold text-surface-700 mr-auto">
            Admin Portal
          </span>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {
  readonly #auth0 = inject(AuthService);

  readonly menuItems: MenuItem[] = [
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () =>
        this.#auth0.logout({
          logoutParams: { returnTo: globalThis.location.origin + '/login' },
        }),
    },
  ];
}
