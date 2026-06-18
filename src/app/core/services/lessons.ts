import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class LessonsService {

  private http = inject(HttpClient);

  private baseUrl = 'https://edugenie-api.vercel.app';

  addLesson(courseId: string, sectionId: string, body: any) {
    return this.http.post(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons`,
      body,
      { withCredentials: true }
    );
  }

  updateLesson(courseId: string, sectionId: string, lessonId: string, body: any) {
    return this.http.patch(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
      body,
      { withCredentials: true }
    );
  }

  deleteLesson(courseId: string, sectionId: string, lessonId: string) {
    return this.http.delete(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
      { withCredentials: true }
    );
  }

  reorderLessons(courseId: string, sectionId: string, lessonIds: string[]) {
    return this.http.patch(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
      { lessonIds },
      { withCredentials: true }
    );
  }
}