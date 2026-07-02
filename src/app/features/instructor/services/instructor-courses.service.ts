import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, concat, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { InstructorCourse } from '../models/instructor-course.model';

@Injectable({
  providedIn: 'root',
})
export class InstructorCoursesService {
  private http = inject(HttpClient);

  //  Change this to localhost while developing!
  // (Change it back to vercel.app only when you are ready to deploy to production)
  private apiUrl = '/courses';

  getMyCourses(): Observable<InstructorCourse[]> {
    return this.http
      .get<{ success: boolean; data: InstructorCourse[] }>(`${this.apiUrl}/my-courses`)
      .pipe(
        map((response) => response.data),
        switchMap((courses: InstructorCourse[]) => {
          if (!courses.length) return of([]);

          // Fetch each course individually so the backend runs syncMetadata,
          // which recalculates totalHours & totalLessons from embedded lessons.
          const detailRequests = courses.map((course) =>
            this.http
              .get<{ success: boolean; data: any }>(`${this.apiUrl}/${course.id}`)
              .pipe(
                map((res) => res.data),
                catchError(() => of(null)) // fall back gracefully on error
              )
          );

          const enriched$ = forkJoin(detailRequests).pipe(
            map((details) =>
              courses.map((course, i) => {
                const detail = details[i];
                if (!detail) return course;

                // If the detail response includes sections, compute totalHours
                // directly from videoDuration (mirrors section-card logic).
                if (detail.sections && Array.isArray(detail.sections)) {
                  const totalSeconds: number = detail.sections.reduce(
                    (secSum: number, section: any) => {
                      const lessonsArr = section.lessons ?? [];
                      return (
                        secSum +
                        lessonsArr.reduce(
                          (lesSum: number, lesson: any) =>
                            lesSum + Number(lesson.videoDuration || 0),
                          0
                        )
                      );
                    },
                    0
                  );
                  return {
                    ...course,
                    totalHours: totalSeconds / 3600, // keep full precision — toFixed(2) rounds sub-minute durations to 0
                    totalLessons: detail.totalLessons ?? course.totalLessons,
                  };
                }

                // Fallback: use the synced totalHours returned by the backend.
                return {
                  ...course,
                  totalHours: detail.totalHours ?? course.totalHours,
                  totalLessons: detail.totalLessons ?? course.totalLessons,
                };
              })
            )
          );

          // Emit the base list first so the page renders immediately, then the
          // enriched list (totalHours/totalLessons) once the per-course detail
          // calls resolve — same final data, no longer blocked on the slowest call.
          return concat(of(courses), enriched$);
        })
      );
  }

  /** Format a duration in hours to a human-readable string (e.g. "2h 30m", "45m", "30s"). */
  formatTotalHours(totalHours: number): string {
    if (!totalHours || totalHours <= 0) return '0m';
    const totalSeconds = Math.round(totalHours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
} 
