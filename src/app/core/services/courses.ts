import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CourseLevel } from '../enums/course-level.enum';
import { Course } from '../models/course.model';

export interface CreateCoursePayload {
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: CourseLevel;
  categoryId: string;
  goals?: string[];
  requirements?: string[];
}

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private http = inject(HttpClient);
  private baseUrl = 'https://edugenie-api.vercel.app/courses';

  createCourse(payload: CreateCoursePayload): Observable<Course> {
    return this.http.post<Course>(this.baseUrl, payload);
  }

  getMyCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/my-courses`);
  }

  getCourseById(id: string): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${id}`);
  }

  updateCourse(id: string, payload: Partial<CreateCoursePayload>) {
    return this.http.patch<Course>(`${this.baseUrl}/${id}`, payload);
  }

  deleteCourse(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}