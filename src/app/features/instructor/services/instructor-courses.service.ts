import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
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
        tap((data) => {
        })
      );
  }
}
