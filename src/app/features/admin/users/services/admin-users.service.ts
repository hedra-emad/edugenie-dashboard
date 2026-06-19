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

  changeUserRole(userId: string, newRole: UserRole, confirmSuperAdminChange?: boolean): Observable<any> {
    const payload: any = { newRole };
    if (confirmSuperAdminChange !== undefined) {
      payload.confirmSuperAdminChange = confirmSuperAdminChange;
    }
    return this.http.patch(`${this.apiUrl}/${userId}/role`, payload);
  }
}
