import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {

  private http = inject(HttpClient);

  private cloudName = 'dxeoqi3kb';
  private uploadPreset = 'edugenie_avatar';

  uploadImage(file: File) {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return this.http.post(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      formData
    );
  }
}