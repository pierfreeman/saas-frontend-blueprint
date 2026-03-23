import type { components, operations } from '@org/shared/util-types';

export type CreateMembershipDto = components['schemas']['CreateMembershipDto'];
export type UpdateMembershipDto = components['schemas']['UpdateMembershipDto'];
export type MembershipRole = components['schemas']['MembershipRole'];

export type Membership =
  operations['MembershipsController_create']['responses']['201']['content']['application/json'];

export type MembershipSummary = NonNullable<
  operations['MembershipsController_findByOrg']['responses']['200']['content']['application/json']
>[number];

export type DeleteMembershipResponse =
  operations['MembershipsController_delete']['responses']['200']['content']['application/json'];
