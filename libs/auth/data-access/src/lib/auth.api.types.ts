import type { operations } from '@saas-frontend/shared/util-types';

export type User =
  operations['AuthController_getMe']['responses']['200']['content']['application/json'];
