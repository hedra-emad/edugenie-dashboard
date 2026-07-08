import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  finalize,
  map,
  of,
  shareReplay,
  take,
  tap,
  throwError,
} from 'rxjs';
import {
  LoginCredentials,
  LoginResponse,
  ProfileApiResponse,
  UserProfile,
  UserRole,
} from '../models/user-profile.model';
import { NotificationsService } from './notifications';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);

  private readonly authApiUrl = '/auth';
  private readonly usersApiUrl = '/users';

  // JS-readable mirror of "this browser has an active staff session". The real
  // JWT/refresh cookies are httpOnly (unreadable from JS), so a never-logged-in
  // visitor has no way to know there's no session — and would otherwise fire a
  // GET /users/profile (401) + POST /auth/refresh (401) pair on every load that
  // the browser logs to the console. This flag lets us skip those calls for
  // guests. Set on any successful auth, cleared on logout/session-clear.
  private static readonly SESSION_HINT_KEY = 'edugenie_has_session';

  hasSessionHint(): boolean {
    try {
      return localStorage.getItem(AuthService.SESSION_HINT_KEY) === '1';
    } catch {
      return false;
    }
  }

  private setSessionHint(on: boolean): void {
    try {
      if (on) {
        localStorage.setItem(AuthService.SESSION_HINT_KEY, '1');
      } else {
        localStorage.removeItem(AuthService.SESSION_HINT_KEY);
      }
    } catch {
      // localStorage unavailable (SSR / private mode) — the flag is a hint only.
    }
  }

  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private readonly authInitializedSubject = new BehaviorSubject<boolean>(false);
  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  readonly currentUserSignal = signal<UserProfile | null>(null);

  private initialization$: Observable<void> | null = null;
  private readonly inactiveAccountStatuses = new Set([
    'deactivated',
    'deleted',
    'inactive',
    'disabled',
    'suspended',
    'blocked',
    'banned',
    'pending_delete',
    'deletion_pending',
  ]);

  initializeAuth(): Observable<void> {
    // Guest (never logged in): no session hint → skip the profile fetch entirely,
    // so no /users/profile 401 and no downstream /auth/refresh 401 in the console.
    if (!this.hasSessionHint()) {
      if (!this.initialization$) {
        this.authInitializedSubject.next(true);
        this.initialization$ = of(void 0);
      }
      return this.initialization$;
    }

    if (!this.initialization$) {
      this.initialization$ = this.http
        .get<ProfileApiResponse>(`${this.usersApiUrl}/profile`)
        .pipe(
          tap((response) => {
            if (response.success && response.data) {
              this.setCurrentUser(response.data);
            } else {
              // Only clear if nobody else has already set a user
              // (e.g. RedeemComponent ran getProfile() before this resolved)
              if (!this.currentUserSubject.value) {
                this.clearCurrentUser();
              }
            }
          }),
          catchError(() => {
            // The GET was fired before the JWT cookie was set (redeem handoff).
            // Only wipe state if no user has been authenticated by another path.
            if (!this.currentUserSubject.value) {
              this.clearCurrentUser();
            }
            return of(null);
          }),
          map(() => void 0),
          finalize(() => this.authInitializedSubject.next(true)),
          shareReplay(1),
        );
    }

    return this.initialization$;
  }

  waitForAuthInit(): Observable<void> {
    if (this.authInitializedSubject.value) {
      return of(void 0);
    }

    return this.authInitialized$.pipe(
      filter((initialized) => initialized),
      take(1),
      map(() => void 0),
    );
  }

  private refreshInFlight$: Observable<LoginResponse> | null = null;

  /**
   * Silently exchanges the httpOnly refresh-token cookie for a fresh access
   * JWT (POST /auth/refresh). Concurrent callers share one in-flight request —
   * several 401s landing together must not each rotate the refresh token.
   */
  refreshSession(): Observable<LoginResponse> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<LoginResponse>(`${this.authApiUrl}/refresh`, {})
        .pipe(
          tap((response) => {
            const user = response.data?.user;
            if (user && this.isAccountActive(user) && user.role !== 'student') {
              this.setCurrentUser(user);
            }
          }),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
          shareReplay(1),
        );
    }
    return this.refreshInFlight$;
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.authApiUrl}/login`, credentials)
      .pipe(
        map((response) => {
          const user = response.data?.user;

          if (!user || !this.isAccountActive(user)) {
            this.clearCurrentUser();
            throw this.createInactiveAccountError();
          }

          if (user.role !== 'student') {
            this.setCurrentUser(user);
          }

          return response;
        }),
      );
  }

  verifyExchangeToken(token: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.authApiUrl}/verify-exchange-token`,
        { token },
        { withCredentials: true }
      )
      .pipe(
        map((response) => {
          const user = response.data?.user;

          if (!user || !this.isAccountActive(user)) {
            this.clearCurrentUser();
            throw this.createInactiveAccountError();
          }

          if (user.role !== 'student') {
            this.setCurrentUser(user);
          }

          return response;
        }),
      );
  }

  redeemCode(code: string): Observable<{ userId: string; userRole: UserRole }> {
    return this.http
      .post<{ success: boolean; data: { userId: string; userRole: UserRole } }>(
        `${this.authApiUrl}/redeem-code`,
        { code },
        { withCredentials: true }
      )
      .pipe(
        map((response) => response.data)
      );
  }

  register(data: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.authApiUrl}/register`, data);
  }

  /** Request a password-reset link (Phase 4). */
  forgotPassword(email: string): Observable<unknown> {
    return this.http.post(`${this.authApiUrl}/forgot-password`, { email });
  }

  /** Complete a password reset using the token from the email link. */
  resetPassword(token: string, password: string): Observable<unknown> {
    return this.http.post(`${this.authApiUrl}/reset-password`, {
      token,
      password,
    });
  }

  /** Confirm an email-verification token. */
  verifyEmail(token: string): Observable<unknown> {
    return this.http.post(`${this.authApiUrl}/verify-email`, { token });
  }

  /** Looks up the invitee details for an admin invite token. */
  validateInvite(token: string): Observable<{
    email: string;
    firstName: string;
    lastName: string;
  }> {
    return this.http
      .post<{
        success: boolean;
        data: { email: string; firstName: string; lastName: string };
      }>(`${this.authApiUrl}/validate-invite`, { token })
      .pipe(map((response) => response.data));
  }

  /** Accepts an admin invite, sets the session cookie, and populates state. */
  acceptInvite(token: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.authApiUrl}/accept-invite`, { token, password })
      .pipe(
        map((response) => {
          const user = response.data?.user;

          if (!user || !this.isAccountActive(user)) {
            this.clearCurrentUser();
            throw this.createInactiveAccountError();
          }

          this.setCurrentUser(user);
          return response;
        }),
      );
  }

  getProfile(): Observable<ProfileApiResponse> {
    return this.http
      .get<ProfileApiResponse>(`${this.usersApiUrl}/profile`)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setCurrentUser(response.data);
          }
        }),
        catchError((error) => {
          this.clearCurrentUser();
          return throwError(() => error);
        }),
      );
  }

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
    avatarPublicId?: string | null;
  }): Observable<ProfileApiResponse> {
    return this.http
      .patch<ProfileApiResponse>(`${this.usersApiUrl}/profile`, data)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setCurrentUser(response.data);
          }
        }),
      );
  }

  /**
   * Upload a new avatar image via the backend (signed Cloudinary upload).
   * Sends a multipart/form-data request to PATCH /users/profile with the
   * cropped image file. The backend handles Cloudinary upload, deletion of
   * any previous avatar, and persisting avatar + avatarPublicId.
   */
  uploadAvatar(croppedBlob: Blob): Observable<ProfileApiResponse> {
    const formData = new FormData();
    formData.append('profileImage', croppedBlob, 'avatar.png');
    return this.http
      .patch<ProfileApiResponse>(`${this.usersApiUrl}/profile`, formData)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setCurrentUser(response.data);
          }
        }),
      );
  }

  /**
   * Remove the current avatar. Sends { removeAvatar: true } to the backend
   * which deletes the Cloudinary asset and clears avatar + avatarPublicId.
   */
  removeAvatar(): Observable<ProfileApiResponse> {
    return this.http
      .patch<ProfileApiResponse>(`${this.usersApiUrl}/profile`, { avatar: null })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setCurrentUser(response.data);
          }
        }),
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.patch<any>(`${this.usersApiUrl}/change-password`, { currentPassword, newPassword });
  }

  logout(): Observable<void> {
    // Capture the role before clearing state so we can send the user back to
    // where they sign in: admins/superadmins return to the dashboard's
    // admin-login page, while everyone else (instructors) is bounced to the
    // EduGenie app's logout route — the app is where they authenticate.
    const role = this.getCurrentUser()?.role;
    return this.http.post(`${this.authApiUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => {
        this.clearCurrentUser();
        if (role === 'admin' || role === 'superadmin') {
          this.router.navigate(['/admin-login']);
        } else {
          const nextjsUrl = environment.studentAppUrl;
          window.location.href = `${nextjsUrl}/logout`;
        }
      }),
      map(() => void 0),
    );
  }

  /**
   * Revoke a just-created session WITHOUT the hard cross-app redirect that
   * `logout()` performs. Used by the admin-login page to turn away a non-admin
   * who authenticated there: the backend already minted a session cookie, so we
   * must clear it server- and client-side while staying on the page to show the
   * "administrators only" message.
   */
  endSessionSilently(): Observable<void> {
    return this.http.post(`${this.authApiUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => this.clearCurrentUser()),
      map(() => void 0),
    );
  }

  private isAccountActive(user: UserProfile | null | undefined): boolean {
    if (!user) {
      return false;
    }

    const maybeUser = user as UserProfile & Record<string, unknown>;

    if (typeof maybeUser['isDeleted'] === 'boolean' && maybeUser['isDeleted']) {
      return false;
    }

    if (typeof maybeUser['deleted'] === 'boolean' && maybeUser['deleted']) {
      return false;
    }

    if (typeof maybeUser['isActive'] === 'boolean' && !maybeUser['isActive']) {
      return false;
    }

    const normalizedStatus = String(maybeUser['status'] ?? '').trim().toLowerCase();
    if (this.inactiveAccountStatuses.has(normalizedStatus)) {
      return false;
    }

    if (normalizedStatus.includes('deleted') || normalizedStatus.includes('deactivated') || normalizedStatus.includes('inactive')) {
      return false;
    }

    const deletedAt = maybeUser['deletedAt'] ?? maybeUser['deleted_at'] ?? maybeUser['removedAt'];
    if (deletedAt !== undefined && deletedAt !== null && deletedAt !== '') {
      return false;
    }

    return true;
  }

  private createInactiveAccountError(): Error {
    const error = new Error('This account has been deactivated or deleted.');
    (error as Error & { status?: number; error?: unknown }).status = 403;
    (error as Error & { status?: number; error?: unknown }).error = {
      deactivated: true,
      message: 'This account has been deactivated or deleted.',
    };
    return error;
  }

  setCurrentUser(user: UserProfile | null): void {
    if (!this.isAccountActive(user)) {
      this.clearCurrentUser();
      return;
    }

    this.currentUserSubject.next(user);
    this.currentUserSignal.set(user);
    this.setSessionHint(true);

    if (user?.id) {
      this.notificationsService.connectPusher(user.id);
    }
  }

  clearCurrentUser(): void {
    this.notificationsService.disconnectPusher();
    this.currentUserSubject.next(null);
    this.currentUserSignal.set(null);
    this.setSessionHint(false);
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getHomeRouteForRole(role: UserRole): string {
    switch (role) {
      case 'admin':
      case 'superadmin':
        return '/admin';
      case 'instructor':
        return '/my-courses';
      case 'student':
        return 'EXTERNAL_STUDENT_APP';
      default:
        // NOTE: default case is unchanged deliberately — if a
        // role value is ever unrecognized, falling back to an
        // internal Angular route is safer than an undefined
        // external redirect.
        return '/settings';
    }
  }

  isExternalRedirect(route: string): boolean {
    return route === 'EXTERNAL_STUDENT_APP';
  }

  getStudentAppRedirectUrl(): string {
    return environment.studentAppUrl;
  }

  redirectToStudentApp(exchangeToken?: string): Observable<void> {
    // Students belong on the Next.js app, which lives on a different domain and
    // can't read this app's API cookie. Hand the session off via a short-lived
    // exchange token so the student app can mint its own first-party cookie.
    const base = environment.studentAppUrl || 'http://localhost:3000';
    window.location.href = exchangeToken
      ? `${base}/auth-callback?token=${encodeURIComponent(exchangeToken)}`
      : base;
    return of(void 0);
  }
}
