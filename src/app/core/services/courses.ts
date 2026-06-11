import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CourseLevel } from '../enums/course-level.enum';
import { Course } from '../models/course.model';
import { CourseStatus } from '../enums/course-status';

export interface CreateCoursePayload {
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: CourseLevel;
  categoryId: string;
  goals?: string[];
  requirements?: string[];
  courseStatus: CourseStatus;
}

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

  updateCourse(id: string, payload: Partial<CreateCoursePayload>) {
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

}