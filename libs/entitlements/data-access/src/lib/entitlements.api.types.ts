import type { Operations } from '@saas-frontend/shared/util-types';

/**
 * Full entitlements for an organization, extended with storage quota information.
 * `storageLimitBytes` is added manually here since it may not yet be present in
 * the generated OpenAPI types — regenerate `@saas-frontend/shared/util-types` after the
 * backend is deployed to remove the manual extension.
 */
export type OrganizationEntitlements =
  Operations['FeatureFlagsController_getEntitlements']['responses']['200']['content']['application/json'] & {
    /** Total storage quota in bytes for the plan (informational display). */
    storageLimitBytes?: number;
  };

export type InvalidateCacheResponse =
  Operations['FeatureFlagsController_invalidateCache']['responses']['200']['content']['application/json'];
