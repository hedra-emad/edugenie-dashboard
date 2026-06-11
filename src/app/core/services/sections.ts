import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SectionsService {
  private http = inject(HttpClient);

  private baseUrl = 'https://edugenie-api.vercel.app/courses';

  addSection(courseId: string, data: any) {
    return this.http.post(
      `${this.baseUrl}/${courseId}/sections`,
      data,
      { withCredentials: true }
    );
  }



  updateSection(
    courseId: string,
    sectionId: string,
    data: any
  ) {
    return this.http.patch(
      `${this.baseUrl}/${courseId}/sections/${sectionId}`,
      data,
      { withCredentials: true }
    );
  }

  deleteSection(courseId: string, sectionId: string) {
    return this.http.delete(
      `${this.baseUrl}/${courseId}/sections/${sectionId}`,
      { withCredentials: true }
    );
  }
}