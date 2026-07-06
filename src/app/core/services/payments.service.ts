import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface BuyableCourse {
  id: string;
  title: string;
  price: number;
  thumbnail?: string;
  instructorName?: string;
}

/**
 * Talks only to our backend (never Stripe directly). Drives the demo
 * "Buy course (test)" flow: list published courses + start a Stripe Checkout.
 */
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);

  /** Published courses available to buy (public catalog). */
  listPublishedCourses(): Observable<BuyableCourse[]> {
    const params = new HttpParams().set('limit', '50');
    return this.http
      .get<{ data: { data: any[] } }>('/courses', { params })
      .pipe(
        map((res) =>
          (res?.data?.data ?? []).map((c) => ({
            id: c.id ?? c._id,
            title: c.title,
            price: c.price ?? 0,
            thumbnail: c.thumbnail,
            instructorName:
              c.instructor?.name ??
              c.instructorName ??
              (c.instructor
                ? `${c.instructor.firstName ?? ''} ${c.instructor.lastName ?? ''}`.trim()
                : undefined),
          })),
        ),
      );
  }

  /** Start a Stripe Checkout for a course; returns the hosted checkout URL. */
  checkout(courseId: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>('/payments/checkout', { courseId });
  }
}
