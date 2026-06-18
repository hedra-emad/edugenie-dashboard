import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);

  getCategories() {
    return this.http.get<any[]>(
      'https://edugenie-api.vercel.app/categories',
      { withCredentials: true }
    );
  }
}

