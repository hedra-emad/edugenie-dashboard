import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateLessonDto } from '../models/dto/create-lesson.dto';
import { Lesson } from '../models/lesson.model';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LessonsService {

  private http = inject(HttpClient);

  private baseUrl = '';

  addLesson(courseId: string, sectionId: string, body: CreateLessonDto): Observable<Lesson> {
    return this.http
      .post<{ success: boolean; data: Lesson }>(`${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons`, body)
      .pipe(map((res) => res.data));
  }

  updateLesson(courseId: string, sectionId: string, lessonId: string, body: Partial<CreateLessonDto>): Observable<Lesson> {
    return this.http
      .patch<{ success: boolean; data: Lesson }>(`${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, body)
      .pipe(map((res) => res.data));
  }

  deleteLesson(courseId: string, sectionId: string, lessonId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`
    );
  }
}