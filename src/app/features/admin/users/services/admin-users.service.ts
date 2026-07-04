import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRole } from '../../../../core/models/user-profile.model';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/users';

  getUsers(page = 1, limit = 10, role?: string, status?: string, search?: string): Observable<any> {
    const params: any = { page, limit };
    if (role) params.role = role;
    if (status) params.status = status;
    if (search) params.search = search;
    return this.http.get(`/admin/users`, { params });
  }
  changeUserRole(userId: string, newRole: UserRole, confirmSuperAdminChange?: boolean): Observable<any> {
    const payload: any = { newRole };
    if (confirmSuperAdminChange !== undefined) {
      payload.confirmSuperAdminChange = confirmSuperAdminChange;
    }
    return this.http.patch(`${this.apiUrl}/${userId}/role`, payload);
  }
  deactivateUser(userId: string, reason: string): Observable<any> {
    return this.http.patch(`/admin/users/${userId}/deactivate`, { reason });
  }

  reactivateUser(userId: string): Observable<any> {
    return this.http.patch(`/admin/users/${userId}/reactivate`, {});
  }

  deleteUser(userId: string, reason: string): Observable<any> {
    return this.http.delete(`/admin/users/${userId}`, { body: { reason } });
  }
}
