import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Endpoints whose own 401 must NOT trigger a global logout/redirect.
// - Auth paths: a failed login should not bounce the user around.
// - change-password: a 401 here means the *current* password is wrong,
//   not that the session has expired — the component handles it locally.
const AUTH_PATHS = [
  '/auth/login',
  '/auth/redeem-code',
  '/auth/verify-exchange-token',
  '/users/change-password',   // 401 = wrong current password, not expired session
];

/**
 * Global handler for expired / invalid sessions. When any non-auth request
 * comes back 401 (or 403 for a deactivated account), clear the in-memory user
 * and send them to the login page instead of leaving a broken "logged-in" UI.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));
        const isSessionError = error.status === 401 || error.status === 403;

        if (isSessionError && !isAuthCall && authService.isAuthenticated()) {
          authService.clearCurrentUser();
          void router.navigate(['/login'], {
            queryParams: { sessionExpired: true },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
