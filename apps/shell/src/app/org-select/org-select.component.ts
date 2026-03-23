import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import {
  OrganizationsApi,
  OrganizationsStore,
  OrganizationSummary,
} from '@org/organizations/data-access';

@Component({
  selector: 'app-org-select',
  standalone: true,
  imports: [ButtonModule, CardModule],
  template: `
    <div
      class="flex min-h-screen items-center justify-center bg-surface-100 p-4"
    >
      <div class="w-full max-w-md">
        <p-card>
          <ng-template pTemplate="title">
            <h2 class="text-xl font-semibold mb-1">Select an organization</h2>
          </ng-template>
          <ng-template pTemplate="content">
            @if (orgs().length > 0) {
              <ul class="flex flex-col gap-2">
                @for (org of orgs(); track org.id) {
                  <li>
                    <p-button
                      styleClass="w-full"
                      [label]="org.name ?? org.id"
                      severity="secondary"
                      (onClick)="selectOrg(org.id!)"
                    />
                  </li>
                }
              </ul>
            } @else {
              <p class="text-color-secondary text-sm">
                You don't belong to any organization yet. Contact your
                administrator to get access.
              </p>
            }
          </ng-template>
        </p-card>
      </div>
    </div>
  `,
})
export class OrgSelectComponent implements OnInit {
  readonly #api = inject(OrganizationsApi);
  readonly #store = inject(OrganizationsStore);
  readonly #router = inject(Router);

  readonly orgs = signal<OrganizationSummary[]>([]);

  ngOnInit(): void {
    this.#api.getOrganizations().subscribe({
      next: (orgs) => this.orgs.set(orgs),
      error: () => this.orgs.set([]),
    });
  }

  selectOrg(id: string): void {
    this.#store.setActiveOrg(id);
    this.#router.navigateByUrl('/');
  }
}
