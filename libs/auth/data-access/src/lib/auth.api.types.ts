import type { Operations } from '@saas-frontend/shared/util-types';

export type User =
  Operations['AuthController_getMe']['responses']['200']['content']['application/json'];
