import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrganizationsStore } from '@org/organizations/data-access';

export const orgGuard: CanActivateFn = () => {
  const orgsStore = inject(OrganizationsStore);
  const router = inject(Router);

  if (orgsStore.hasActiveOrg()) {
    return true;
  }

  router.navigate(['/org/select']);
  return false;
};
