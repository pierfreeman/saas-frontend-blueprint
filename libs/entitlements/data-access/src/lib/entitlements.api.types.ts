import type { operations } from '@org/shared/util-types';

export type OrganizationEntitlements =
  operations['FeatureFlagsController_getEntitlements']['responses']['200']['content']['application/json'];

export type InvalidateCacheResponse =
  operations['FeatureFlagsController_invalidateCache']['responses']['200']['content']['application/json'];
