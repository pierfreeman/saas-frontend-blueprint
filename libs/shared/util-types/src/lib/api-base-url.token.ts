import { InjectionToken } from '@angular/core';

/**
 * Injection token for the backend API base URL.
 * Provide it in the root app config:
 *   { provide: API_BASE_URL, useValue: environment.apiUrl }
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
