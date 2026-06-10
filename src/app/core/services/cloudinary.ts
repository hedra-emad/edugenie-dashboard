import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {

  private http = inject(HttpClient);

  private cloudName = 'dxeoqi3kb';
  private uploadPreset = 'edugenie_avatar';

  uploadImage(file: File | Blob) {
    const formData = new FormData();


    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return this.http.post<{ secure_url: string; public_id: string }>(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      formData
    );
  }

  uploadThumbnail(file: File) {
  const formData = new FormData();

  formData.append('file', file);

  // THIS MUST BE UPLOAD PRESET NAME
  formData.append('upload_preset', environment.cloudinary.uploadPreset);

  return this.http.post<{ secure_url: string; public_id: string }>(
    `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`,
    formData
  );
}

}