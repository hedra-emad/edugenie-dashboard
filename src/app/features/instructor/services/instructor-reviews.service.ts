import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InstructorReview {
  reviewId: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface InstructorReviewsResponse {
  data: InstructorReview[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ReviewsFilterOptions {
  courseId?: string;
  rating?: number[];
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InstructorReviewsService {
  private httpClient = inject(HttpClient);
  private apiUrl = '/api/instructor/reviews';

  getReviews(filters: ReviewsFilterOptions): Observable<InstructorReviewsResponse> {
    let params = new HttpParams();

    if (filters.courseId) {
      params = params.set('courseId', filters.courseId);
    }

    if (filters.rating && filters.rating.length > 0) {
      params = params.set('rating', filters.rating.join(','));
    }

    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }

    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.httpClient.get<InstructorReviewsResponse>(this.apiUrl, { params });
  }

  getCoursesWithReviews(): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/courses-summary`);
  }
}
