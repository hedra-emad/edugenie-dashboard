import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { InstructorAnalyticsResponse } from '../models/instructor-analytics.model';

@Injectable({
  providedIn: 'root'
})
export class InstructorAnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = '/courses';

  getAdminStats(): Observable<any> {
    return this.http
      .get<any>(`/admin/dashboard/overview`)
      .pipe(map(response => response.data !== undefined ? response.data : response));
  }

  getOpenReports(): Observable<any> {
    return this.http
      .get<any>(`/admin/reports`, { params: { status: 'open', limit: 5 } })
      .pipe(map(response => response.data !== undefined ? response.data : response));
  }

  getPlatformAnalytics(period?: string): Observable<any> {
    const options = period ? { params: { period } } : {};
    return this.http
      .get<any>(`/admin/analytics/platform`, options)
      .pipe(map(response => response.data !== undefined ? response.data : response));
  }

  getStats(): Observable<InstructorAnalyticsResponse> {
    return this.http
      .get<any>(`${this.apiUrl}/instructor-stats`)
      .pipe(map(response => response.data !== undefined ? response.data : response));
  }
}
