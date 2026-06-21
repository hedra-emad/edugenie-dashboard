
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

  private readonly apiBase = environment.apiUrl; // e.g. 'http://localhost:3000'

  // ─────────────────────────────────────────────────────────────
  // PRIVATE: request a signed signature from backend
  // ─────────────────────────────────────────────────────────────
  private getSignature(
    folder: string,
    context?: string
  ): Observable<SignatureResponse> {

    return this.http.post<SignatureResponse>(
      `${this.apiBase}/cloudinary/sign`,
      {
        folder,
        context
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
    resourceType: 'image' | 'video' = 'image',
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
    resourceType: 'image' | 'video' = 'video'
  ): Observable<any> {
    return this.deleteOldAsset(publicId, resourceType);
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: upload avatar image (signed)
  // No deletion needed for avatars — pass nothing
  // ─────────────────────────────────────────────────────────────

  private uploadPreset = 'edugenie_avatar';
  private cloudName = 'dxeoqi3kb';
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
  // ─────────────────────────────────────────────────────────────
  uploadVideo(
    file: File,
    courseId: string,
    sectionId: string,
  ): Observable<VideoUploadEvent> {
    const folder = `edugenie/courses/videos/${courseId}/sections/${sectionId}`;
    const context = `courseId=${courseId}|sectionId=${sectionId}`;

    return this.getSignature(folder, context).pipe(
      switchMap(({ signature, timestamp, apiKey, cloudName, raw_convert }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('api_key', apiKey);
        formData.append('context', context);
        formData.append('raw_convert', raw_convert);


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
}