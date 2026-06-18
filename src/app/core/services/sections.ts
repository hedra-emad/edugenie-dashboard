import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateSectionDto } from '../models/dto/create-section.dto';
import { Section } from '../models/section.model';
import { Observable, map } from 'rxjs';
import { Course } from '../models/course.model';

@Injectable({ providedIn: 'root' })
export class SectionsService {
  private http = inject(HttpClient);

  private baseUrl = '';

  getCourse(courseId: string): Observable<Course> {
    return this.http
      .get<{ success: boolean; data: Course }>(`${this.baseUrl}/courses/${courseId}`)
      .pipe(map((res) => res.data));
  }

  addSection(courseId: string, data: CreateSectionDto): Observable<Section> {
    return this.http
      .post<{ success: boolean; data: Section }>(`${this.baseUrl}/courses/${courseId}/sections`, data)
      .pipe(map((res) => res.data));
  }

  updateSection(courseId: string, sectionId: string, data: Partial<CreateSectionDto>): Observable<Section> {
    return this.http
      .patch<{ success: boolean; data: Section }>(`${this.baseUrl}/courses/${courseId}/sections/${sectionId}`, data)
      .pipe(map((res) => res.data));
  }

  deleteSection(courseId: string, sectionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}`
    );
  }
}