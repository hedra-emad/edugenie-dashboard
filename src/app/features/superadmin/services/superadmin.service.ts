import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SuperAdminDashboardOverviewResponse,
  AdminListItem,
  AdminActivityPaginatedResponse,
  PendingPayoutPaginatedResponse,
  PayoutProcessResponse,
  PlatformConfigResponse,
  UpdatePlatformConfigDto,
  AuditLogPaginatedResponse,
  SystemHealthResponse,
  InviteAdminPayload,
  InviteAdminResponse
} from '../models/superadmin.models';

@Injectable({
  providedIn: 'root'
})
export class SuperadminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/superadmin';

  getDashboardOverview(): Observable<SuperAdminDashboardOverviewResponse> {
    return this.http.get<SuperAdminDashboardOverviewResponse>(`${this.baseUrl}/dashboard/overview`);
  }

  getSystemHealth(): Observable<SystemHealthResponse> {
    return this.http.get<SystemHealthResponse>(`${this.baseUrl}/system-health`);
  }

  getAdmins(): Observable<AdminListItem[]> {
    return this.http.get<AdminListItem[]>(`${this.baseUrl}/admins`);
  }

  /** Invite a new administrator by email (sends a one-time acceptance link). */
  inviteAdmin(payload: InviteAdminPayload): Observable<InviteAdminResponse> {
    return this.http.post<InviteAdminResponse>(`${this.baseUrl}/admins`, payload);
  }

  /** Revoke an admin's access (deactivate; reversible). */
  revokeAdmin(adminId: string): Observable<{ id: string; status: string }> {
    return this.http.patch<{ id: string; status: string }>(
      `${this.baseUrl}/admins/${adminId}/revoke`,
      {}
    );
  }

  /** Restore a previously-revoked admin's access. */
  unrevokeAdmin(adminId: string): Observable<{ id: string; status: string }> {
    return this.http.patch<{ id: string; status: string }>(
      `${this.baseUrl}/admins/${adminId}/unrevoke`,
      {}
    );
  }

  getAdminActivity(id: string, page: number = 1, limit: number = 10): Observable<AdminActivityPaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<AdminActivityPaginatedResponse>(`${this.baseUrl}/admins/${id}/activity`, { params });
  }

  getPendingPayouts(page: number = 1, limit: number = 10): Observable<PendingPayoutPaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<PendingPayoutPaginatedResponse>(`${this.baseUrl}/payouts/pending`, { params });
  }

  processPayout(instructorId: string, amount: number): Observable<PayoutProcessResponse> {
    return this.http.patch<PayoutProcessResponse>(`${this.baseUrl}/payouts/${instructorId}/process`, { amount });
  }

  getPlatformConfig(): Observable<PlatformConfigResponse> {
    return this.http.get<PlatformConfigResponse>(`${this.baseUrl}/platform-config`);
  }

  updatePlatformConfig(config: UpdatePlatformConfigDto): Observable<PlatformConfigResponse> {
    return this.http.patch<PlatformConfigResponse>(`${this.baseUrl}/platform-config`, config);
  }

  getAuditLogs(userId: string = '', action: string = '', startDate: string = '', endDate: string = '', page: number = 1, limit: number = 10): Observable<AuditLogPaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    if (userId) params = params.set('userId', userId);
    if (action) params = params.set('action', action);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<AuditLogPaginatedResponse>(`${this.baseUrl}/audit-logs`, { params });
  }

}
