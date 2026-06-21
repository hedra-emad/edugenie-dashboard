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
      .get<{ success: boolean; data: any }>(`${this.apiUrl}/admin/stats`)
      .pipe(map(response => response.data));
  }

  getStats(): Observable<InstructorAnalyticsResponse> {
    return this.http
      .get<{ success: boolean; data: InstructorAnalyticsResponse }>(`${this.apiUrl}/instructor-stats`)
      .pipe(map(response => response.data));
  }
}
