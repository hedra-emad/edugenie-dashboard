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

  addSection(courseId: string, data: CreateSectionDto): Observable<Section[]> {
    return this.http
      .post<{ success: boolean; data: Section[] }>(`${this.baseUrl}/courses/${courseId}/sections`, data)
      .pipe(map((res) => res.data));
  }

  updateSection(courseId: string, sectionId: string, data: Partial<CreateSectionDto>): Observable<Section[]> {
    return this.http
      .patch<{ success: boolean; data: Section[] }>(`${this.baseUrl}/courses/${courseId}/sections/${sectionId}`, data)
      .pipe(map((res) => res.data));
  }

  deleteSection(courseId: string, sectionId: string): Observable<Section[]> {
    return this.http
      .delete<{ success: boolean; message: string; data: Section[] }>(
        `${this.baseUrl}/courses/${courseId}/sections/${sectionId}`
      )
      .pipe(map((res) => res.data));
  }

  reorderSections(courseId: string, sectionIds: string[]): Observable<Section[]> {
    return this.http.patch<Section[]>(
      `${this.baseUrl}/courses/${courseId}/sections/reorder`,
      { sectionIds }
    );
  }

  setPrice(courseId: string, sectionId: string, price: number | null): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/price`,
      { price }
    );
  }

  getPurchaseInfo(courseId: string, sectionId: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/purchase-info`
    );
  }


}