import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthStore } from '@saas-frontend/auth/data-access';

@Component({
  selector: 'app-personal-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AvatarModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="flex flex-col gap-6 max-w-2xl">
      <h1 class="text-2xl font-bold text-surface-900 m-0">Personal Settings</h1>

      <p-card header="Profile">
        <div class="flex items-center gap-4 mb-6">
          @if (pictureUrl()) {
            <p-avatar
              [image]="pictureUrl()!"
              size="xlarge"
              shape="circle"
              styleClass="shrink-0"
            />
          } @else {
            <p-avatar
              [label]="avatarLabel()"
              size="xlarge"
              shape="circle"
              styleClass="shrink-0"
            />
          }
          <div>
            <div class="font-semibold text-surface-900">
              {{ displayName() }}
            </div>
            <div class="text-surface-500 text-sm">{{ email() }}</div>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label
                class="text-sm font-medium text-surface-700"
                for="firstName"
                >First name</label
              >
              <input
                id="firstName"
                pInputText
                type="text"
                [ngModel]="draftFirstName()"
                (ngModelChange)="draftFirstName.set($event)"
                placeholder="Alice"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-surface-700" for="lastName"
                >Last name</label
              >
              <input
                id="lastName"
                pInputText
                type="text"
                [ngModel]="draftLastName()"
                (ngModelChange)="draftLastName.set($event)"
                placeholder="Smith"
                class="w-full"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700" for="pictureUrl"
              >Profile picture URL</label
            >
            <input
              id="pictureUrl"
              pInputText
              type="url"
              [ngModel]="draftPictureUrl()"
              (ngModelChange)="draftPictureUrl.set($event)"
              placeholder="https://…"
              class="w-full"
            />
            <p class="text-xs text-surface-400 m-0">
              For Google login users, this is auto-synced from your Google
              account.
            </p>
          </div>

          <div class="flex justify-end">
            <p-button
              label="Save changes"
              icon="pi pi-check"
              [loading]="saving()"
              [disabled]="!hasChanges()"
              (onClick)="save()"
            />
          </div>
        </div>
      </p-card>

      <p-card header="Security">
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-surface-700"
              >Login method</span
            >
            @if (authProvider() === 'google') {
              <p-tag severity="info" value="Google" icon="pi pi-google" />
            } @else if (authProvider() === 'password') {
              <p-tag
                severity="secondary"
                value="Email / Password"
                icon="pi pi-lock"
              />
            } @else {
              <p-tag
                severity="secondary"
                value="Passwordless"
                icon="pi pi-envelope"
              />
            }
          </div>

          @if (authProvider() === 'google') {
            <p class="text-sm text-surface-600 m-0">
              Your account uses Google Sign-In. To update your password, visit
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline"
                >Google Account settings</a
              >.
            </p>
          } @else if (authProvider() === 'passwordless') {
            <p class="text-sm text-surface-600 m-0">
              Your account uses passwordless email login — no password required.
            </p>
          } @else {
            <div class="flex flex-col gap-2">
              <p class="text-sm text-surface-600 m-0">
                A password reset link will be sent to
                <strong>{{ email() }}</strong
                >.
              </p>
              <div class="flex justify-end">
                <p-button
                  label="Send password reset email"
                  icon="pi pi-send"
                  severity="secondary"
                  [loading]="requestingPasswordReset()"
                  (onClick)="requestPasswordReset()"
                />
              </div>
            </div>
          }
        </div>
      </p-card>
    </div>
  `,
})
export class PersonalSettingsComponent {
  readonly #authStore = inject(AuthStore);
  readonly #toast = inject(MessageService);

  readonly email = computed(() => this.#authStore.currentUser()?.email ?? '');
  readonly pictureUrl = computed(
    () => this.#authStore.currentUser()?.pictureUrl ?? null,
  );

  readonly displayName = computed(() => {
    const u = this.#authStore.currentUser();
    if (u?.firstName || u?.lastName) {
      return [u.firstName, u.lastName].filter(Boolean).join(' ');
    }
    return u?.email?.split('@')[0] ?? 'Unknown';
  });

  readonly avatarLabel = computed(
    () => this.displayName().charAt(0).toUpperCase() || '?',
  );

  readonly saving = signal(false);

  readonly draftFirstName = signal(
    this.#authStore.currentUser()?.firstName ?? '',
  );
  readonly draftLastName = signal(
    this.#authStore.currentUser()?.lastName ?? '',
  );
  readonly draftPictureUrl = signal(
    this.#authStore.currentUser()?.pictureUrl ?? '',
  );

  readonly hasChanges = computed(() => {
    const u = this.#authStore.currentUser();
    return (
      this.draftFirstName() !== (u?.firstName ?? '') ||
      this.draftLastName() !== (u?.lastName ?? '') ||
      this.draftPictureUrl() !== (u?.pictureUrl ?? '')
    );
  });

  readonly authProvider = computed(() => {
    const auth0Id = this.#authStore.currentUser()?.auth0Id ?? '';
    if (auth0Id.startsWith('google-oauth2|')) return 'google';
    if (auth0Id.startsWith('auth0|')) return 'password';
    return 'passwordless';
  });

  readonly requestingPasswordReset = signal(false);

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.#authStore.updateProfile({
        firstName: this.draftFirstName() || undefined,
        lastName: this.draftLastName() || undefined,
        pictureUrl: this.draftPictureUrl() || undefined,
      });
      this.#toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Profile updated successfully.',
        life: 3000,
      });
    } catch {
      this.#toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save profile. Please try again.',
        life: 4000,
      });
    } finally {
      this.saving.set(false);
    }
  }

  async requestPasswordReset(): Promise<void> {
    this.requestingPasswordReset.set(true);
    try {
      await this.#authStore.requestPasswordChange();
      this.#toast.add({
        severity: 'success',
        summary: 'Email sent',
        detail: 'Check your inbox for a password reset link.',
        life: 5000,
      });
    } catch {
      this.#toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to send password reset email. Please try again.',
        life: 4000,
      });
    } finally {
      this.requestingPasswordReset.set(false);
    }
  }
}
