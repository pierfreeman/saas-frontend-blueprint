import { Route } from '@angular/router';
import { ADMIN_API_BASE_URL } from '@saas-frontend/shared/util-types';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { environment } from '../../environments/environment';

export const ADMIN_ROUTES: Route[] = [
  { path: '', redirectTo: 'organizations', pathMatch: 'full' },
  {
    path: '',
    providers: [
      AdminApi,
      { provide: ADMIN_API_BASE_URL, useValue: environment.adminApiUrl },
    ],
    children: [
      {
        path: 'organizations',
        loadComponent: () =>
          import('../organizations/admin-organizations.component').then(
            (m) => m.AdminOrganizationsComponent,
          ),
      },
      {
        path: 'organizations/:orgId',
        loadComponent: () =>
          import('../organizations/admin-org-detail.component').then(
            (m) => m.AdminOrgDetailComponent,
          ),
      },
      {
        path: 'activity-log',
        loadComponent: () =>
          import('../activity-log/admin-all-activity.component').then(
            (m) => m.AdminAllActivityComponent,
          ),
      },
    ],
  },
];
