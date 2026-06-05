import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

@Injectable({
  providedIn: 'root',
})
export default class UserService {

  user = signal<CurrentUser | null>(null);

  constructor() {
    this.restoreUser();
  }

  restoreUser() {
    const stored = localStorage.getItem('user');
    if (stored) {
      this.user.set(JSON.parse(stored));
    }
  }

  setUser(user: CurrentUser) {
    this.user.set(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearUser() {
    this.user.set(null);
    localStorage.removeItem('user');
  }
}