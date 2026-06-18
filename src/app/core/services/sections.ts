import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SectionsService {
  private http = inject(HttpClient);

  private baseUrl = 'https://edugenie-api.vercel.app';

  getCourse(courseId: string) {
    return this.http.get(
      `${this.baseUrl}/courses/${courseId}`,
      { withCredentials: true }
    );
  }

  addSection(courseId: string, data: any) {
    return this.http.post(
      `${this.baseUrl}/courses/${courseId}/sections`,
      data,
      { withCredentials: true }
    );
  }

  updateSection(courseId: string, sectionId: string, data: any) {
    return this.http.patch(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}`,
      data,
      { withCredentials: true }
    );
  }

  deleteSection(courseId: string, sectionId: string) {
    return this.http.delete(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}`,
      { withCredentials: true }
    );
  }

  reorderSections(courseId: string, sectionIds: string[]) {
    return this.http.patch(
      `${this.baseUrl}/courses/${courseId}/sections/reorder`,
      { sectionIds },
      { withCredentials: true }
    );
  }


}