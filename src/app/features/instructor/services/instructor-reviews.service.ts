import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InstructorReview {
  reviewId: string;
  courseId: string;
  courseTitle: string;
  sectionTitle: string | null;
  studentName: string;
  studentAvatar: string | null;
  rating: number;
  comment: string;
  isFlagged: boolean;
  flagReason: string | null;
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
  search?: string;
  flaggedOnly?: boolean;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class InstructorReviewsService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/instructor/reviews';

  getReviews(filters: ReviewsFilterOptions): Observable<InstructorReviewsResponse> {
    let params = new HttpParams();

    if (filters.courseId)        params = params.set('courseId',    filters.courseId);
    if (filters.rating?.length)  params = params.set('rating',      filters.rating.join(','));
    if (filters.sortBy)          params = params.set('sortBy',      filters.sortBy);
    if (filters.search)          params = params.set('search',      filters.search);
    if (filters.flaggedOnly)     params = params.set('flaggedOnly', 'true');
    if (filters.page)            params = params.set('page',        filters.page.toString());

    params = params.set('limit', String(Math.min(filters.limit ?? 10, 100)));

    return this.http.get<InstructorReviewsResponse>(this.apiUrl, { params });
  }
}
