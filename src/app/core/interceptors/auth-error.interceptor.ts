import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Auth endpoints whose own 401/403 must NOT trigger a global logout/redirect
// (otherwise a failed login would bounce the user around).
const AUTH_PATHS = ['/auth/login', '/auth/redeem-code', '/auth/verify-exchange-token'];

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
