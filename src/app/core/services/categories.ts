import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);

  getCategories() {
    return this.http.get<{ success: boolean; data: any[] }>('/categories').pipe(map(res => res.data));
  }
}

