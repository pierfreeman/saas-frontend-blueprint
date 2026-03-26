import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { OrganizationsStore } from './organizations.store';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

/** Paths that must never receive an x-org-id header. */
const SKIP_PATHS = ['/auth/me', '/auth0'];

/**
 * Attaches the `x-org-id` header to every API request when an active
 * organization is selected. Skips auth-bootstrap endpoints that run before
 * any org is known.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);

  if (!req.url.startsWith(apiBaseUrl)) {
    return next(req);
  }

  const activeOrgId = inject(OrganizationsStore).activeOrgId();

  if (!activeOrgId) {
    return next(req);
  }

  if (SKIP_PATHS.some((path) => req.url.includes(path))) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'x-org-id': activeOrgId } }));
};
