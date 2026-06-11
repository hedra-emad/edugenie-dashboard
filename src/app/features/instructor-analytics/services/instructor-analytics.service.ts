import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InstructorAnalyticsResponse } from '../models/instructor-analytics.model';

@Injectable({
  providedIn: 'root'
})
export class InstructorAnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = 'https://edugenie-api.vercel.app';

  getStats(): Observable<InstructorAnalyticsResponse> {
    return this.http.get<InstructorAnalyticsResponse>(`${this.apiUrl}/courses/instructor-stats`, {
      withCredentials: true
    });
  }
}
