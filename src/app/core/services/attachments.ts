import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Attachment, CreateAttachmentPayload } from '../models/attachment.model';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private http = inject(HttpClient);
  private readonly baseUrl = ''; // intercepted by api.interceptor.ts

  /**
   * Build the correct attachment base URL based on which IDs are provided.
   * Mirrors the backend controller nesting logic.
   */
  private buildUrl(courseId: string, sectionId?: string, lessonId?: string): string {
    if (sectionId && lessonId) {
      return `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/attachments`;
    }
    if (sectionId) {
      return `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/attachments`;
    }
    return `${this.baseUrl}/courses/${courseId}/attachments`;
  }

  /**
   * List attachments for a course, section, or lesson.
   */
  list(
    courseId: string,
    sectionId?: string,
    lessonId?: string
  ): Observable<Attachment[]> {
    return this.http.get<any>(
      this.buildUrl(courseId, sectionId, lessonId),
      { withCredentials: true }
    ).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        if (res && res.success && Array.isArray(res.data)) return res.data;
        return [];
      })
    );
  }

  /**
   * Create a new attachment. The backend returns the Attachment object directly
   * (no { success, data } envelope unlike some other endpoints).
   */
  create(
    courseId: string,
    payload: CreateAttachmentPayload,
    sectionId?: string,
    lessonId?: string,
  ): Observable<Attachment> {
    return this.http.post<Attachment>(
      this.buildUrl(courseId, sectionId, lessonId),
      payload,
      { withCredentials: true },
    );
  }

  /**
   * List attachments for the instructor (own courses only).
   * Calls the .../attachments/manage route.
   */
  listForInstructor(
    courseId: string,
    sectionId?: string,
    lessonId?: string,
  ): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(
      `${this.buildUrl(courseId, sectionId, lessonId)}/manage`,
      { withCredentials: true },
    );
  }

  /**
   * Update an existing attachment (e.g., toggle isPublic).
   */
  update(attachmentId: string, payload: Partial<Attachment>): Observable<Attachment> {
    return this.http.patch<Attachment>(
      `${this.baseUrl}/attachments/${attachmentId}`,
      payload,
      { withCredentials: true },
    );
  }

  /**
   * Delete an attachment by its ID.
   */
  remove(attachmentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/attachments/${attachmentId}`,
      { withCredentials: true },
    );
  }
}
