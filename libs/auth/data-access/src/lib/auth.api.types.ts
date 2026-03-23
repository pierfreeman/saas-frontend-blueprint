import type { operations } from '@org/shared/util-types';

export type User =
  operations['AuthController_getMe']['responses']['200']['content']['application/json'];
