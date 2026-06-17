import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Course, UpdateCoursePayload } from '../models/course.model';
import { CreateCoursePayload } from '../models/course.model';


@Injectable({ providedIn: 'root' })
export class CoursesService {
  private http = inject(HttpClient);
  private baseUrl = 'https://edugenie-api.vercel.app/courses';

  createCourse(payload: CreateCoursePayload): Observable<Course> {
    return this.http.post<Course>(
      this.baseUrl,
      payload,
      { withCredentials: true }
    );
  }


  getCourseById(id: string): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${id}`);
  }

  getMyCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(
      `${this.baseUrl}/my-courses`,
      { withCredentials: true }
    );
  }

  findOne(id: string) {
    return this.http.get<any>(
      `https://edugenie-api.vercel.app/courses/${id}`,
      { withCredentials: true }
    );
  }

  updateCourse(id: string, payload: UpdateCoursePayload) {
    return this.http.patch<Course>(
      `${this.baseUrl}/${id}`,
      payload,
      { withCredentials: true }
    );
  }

  deleteCourse(id: string) {
    return this.http.delete(
      `${this.baseUrl}/${id}`,
      { withCredentials: true }
    );
  }

  submitForReview(courseId: string) {
  return this.http.patch<{
    success: boolean;
    message: string;
    status: string;
  }>(
    `${this.baseUrl}/${courseId}/submit-for-review`,
    {},
    { withCredentials: true }
  );
}

}