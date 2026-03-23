import type { components, operations } from '@org/shared/util-types';

export type CreateOrganizationDto =
  components['schemas']['CreateOrganizationDto'];
export type UpdateOrganizationDto =
  components['schemas']['UpdateOrganizationDto'];

export type Organization =
  operations['OrganizationsController_create']['responses']['201']['content']['application/json'];

export type OrganizationSummary = NonNullable<
  operations['OrganizationsController_findMine']['responses']['200']['content']['application/json']
>[number];

export type RequestDeletionResponse =
  operations['OrganizationsController_requestDeletion']['responses']['202']['content']['application/json'];

export type RequestExportResponse =
  operations['OrganizationsController_requestExport']['responses']['202']['content']['application/json'];
