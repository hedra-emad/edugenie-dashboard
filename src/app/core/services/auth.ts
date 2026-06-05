import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface LoginResponse {
  message: string;
  user: any;
}


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  private apiUrl = 'https://edugenie-api.vercel.app/auth';

  login(data: any) {
  return this.http.post<LoginResponse>(
    `${this.apiUrl}/login`,
    data,
    { withCredentials: true }
  );
}

  register(data: any) {
    return this.http.post(`https://edugenie-api.vercel.app/auth/register`, data);
  }
}
