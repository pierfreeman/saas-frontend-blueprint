import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';
import { catchError, throwError } from 'rxjs';
import { isApiError } from '@org/shared/util-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const messageService = inject(MessageService);
  const authStore = inject(AuthStore);
  const orgsStore = inject(OrganizationsStore);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          authStore.clearUser();
          orgsStore.clearActiveOrg();
          router.navigateByUrl('/auth');
        } else {
          const summary = httpErrorSummary(err.status);
          const detail =
            err.error?.message ?? err.message ?? 'An unexpected error occurred';
          messageService.add({
            severity: 'error',
            summary,
            detail,
            life: 5000,
          });
        }
      } else if (isApiError(err)) {
        const summary = httpErrorSummary(err.status);
        messageService.add({
          severity: 'error',
          summary,
          detail: err.message,
          life: 5000,
        });
      }
      return throwError(() => err);
    }),
  );
};

function httpErrorSummary(status: number): string {
  if (status === 403) return 'Access denied';
  if (status === 404) return 'Not found';
  if (status === 422) return 'Validation error';
  if (status >= 500) return 'Server error';
  return 'Request failed';
}
