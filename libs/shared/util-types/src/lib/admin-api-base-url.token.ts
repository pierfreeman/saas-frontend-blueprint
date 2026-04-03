import { InjectionToken } from '@angular/core';

/**
 * Injection token for the admin backoffice API base URL.
 * Provide it in the admin remote's entry.routes.ts:
 *   { provide: ADMIN_API_BASE_URL, useValue: environment.adminApiUrl }
 *
 * Kept separate from API_BASE_URL so the tenantInterceptor (which only fires
 * for API_BASE_URL-prefixed requests) naturally skips admin API calls.
 */
export const ADMIN_API_BASE_URL = new InjectionToken<string>(
  'ADMIN_API_BASE_URL',
);
