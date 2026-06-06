import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, catchError, of, Observable } from 'rxjs';

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface LoginResponse {
  message: string;
  user: UserProfile;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  
  // Global User State
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // We can also use Signals if preferred, but BehaviorSubject is standard. Let's use signal as well for reactivity if needed.
  public currentUserSignal = signal<UserProfile | null>(null);

  private apiUrl = 'https://edugenie-api.vercel.app/auth';
  private usersApiUrl = 'https://edugenie-api.vercel.app/users';

  login(data: any) {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      data,
      { withCredentials: true }
    ).pipe(
      tap((res) => {
        if (res.user) {
          this.setCurrentUser(res.user);
        }
      })
    );
  }

  register(data: any) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  // Profile Methods
  getProfile(): Observable<any> {
    return this.http.get<{success: boolean; message: string; data: UserProfile}>(
      `${this.usersApiUrl}/profile`, 
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.data) {
          this.setCurrentUser(response.data);
        }
      })
    );
  }

  updateProfile(data: { firstName?: string; lastName?: string; avatar?: string }): Observable<any> {
    return this.http.patch<{success: boolean; message: string; data: UserProfile}>(
      `${this.usersApiUrl}/profile`,
      data,
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.data) {
          this.setCurrentUser(response.data);
        }
      })
    );
  }

  setCurrentUser(user: UserProfile | null) {
    this.currentUserSubject.next(user);
    this.currentUserSignal.set(user);
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }
}
