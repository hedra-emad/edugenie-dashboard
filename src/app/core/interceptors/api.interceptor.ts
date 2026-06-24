import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const isExternal = req.url.startsWith('http');
  const url = isExternal ? req.url : `${environment.apiUrl}${req.url}`;

  const cloned = req.clone({
    url,
    withCredentials: !isExternal,   // ← only send the jwt cookie to our own API
  });

  return next(cloned);
};