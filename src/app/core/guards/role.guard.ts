import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserRole } from '../models/user-profile.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [];

  return authService.waitForAuthInit().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/login']);
      }

      const user = authService.getCurrentUser();
      if (!user) {
        return router.createUrlTree(['/login']);
      }

      if (allowedRoles.includes(user.role)) {
        return true;
      }

      const homeRoute = authService.getHomeRouteForRole(user.role);

      if (authService.isExternalRedirect(homeRoute)) {
        window.location.href = authService.getStudentAppRedirectUrl();
        return false; // block internal navigation, browser is leaving
      }

      return router.createUrlTree([homeRoute]);
    }),
  );
};
