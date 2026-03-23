import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ButtonModule, MenuModule, AvatarModule],
  template: `
    <header
      class="flex items-center justify-between px-6 h-14 bg-surface-0 border-b border-surface-200 shadow-sm"
    >
      <!-- Logo -->
      <a
        routerLink="/"
        class="font-bold text-lg tracking-tight text-primary no-underline"
      >
        SaaS App
      </a>

      <div class="flex items-center gap-4">
        <!-- Org switcher -->
        @if (activeOrgId()) {
          <p-button
            [label]="activeOrgId()!"
            severity="secondary"
            size="small"
            icon="pi pi-building"
            routerLink="/org/select"
          />
        }

        <!-- Avatar menu -->
        <p-menu #menu [model]="avatarMenuItems" [popup]="true" />
        <p-avatar
          [label]="avatarLabel()"
          shape="circle"
          class="cursor-pointer"
          (click)="menu.toggle($event)"
        />
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly #auth = inject(AuthService);
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #router = inject(Router);

  readonly activeOrgId = this.#orgsStore.activeOrgId;

  readonly avatarLabel = computed(() => {
    const email = this.#authStore.currentUser()?.email ?? '';
    return email.charAt(0).toUpperCase() || '?';
  });

  readonly avatarMenuItems: MenuItem[] = [
    {
      label: 'Switch organization',
      icon: 'pi pi-building',
      command: () => this.#router.navigate(['/org/select']),
    },
    { separator: true },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.#logout(),
    },
  ];

  #logout(): void {
    this.#authStore.clearUser();
    this.#orgsStore.clearActiveOrg();
    // openUrl: false prevents redirect to Auth0 logout endpoint,
    // which requires the returnTo URL to be pre-authorised in Auth0 dashboard.
    // The SDK still clears the local session and auth cookies.
    this.#auth.logout({ openUrl: false });
    this.#router.navigateByUrl('/auth');
  }
}
