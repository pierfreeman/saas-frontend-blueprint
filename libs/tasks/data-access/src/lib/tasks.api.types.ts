import type { components, operations } from '@org/shared/util-types';

export type CreateTaskDto = components['schemas']['CreateTaskDto'];

export type CreateHeavyJobResponse =
  operations['TasksController_createHeavyJob']['responses']['202']['content']['application/json'];

export type JobStatus = components['schemas']['JobStatusDto'];
