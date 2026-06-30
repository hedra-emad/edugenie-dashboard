import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Attachment, CreateAttachmentPayload } from '../models/attachment.model';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private http = inject(HttpClient);
  private readonly baseUrl = ''; // intercepted by api.interceptor.ts

  /**
   * Build the attachment base URL for a section.
   * Mirrors the backend controller nesting logic.
   */
  private buildUrl(courseId: string, sectionId: string): string {
    return `${this.baseUrl}/courses/${courseId}/sections/${sectionId}/attachments`;
  }

  /**
   * Create a new attachment. The backend returns the Attachment object directly
   * (no { success, data } envelope unlike some other endpoints).
   */
  create(
    courseId: string,
    payload: CreateAttachmentPayload,
    sectionId: string,
  ): Observable<Attachment> {
    return this.http.post<Attachment>(
      this.buildUrl(courseId, sectionId),
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
    sectionId: string,
  ): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(
      `${this.buildUrl(courseId, sectionId)}/manage`,
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