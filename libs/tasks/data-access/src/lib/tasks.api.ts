import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type {
  CreateTaskDto,
  CreateHeavyJobResponse,
  JobStatus,
} from './tasks.api.types';

@Injectable({ providedIn: 'root' })
export class TasksApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  createHeavyJob(dto: CreateTaskDto): Observable<CreateHeavyJobResponse> {
    return this.#http.post<CreateHeavyJobResponse>(
      `${this.#base}/tasks/heavy-job`,
      dto,
    );
  }

  getJobStatus(jobId: string): Observable<JobStatus> {
    return this.#http.get<JobStatus>(`${this.#base}/tasks/${jobId}`);
  }
}
