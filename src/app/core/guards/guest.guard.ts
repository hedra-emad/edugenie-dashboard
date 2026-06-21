import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForAuthInit().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return true;
      }

      const user = authService.getCurrentUser();
      const homeRoute = user
        ? authService.getHomeRouteForRole(user.role)
        : '/settings';

      if (authService.isExternalRedirect(homeRoute)) {
        window.location.href = authService.getStudentAppRedirectUrl();
        return false;
      }

      return router.createUrlTree([homeRoute]);
    }),
  );
};
