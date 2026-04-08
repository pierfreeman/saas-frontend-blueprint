import type { Components, Operations } from '@saas-frontend/shared/util-types';

export type CreateTaskDto = Components['schemas']['CreateTaskDto'];

export type CreateHeavyJobResponse =
  Operations['TasksController_createHeavyJob']['responses']['202']['content']['application/json'];

export type JobStatus = Components['schemas']['JobStatusDto'];
