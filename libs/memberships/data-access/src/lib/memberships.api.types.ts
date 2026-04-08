import type { Components, Operations } from '@saas-frontend/shared/util-types';

export type CreateMembershipDto = Components['schemas']['CreateMembershipDto'];
export type UpdateMembershipDto = Components['schemas']['UpdateMembershipDto'];
export type MembershipRole = Components['schemas']['MembershipRole'];
export type InviteMemberDto = Components['schemas']['InviteMemberDto'];

export type Membership =
  Operations['MembershipsController_create']['responses']['201']['content']['application/json'];

export type MembershipSummary = NonNullable<
  Operations['MembershipsController_findByOrg']['responses']['200']['content']['application/json']
>[number];

export type DeleteMembershipResponse =
  Operations['MembershipsController_delete']['responses']['200']['content']['application/json'];

export type InviteMemberResponse =
  Operations['MembershipsController_invite']['responses']['201']['content']['application/json'];
