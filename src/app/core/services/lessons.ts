import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateLessonDto } from '../models/dto/create-lesson.dto';
import { Lesson } from '../models/lesson.model';
import { Observable, map, mergeMap, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TranscriptionStatus {
  videoReady: boolean;
  transcriptReady: boolean;
  transcript: string | null;
}

@Injectable({ providedIn: 'root' })
export class LessonsService {

  private http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;

  addLesson(courseId: string, sectionId: string, body: CreateLessonDto): Observable<any> {
    const forceFail = true;
    if (forceFail) {
      return throwError(() => new Error('Simulated DB failure'));   // ← returns immediately, http.post() below never runs
    }
    return this.http.post(`${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons`, body);
  }

  updateLesson(courseId: string, sectionId: string, lessonId: string, body: Partial<CreateLessonDto>): Observable<any> {
    return this.http
      .patch<{ success: boolean; data: any }>(`${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, body)
      .pipe(map((res) => res.data || res));
  }

  deleteLesson(courseId: string, sectionId: string, lessonId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`
    );
  }

  reorderLessons(courseId: string, sectionId: string, lessonIds: string[]): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
      { lessonIds }
    );
  }

  getTranscriptionStatus(courseId: string, sectionId: string, lessonId: string): Observable<TranscriptionStatus> {
    return this.http.get<TranscriptionStatus>(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/transcription-status`
    );
  }
}