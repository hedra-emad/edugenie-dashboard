import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForAuthInit().pipe(
    map(() =>
      authService.isAuthenticated()
        ? true
        : router.createUrlTree(['/login']),
    ),
  );
};
