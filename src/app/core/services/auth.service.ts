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

  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private readonly authInitializedSubject = new BehaviorSubject<boolean>(false);
  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  readonly currentUserSignal = signal<UserProfile | null>(null);

  private initialization$: Observable<void> | null = null;

  initializeAuth(): Observable<void> {
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

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.authApiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          if (response.data && response.data.user) {
            if (response.data.user.role !== 'student') {
              this.setCurrentUser(response.data.user);
            }
          }
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
        tap((response) => {
          if (response.data && response.data.user) {
            if (response.data.user.role !== 'student') {
              this.setCurrentUser(response.data.user);
            }
          }
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
        tap((response) => {
          if (response.data && response.data.user) {
            this.setCurrentUser(response.data.user);
          }
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

  logout(): Observable<void> {
    return this.http.post(`${this.authApiUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => {
        this.clearCurrentUser();
        const nextjsUrl = environment.studentAppUrl;
        window.location.href = `${nextjsUrl}/logout`;
      }),
      map(() => void 0),
    );
  }

  // auth.service.ts

setCurrentUser(user: UserProfile | null): void {
  this.currentUserSubject.next(user);
  this.currentUserSignal.set(user);

  if (user?.id) {
    this.notificationsService.connectPusher(user.id);
  }
}

clearCurrentUser(): void {
  this.notificationsService.disconnectPusher();
  this.currentUserSubject.next(null);
  this.currentUserSignal.set(null);
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
