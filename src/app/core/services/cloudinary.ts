
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  raw_convert: string;
  notification_url?: string;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  duration?: number;
}

export interface VideoUploadEvent {
  progress?: number;                  // 0-100, present during upload
  response?: CloudinaryUploadResponse; // present only on final completion
}

@Injectable({
  providedIn: 'root',
})

export class CloudinaryService {
  private http = inject(HttpClient);

  private readonly apiBase = ''; // intercepted by api.interceptor.ts

  // ─────────────────────────────────────────────────────────────
  // PRIVATE: request a signed signature from backend
  // ─────────────────────────────────────────────────────────────
  private getSignature(
    folder: string,
    context?: string,
    transcribe?: boolean,
  ): Observable<SignatureResponse> {

    return this.http.post<SignatureResponse>(
      `${this.apiBase}/cloudinary/sign`,
      {
        folder,
        context,
        transcribe,
      },
      {
        withCredentials: true
      }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE: delete an old asset via backend (fire-and-forget safe)
  // ─────────────────────────────────────────────────────────────
  private deleteOldAsset(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Observable<any> {
    return this.http
      .delete(`${this.apiBase}/cloudinary/delete`, {
        body: { publicId, resourceType },
        withCredentials: true
      })
      .pipe(catchError(() => of(null))); // never block the upload flow
  }

  deleteAsset(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'video'
): Observable<any> {
    return this.deleteOldAsset(publicId, resourceType);
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: re-run transcription in place for an already-uploaded
  // lesson video (used by the "Regenerate transcript" action).
  // ─────────────────────────────────────────────────────────────
  retryTranscription(
    publicId: string,
    courseId: string,
    sectionId: string,
    lessonId: string,
  ): Observable<{ queued: boolean }> {
    return this.http.post<{ queued: boolean }>(
      `${this.apiBase}/cloudinary/trigger-transcription`,
      { publicId, courseId, sectionId, lessonId },
      { withCredentials: true },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: upload avatar image (signed)
  // No deletion needed for avatars — pass nothing
  // ─────────────────────────────────────────────────────────────

  private uploadPreset = 'edugenie_avatar';
  private cloudName = environment.cloudName;
  uploadImage(file: File | Blob) {
    const formData = new FormData();


    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return this.http.post<{ secure_url: string; public_id: string }>(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      formData
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: upload course thumbnail (signed)
  // Pass oldPublicId when replacing an existing thumbnail
  // ─────────────────────────────────────────────────────────────
  uploadThumbnail(
    file: File,
    courseId?: string | null,
    oldPublicId?: string | null,
  ): Observable<CloudinaryUploadResponse> {
    // courseId is unknown during initial creation → stage in 'pending' subfolder
    const folder = courseId
      ? `edugenie/courses/thumbnails/${courseId}`
      : 'edugenie/courses/thumbnails/pending';

    return this.getSignature(folder).pipe(
      switchMap(({ signature, timestamp, apiKey, cloudName, raw_convert }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('api_key', apiKey);
        // formData.append('raw_convert', raw_convert);


        return this.http
          .post<CloudinaryUploadResponse>(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            formData,
          )
          .pipe(
            switchMap((res) => {
              // Delete old thumbnail AFTER successful upload, then pass result through
              if (oldPublicId) {
                return this.deleteOldAsset(oldPublicId, 'image').pipe(
                  switchMap(() => of(res)),
                );
              }
              return of(res);
            }),
          );
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: upload lesson video (signed)
  // Videos are stored in the section folder:
  // edugenie/courses/videos/{courseId}/sections/{sectionId}
  //
  // Note: lessonId is optional. When provided, it's included in the
  // Cloudinary context for webhook reference. The new architecture
  // creates lessons AFTER upload completes, so this may be undefined.
  // ─────────────────────────────────────────────────────────────
  uploadVideo(
    file: File,
    courseId: string,
    sectionId: string,
    lessonId?: string,
  ): Observable<VideoUploadEvent> {
    const folder = `edugenie/courses/videos/${courseId}/sections/${sectionId}`;
    // Include lessonId in context if provided (helps webhook find the lesson)
    const context = lessonId
      ? `courseId=${courseId}|sectionId=${sectionId}|lessonId=${lessonId}`
      : `courseId=${courseId}|sectionId=${sectionId}`;

    // transcribe: true → backend signs raw_convert (google_speech) + notification_url
    // so the video is transcribed on THIS upload (no separate re-upload pass).
    return this.getSignature(folder, context, true).pipe(
      switchMap(({ signature, timestamp, apiKey, cloudName, raw_convert, notification_url }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('api_key', apiKey);
        formData.append('context', context);
        // Append the EXACT signed strings, or Cloudinary rejects the signature.
        if (raw_convert) formData.append('raw_convert', raw_convert);
        if (notification_url) formData.append('notification_url', notification_url);


        const req = new HttpRequest(
          'POST',
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          formData,
          { reportProgress: true }
        );

        return this.http.request<CloudinaryUploadResponse>(req).pipe(
          switchMap((event: HttpEvent<CloudinaryUploadResponse>) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const progress = Math.round((100 * event.loaded) / event.total);
              return of({ progress } as VideoUploadEvent);
            }
            if (event.type === HttpEventType.Response) {
              return of({ progress: 100, response: event.body as CloudinaryUploadResponse } as VideoUploadEvent);
            }
            // Ignore Sent, ResponseHeader, etc.
            return of({} as VideoUploadEvent);
          }),
        );
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: upload attachment file (signed, resource_type: auto)
  // Attachments are arbitrary documents (PDF, DOCX, ZIP, etc.)
  // so we use 'auto' which reliably accepts any file type.
  // ─────────────────────────────────────────────────────────────


  uploadAttachment(
    file: File,
    folder: string,
  ): Observable<{
    secure_url: string;
    public_id: string;
    bytes: number;
    format?: string;
    original_filename: string;
  }> {
    return this.getSignature(folder).pipe(
      switchMap(({ signature, timestamp, apiKey, cloudName }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('api_key', apiKey);

        return this.http.post<{
          secure_url: string;
          public_id: string;
          bytes: number;
          format?: string;
          original_filename: string;
        }>(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          formData,
        );
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: delete an auto-uploaded attachment asset
  // Cloudinary's destroy API uses 'raw' for non-image/non-video
  // files uploaded via resource_type 'auto'. Best-effort cleanup.
  // ─────────────────────────────────────────────────────────────
  deleteAttachmentAsset(publicId: string): Observable<any> {
    return this.deleteOldAsset(publicId, 'raw').pipe(
      catchError(() => of(null)),
    );
  }

  uploadPreviewVideo(
    file: File,
    resourceType: 'course' | 'section',
    ownerId: string,
    oldPublicId?: string | null,
  ): Observable<VideoUploadEvent> {
    const folder = `edugenie/courses/previews/${resourceType}/${ownerId}`;

    return this.getSignature(folder).pipe(
      switchMap(({ signature, timestamp, apiKey, cloudName }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('api_key', apiKey);

        const req = new HttpRequest(
          'POST',
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          formData,
          { reportProgress: true }
        );

        return this.http.request<CloudinaryUploadResponse>(req).pipe(
          switchMap((event: HttpEvent<CloudinaryUploadResponse>) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              return of({ progress: Math.round((100 * event.loaded) / event.total) } as VideoUploadEvent);
            }
            if (event.type === HttpEventType.Response) {
              return of({ progress: 100, response: event.body as CloudinaryUploadResponse } as VideoUploadEvent);
            }
            return of({} as VideoUploadEvent);
          }),
          switchMap((uploadEvent) => {
            // After completion, delete old asset if provided
            if (uploadEvent.response && oldPublicId) {
              return this.deleteOldAsset(oldPublicId, 'video').pipe(
                switchMap(() => of(uploadEvent))
              );
            }
            return of(uploadEvent);
          })
        );
      })
    );
  }
}