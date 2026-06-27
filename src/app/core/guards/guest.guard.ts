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
        // If a student lands on the dashboard login page but is already authenticated,
        // it means they logged out of the Next.js app but the dashboard API still has their cookie.
        // We log them out here so they can actually see the login page and get a fresh token.
        authService.logout().subscribe();
        return true;
      }

      return router.createUrlTree([homeRoute]);
    }),
  );
};
