import type { Components, Operations } from '@saas-frontend/shared/util-types';

export type CreateOrganizationDto =
  Components['schemas']['CreateOrganizationDto'];
export type UpdateOrganizationDto =
  Components['schemas']['UpdateOrganizationDto'];

export type Organization =
  Operations['OrganizationsController_create']['responses']['201']['content']['application/json'];

export type OrganizationSummary = NonNullable<
  Operations['OrganizationsController_findMine']['responses']['200']['content']['application/json']
>[number];

export type RequestDeletionResponse =
  Operations['OrganizationsController_requestDeletion']['responses']['202']['content']['application/json'];

export type RequestExportResponse =
  Operations['OrganizationsController_requestExport']['responses']['202']['content']['application/json'];
