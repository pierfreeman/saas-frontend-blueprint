import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  OrganizationsStore,
  OrganizationsApi,
} from '@saas-frontend/organizations/data-access';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="flex flex-col gap-6 max-w-2xl">
      <!-- Organisation -->
      <p-card header="Organisation">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700" for="orgName">
              Organisation name
            </label>
            <div class="flex gap-2">
              <input
                id="orgName"
                pInputText
                [(ngModel)]="orgNameDraft"
                [disabled]="savingName()"
                class="flex-1"
                placeholder="Organisation name"
              />
              <p-button
                label="Save"
                [loading]="savingName()"
                [disabled]="!canSaveName()"
                (onClick)="saveName()"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <div class="text-sm text-surface-500">Organisation ID</div>
            <code class="text-sm bg-surface-100 px-2 py-1 rounded font-mono">
              {{ activeOrgId() ?? '—' }}
            </code>
          </div>
        </div>
      </p-card>

      <!-- Data & Privacy -->
      <p-card header="Data &amp; Privacy">
        <div class="flex flex-col gap-3">
          <p class="text-surface-600 text-sm m-0">
            Export all organisation data as a machine-readable archive (JSON).
            You will receive an email when the export is ready.
          </p>
          <div>
            <p-button
              label="Request data export"
              icon="pi pi-download"
              severity="secondary"
              [loading]="requestingExport()"
              (onClick)="requestExport()"
            />
          </div>
        </div>
      </p-card>

      <!-- Danger zone -->
      <p-card header="Danger zone" styleClass="border border-red-300">
        <div class="flex flex-col gap-3">
          <p class="text-surface-600 text-sm m-0">
            Permanently delete this organisation and all its data. This action
            is irreversible and will be scheduled for processing.
          </p>
          <div>
            <p-button
              label="Request organisation deletion"
              icon="pi pi-trash"
              severity="danger"
              [outlined]="true"
              [loading]="requestingDeletion()"
              (onClick)="confirmDeletion()"
            />
          </div>
        </div>
      </p-card>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #orgsApi = inject(OrganizationsApi);
  readonly #confirm = inject(ConfirmationService);
  readonly #toast = inject(MessageService);

  readonly activeOrgId = this.#orgsStore.activeOrgId;

  readonly savingName = signal(false);
  readonly requestingExport = signal(false);
  readonly requestingDeletion = signal(false);

  orgNameDraft = '';

  canSaveName(): boolean {
    const current = this.#orgsStore.activeOrgName();
    const draft = this.orgNameDraft.trim();
    return draft.length > 0 && draft !== current && !this.savingName();
  }

  ngOnInit(): void {
    this.orgNameDraft = this.#orgsStore.activeOrgName() ?? '';
  }

  saveName(): void {
    const orgId = this.activeOrgId();
    const name = this.orgNameDraft.trim();
    if (!orgId || !name) return;

    this.savingName.set(true);
    this.#orgsApi.updateOrganization(orgId, { name }).subscribe({
      next: (org) => {
        this.#orgsStore.setActiveOrg(orgId, org.name ?? name);
        this.savingName.set(false);
        this.#toast.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Organisation name updated.',
          life: 3000,
        });
      },
      error: (err) => {
        this.savingName.set(false);
        this.#toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Failed to update name.',
          life: 4000,
        });
      },
    });
  }

  requestExport(): void {
    const orgId = this.activeOrgId();
    if (!orgId) return;

    this.requestingExport.set(true);
    this.#orgsApi.requestExport(orgId).subscribe({
      next: () => {
        this.requestingExport.set(false);
        this.#toast.add({
          severity: 'success',
          summary: 'Export requested',
          detail: 'You will receive an email when your export is ready.',
          life: 5000,
        });
      },
      error: (err) => {
        this.requestingExport.set(false);
        this.#toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Failed to request export.',
          life: 4000,
        });
      },
    });
  }

  confirmDeletion(): void {
    this.#confirm.confirm({
      message:
        'This will permanently delete your organisation and all its data. This action cannot be undone. Are you sure?',
      header: 'Delete organisation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.#doRequestDeletion(),
    });
  }

  #doRequestDeletion(): void {
    const orgId = this.activeOrgId();
    if (!orgId) return;

    this.requestingDeletion.set(true);
    this.#orgsApi.requestDeletion(orgId).subscribe({
      next: () => {
        this.requestingDeletion.set(false);
        this.#toast.add({
          severity: 'warn',
          summary: 'Deletion scheduled',
          detail:
            'Your organisation has been scheduled for deletion. You will receive a confirmation email.',
          life: 6000,
        });
      },
      error: (err) => {
        this.requestingDeletion.set(false);
        this.#toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Failed to request deletion.',
          life: 4000,
        });
      },
    });
  }
}
