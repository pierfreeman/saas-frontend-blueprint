import {
  Component,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { AuthStore } from '@saas-frontend/auth/data-access';

@Component({
  selector: 'app-personal-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarModule, CardModule],
  template: `
    <div class="flex flex-col gap-6 max-w-2xl">
      <h1 class="text-2xl font-bold text-surface-900 m-0">Personal Settings</h1>

      <p-card header="Profile">
        <div class="flex items-center gap-4">
          <p-avatar [label]="avatarLabel()" size="xlarge" shape="circle" />
          <div>
            <div class="font-semibold text-surface-900">{{ name() }}</div>
            <div class="text-surface-500 text-sm">{{ email() }}</div>
          </div>
        </div>
        <p class="text-surface-400 text-sm mt-4 mb-0">
          Profile information is managed via your identity provider.
        </p>
      </p-card>
    </div>
  `,
})
export class PersonalSettingsComponent {
  readonly #authStore = inject(AuthStore);

  readonly email = computed(() => this.#authStore.currentUser()?.email ?? '');
  readonly name = computed(
    () => this.#authStore.currentUser()?.email?.split('@')[0] ?? 'Unknown',
  );
  readonly avatarLabel = computed(
    () => this.email().charAt(0).toUpperCase() || '?',
  );
}
