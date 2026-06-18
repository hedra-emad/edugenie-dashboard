// import { Injectable, inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { environment } from '../../../environments/environment'

// @Injectable({
//   providedIn: 'root'
// })
// export class CloudinaryService {

//   private http = inject(HttpClient);

//   private cloudName = 'dxeoqi3kb';
//   private uploadPreset = 'edugenie_avatar';

// uploadImage(file: File | Blob) {
//   const formData = new FormData();


//   formData.append('file', file);
//   formData.append('upload_preset', this.uploadPreset);

//   return this.http.post<{ secure_url: string; public_id: string }>(
//     `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
//     formData
//   );
// }

//   uploadThumbnail(file: File) {
//     const formData = new FormData();

//     formData.append('file', file);

//     // THIS MUST BE UPLOAD PRESET NAME
//     formData.append('upload_preset', environment.thumbnailUploadPreset);

//     return this.http.post<{ secure_url: string; public_id: string }>(
//       `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
//       formData
//     );
//   }

//   uploadVideo(file: File) {
//     console.log('upload preset =', environment.lessonUploadPreset);

//     const formData = new FormData();

//     formData.append('file', file);
//     formData.append('upload_preset', environment.lessonUploadPreset);

//     return this.http.post<any>(
//       `https://api.cloudinary.com/v1_1/${this.cloudName}/video/upload`,
//       formData
//     );
//   }

// }


import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  duration?: number;
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
    oldPublicId?: string | null,
  ): Observable<CloudinaryUploadResponse> {
    const folder = 'edugenie/courses/thumbnails';

    return this.getSignature(folder).pipe(
      switchMap(({ signature, timestamp, apiKey, cloudName }) => {
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
  // Folder path must match backend webhook parser exactly:
  // courses/{courseId}/sections/{sectionId}/lessons/{lessonId}
  // ─────────────────────────────────────────────────────────────
  uploadVideo(
    file: File,
    courseId: string,
    sectionId: string,
    lessonId: string,
  ): Observable<CloudinaryUploadResponse> {
    const folder = 'edugenie/courses/videos';

    const context =
      `courseId=${courseId}|sectionId=${sectionId}|lessonId=${lessonId}`;

    return this.getSignature(folder, context).pipe(
      switchMap(({ signature, timestamp, apiKey, cloudName }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('api_key', apiKey);

        formData.append('context', `courseId=${courseId}|sectionId=${sectionId}|lessonId=${lessonId}`);

        return this.http.post<CloudinaryUploadResponse>(
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          formData,
        );
      }),
    );
  }
}