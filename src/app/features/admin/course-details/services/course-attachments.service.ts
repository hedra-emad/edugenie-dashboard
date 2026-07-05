import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Attachment {
  id: string;
  parentType: 'course' | 'section' | 'lesson';
  courseId: string;
  sectionId?: string;
  lessonId?: string;
  title: string;
  originalFilename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

type AttachmentCache = Record<string, Attachment[]>;

@Injectable({ providedIn: 'root' })
export class CourseAttachmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/courses';

  /** Keyed by a cache key — avoids re-fetching on accordion re-open */
  private cache: AttachmentCache = {};

  // ── Public helpers ──────────────────────────────────────────────────────

  getCourseAttachments(courseId: string): Observable<Attachment[]> {
    return of([]);
  }

  getSectionAttachments(courseId: string, sectionId: string): Observable<Attachment[]> {
    return of([]);
  }

  getLessonAttachments(courseId: string, sectionId: string, lessonId: string): Observable<Attachment[]> {
    const key = `lesson:${lessonId}`;
    if (this.cache[key]) return of(this.cache[key]);
    return this.http
      .get<any>(
        `${this.base}/${courseId}/sections/${sectionId}/lessons/${lessonId}/attachments`,
        { withCredentials: true }
      )
      .pipe(
        map(res => this.extract(res)),
        map(list => { this.cache[key] = list; return list; }),
        catchError(() => of([]))
      );
  }

  /** Invalidate cache for a course (call after mutations) */
  clearCache(courseId: string): void {
    Object.keys(this.cache).forEach(k => {
      if (k.includes(courseId)) delete this.cache[k];
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────
  private extract(res: any): Attachment[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.attachments)) return res.attachments;
    return [];
  }
}
