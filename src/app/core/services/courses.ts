import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateCoursePayload {
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  categoryId: string; 
  goals?: string[];
  requirements?: string[];
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: string;
  categoryId: string;
  courseStatus: 'DRAFT' | 'PUBLISHED';
}

@Injectable({
  providedIn: 'root'
})
export class CoursesService {
  private http = inject(HttpClient);

  private baseUrl = 'https://edugenie-api.vercel.app/courses';

  // CREATE COURSE (DRAFT)
  createCourse(payload: CreateCoursePayload): Observable<Course> {
    return this.http.post<Course>(this.baseUrl, payload);
  }

  // GET MY COURSES
  getMyCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/my-courses`);
  }

  // GET SINGLE COURSE
  getCourseById(id: string): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${id}`);
  }

  // UPDATE COURSE
  updateCourse(id: string, payload: Partial<CreateCoursePayload>) {
    return this.http.patch<Course>(`${this.baseUrl}/${id}`, payload);
  }

  // DELETE COURSE
  deleteCourse(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getCategories() {
  return this.http.get<any[]>('/api/categories');
}
}