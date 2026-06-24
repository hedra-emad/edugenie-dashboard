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


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

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
              this.clearCurrentUser();
            }
          }),
          catchError(() => {
            this.clearCurrentUser();
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
      .patch<ProfileApiResponse>(`${this.usersApiUrl}/profile`, { removeAvatar: true })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setCurrentUser(response.data);
          }
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post(`${this.authApiUrl}/logout`, {})
      .pipe(
        tap(() => {
          this.clearCurrentUser();
          this.router.navigate(['/login']);
        }),
        map(() => void 0),
        catchError((error) => {
          this.clearCurrentUser();
          this.router.navigate(['/login']);
          return throwError(() => error);
        }),
      );
  }

  setCurrentUser(user: UserProfile | null): void {
    this.currentUserSubject.next(user);
    this.currentUserSignal.set(user);
  }

  clearCurrentUser(): void {
    this.setCurrentUser(null);
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
    return import.meta.env.NG_APP_STUDENT_APP_URL;
  }

  redirectToStudentApp(): Observable<void> {
    return this.http.post<{ code: string }>(
      '/auth/handoff-code', {}
    ).pipe(
      tap(({ code }) => {
        window.location.href =
          `${environment.studentAppUrl}/auth/redeem?code=${code}`;
      }),
      map(() => void 0),
      catchError((err) => {
        console.error('Handoff code generation failed:', err);
        window.location.href = environment.studentAppUrl;
        return of(void 0);
      })
    );
  }
}
