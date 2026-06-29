import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { InstructorAnalyticsResponse } from '../models/instructor-analytics.model';

export interface RecentSaleApiItem {
  student?: string;
  studentAvatar?: string;
  course?: string;
  date?: string | Date;
  amount?: number;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstructorAnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = '/instructor';

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
      .get<any>(`${this.apiUrl}/dashboard/overview`)
      .pipe(
        map(response => response.data !== undefined ? response.data : response),
        map((overview) => ({
          totalEarnings: overview.totalEarnings ?? 0,
          earningsChangePercent: overview.earningsChangePercent ?? 0,
          totalStudents: overview.totalStudents ?? 0,
          newStudentsThisWeek: overview.newStudentsThisWeek ?? 0,
          averageRating: overview.averageRating ?? 0,
          totalCourses: overview.totalCourses ?? 0,
          pendingPayouts: overview.pendingPayout ?? 0,
          nextPayoutDate: overview.nextPayoutDate ? new Date(overview.nextPayoutDate) : new Date(),
        }))
      );
  }

  getRecentSales(): Observable<RecentSaleApiItem[]> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/recent-sales`).pipe(
      map(response => response.data !== undefined ? response.data : response),
      map((payload) => {
        // Since the backend now returns { data: [ ...items ] } we parse it nicely
        const list = Array.isArray(payload) ? payload : (payload?.items ?? []);
        return list.map((item: any) => ({
          student: item.studentName || item.student || item.studentId || '-',
          studentAvatar: item.studentAvatar || null,
          course: item.courseName || item.course || item.courseTitle || '-',
          date: item.date || item.createdAt || item.enrolledAt || item.purchasedAt,
          amount: item.amount ?? item.price ?? item.total ?? 0,
          status: item.status || 'COMPLETED',
        }));
      })
    );
  }



}
