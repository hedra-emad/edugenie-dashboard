import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  private readonly authApiUrl = 'https://edugenie-api.vercel.app/auth';
  private readonly usersApiUrl = 'https://edugenie-api.vercel.app/users';

  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private readonly authInitializedSubject = new BehaviorSubject<boolean>(false);
  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  readonly currentUserSignal = signal<UserProfile | null>(null);

  private initialization$: Observable<void> | null = null;

  initializeAuth(): Observable<void> {
    if (!this.initialization$) {
      this.initialization$ = this.http
        .get<ProfileApiResponse>(`${this.usersApiUrl}/profile`, {
          withCredentials: true,
        })
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
      .post<LoginResponse>(`${this.authApiUrl}/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.user) {
            this.setCurrentUser(response.user);
          }
        }),
      );
  }

  register(data: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.authApiUrl}/register`, data);
  }

  getProfile(): Observable<ProfileApiResponse> {
    return this.http
      .get<ProfileApiResponse>(`${this.usersApiUrl}/profile`, {
        withCredentials: true,
      })
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
    avatar?: string;
  }): Observable<ProfileApiResponse> {
    return this.http
      .patch<ProfileApiResponse>(`${this.usersApiUrl}/profile`, data, {
        withCredentials: true,
      })
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
      .post(`${this.authApiUrl}/logout`, {}, { withCredentials: true })
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
        return '/analytics';
      case 'instructor':
        return '/my-courses';
      case 'student':
        return '/settings';
      default:
        return '/settings';
    }
  }
}
