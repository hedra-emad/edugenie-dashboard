import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Endpoints whose own 401 must NOT trigger a refresh or global logout/redirect.
// - Auth paths: a failed login should not bounce the user around, and a failed
//   /auth/refresh must never recurse into another refresh.
// - change-password: a 401 here means the *current* password is wrong,
//   not that the session has expired — the component handles it locally.
const AUTH_PATHS = [
  '/auth/login',
  '/auth/redeem-code',
  '/auth/verify-exchange-token',
  '/auth/refresh',
  '/users/change-password',   // 401 = wrong current password, not expired session
];

/**
 * Global handler for expired / invalid sessions.
 *
 * On a 401 for any non-auth request, first try a silent session refresh
 * (the access JWT only lives 15 min; POST /auth/refresh rotates the httpOnly
 * refresh cookie) and retry the request once. Only when the refresh itself
 * fails — session truly over — clear the in-memory user and go to login.
 * 403 (deactivated account) keeps the old immediate clear-and-redirect.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const redirectToLogin = () => {
    // Route the expired session to where that role actually signs in:
    // admins/superadmins re-authenticate on the dashboard's admin-login,
    // while instructors sign in on the EduGenie app (the `/login` redirect
    // component bounces them there). Read the role before clearing state.
    const role = authService.getCurrentUser()?.role;
    authService.clearCurrentUser();
    const target = role === 'admin' || role === 'superadmin' ? '/admin-login' : '/login';
    void router.navigate([target], {
      queryParams: { sessionExpired: true },
    });
  };

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));

        // Only attempt a silent refresh when a session was actually expected.
        // A guest (no session hint) 401 must not spawn a /auth/refresh — that
        // just adds a second console 401 for a visitor who never logged in.
        if (error.status === 401 && !isAuthCall && authService.hasSessionHint()) {
          // Concurrent 401s share one in-flight refresh (deduped in the service).
          return authService.refreshSession().pipe(
            // `next(req)` re-runs only the downstream chain, so a second 401
            // on the retry surfaces as an error here instead of looping.
            switchMap(() => next(req)),
            catchError((retryError: unknown) => {
              if (authService.isAuthenticated()) {
                redirectToLogin();
              }
              // Surface the original failure shape to the caller.
              return throwError(() => retryError ?? error);
            }),
          );
        }

        if (
          error.status === 403 &&
          !isAuthCall &&
          authService.isAuthenticated()
        ) {
          // Read the reason from the response body before clearing state
          const body = error.error as Record<string, unknown> | null;
          const isBlocked =
            body?.['isBlocked'] === true ||
            body?.['blocked'] === true ||
            String(body?.['message'] ?? '').toLowerCase().includes('blocked');

          const role = authService.getCurrentUser()?.role;
          authService.clearCurrentUser();
          const target = role === 'admin' || role === 'superadmin' ? '/admin-login' : '/login';
          void router.navigate([target], {
            queryParams: isBlocked ? { blocked: true } : { deactivated: true },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
