import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const isCloudinary = req.url.includes('api.cloudinary.com');
  const isAbsolute   = req.url.startsWith('http');

  const apiReq = isCloudinary
    ? req
    : req.clone({
        url: isAbsolute ? req.url : `${environment.apiUrl}${req.url.startsWith('/') ? '' : '/'}${req.url}`,
        withCredentials: true,
      });

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          router.navigate(['/login']);
          break;
        case 403:
          router.navigate(['/login']);
          break;
        case 500:
          console.error('Server error:', error);
          break;
        case 0:
          console.error('Network error — no connection');
          break;
      }
      return throwError(() => error);
    })
  );
};
