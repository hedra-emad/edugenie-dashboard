import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs'; // 👈 IMPORT 'tap' here!
import { InstructorCourse } from '../models/instructor-course.model';

@Injectable({
  providedIn: 'root',
})
export class InstructorCoursesService {
  private http = inject(HttpClient);

  // 🔴 Change this to localhost while developing!
  // (Change it back to vercel.app only when you are ready to deploy to production)
  private apiUrl = 'https://edugenie-api.vercel.app';

  getMyCourses(): Observable<InstructorCourse[]> {
    return this.http
      .get<InstructorCourse[]>(`${this.apiUrl}/courses/my-courses`, {
        withCredentials: true,
      })
      .pipe(
        // 👈 'tap' lets you console.log the data exactly when it arrives from the server!
        tap((data) => {
          console.log('✅ Real Fetched Data:', data);
        }),
      );
  }
}
