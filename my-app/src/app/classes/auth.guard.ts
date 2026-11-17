import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';

export const customerAuthGuard: CanActivateFn = (_route, state) => {
  const store = inject(StoreApiService);
  const router = inject(Router);
  if (store.getCurrentUser()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { redirect: state.url }
  });
};

export const adminAuthGuard: CanActivateFn = () => {
  const store = inject(StoreApiService);
  const router = inject(Router);
  if (store.isAdminLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/admin-login']);
};
