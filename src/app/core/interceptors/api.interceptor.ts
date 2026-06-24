import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // Only prepend base URL if the request is a relative path
  const url = req.url.startsWith('http') ? req.url : `${environment.apiUrl}${req.url}`;

  const cloned = req.clone({
    url,
    withCredentials: true,   // ← sends the jwt cookie with every request
  });

  return next(cloned);
};