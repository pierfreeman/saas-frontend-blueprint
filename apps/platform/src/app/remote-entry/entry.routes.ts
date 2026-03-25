import { Route } from '@angular/router';
import { API_BASE_URL } from '@org/shared/util-types';
import { MembershipsApi } from '@org/memberships/data-access';
import { BillingApi } from '@org/billing/data-access';
import { OrganizationsApi } from '@org/organizations/data-access';
import { ActivityLogApi } from '@org/activity-log/data-access';
import { environment } from 'src/environments/environment';

export const PLATFORM_ROUTES: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    // Anonymous route group: provides API_BASE_URL and API services using the
    // platform bundle's token instances (avoids MF token identity mismatch).
    path: '',
    providers: [
      { provide: API_BASE_URL, useValue: environment.apiUrl },
      MembershipsApi,
      BillingApi,
      OrganizationsApi,
      ActivityLogApi,
    ],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('../members/members.component').then(
            (m) => m.MembersComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('../billing/billing.component').then(
            (m) => m.BillingComponent,
          ),
      },
      {
        path: 'activity-log',
        loadComponent: () =>
          import('../activity-log/activity-log.component').then(
            (m) => m.ActivityLogComponent,
          ),
      },
    ],
  },
];
