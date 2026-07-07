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
  sortBy?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class InstructorReviewsService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/instructor/reviews';

  getReviews(filters: ReviewsFilterOptions): Observable<InstructorReviewsResponse> {
    let params = new HttpParams();

    if (filters.courseId) {
      params = params.set('courseId', filters.courseId);
    }
    if (filters.rating && filters.rating.length > 0) {
      params = params.set('rating', filters.rating.join(','));
    }
    if (filters.sortBy) {
      params = params.set('sortBy', filters.sortBy);
    }
    if (filters.searchTerm) {
      params = params.set('search', filters.searchTerm);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }

    // Never exceed the backend @Max(100)
    const limit = Math.min(filters.limit ?? 10, 100);
    params = params.set('limit', limit.toString());

    return this.http.get<InstructorReviewsResponse>(this.apiUrl, { params });
  }
}
