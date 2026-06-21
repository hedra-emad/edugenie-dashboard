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

<<<<<<< HEAD
  getUsers(page: number = 1, limit: number = 10, role?: string, status?: string, search?: string): Observable<any> {
    let params: any = { page, limit };
    if (role) params.role = role;
    if (status) params.status = status;
    if (search) params.search = search;
    return this.http.get(`/admin/users`, { params });
  }

=======
>>>>>>> b3d05bf3e7bfd1ef7192fc5f101f92ee730b9c56
  changeUserRole(userId: string, newRole: UserRole, confirmSuperAdminChange?: boolean): Observable<any> {
    const payload: any = { newRole };
    if (confirmSuperAdminChange !== undefined) {
      payload.confirmSuperAdminChange = confirmSuperAdminChange;
    }
    return this.http.patch(`${this.apiUrl}/${userId}/role`, payload);
  }
<<<<<<< HEAD

  deactivateUser(userId: string, reason: string): Observable<any> {
    return this.http.patch(`/admin/users/${userId}/deactivate`, { reason });
  }

  reactivateUser(userId: string): Observable<any> {
    return this.http.patch(`/admin/users/${userId}/reactivate`, {});
  }
=======
>>>>>>> b3d05bf3e7bfd1ef7192fc5f101f92ee730b9c56
}
