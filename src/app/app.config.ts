import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { NotificationsService } from './core/services/notifications';

function initializeAuth(authService: AuthService, notificationsService: NotificationsService) {
  return async () => {
    try {
      await firstValueFrom(authService.initializeAuth());
      // On a normal page refresh: initializeAuth() fetches /users/profile with
      // the existing cookie → setCurrentUser() → currentUserSignal is populated.
      //
      // On the redeem handoff path: initializeAuth()'s GET was sent before the
      // cookie existed (401). RedeemComponent.getProfile() already called
      // setCurrentUser() and connectPusher(). The guard in connectPusher()
      // (connectedUserId check) prevents a duplicate connection here.
      const user = authService.currentUserSignal();
      if (user?.id) {
        notificationsService.connectPusher(user.id);
      }
    } catch {}
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Order matters: cacheInterceptor keys on the clean relative URL and can
    // serve a cached/in-flight GET before apiInterceptor prefixes + hits network.
    provideHttpClient(withInterceptors([cacheInterceptor, apiInterceptor, authErrorInterceptor])),
    provideAnimations(),
    provideToastr({
      positionClass: 'toast-bottom-left',
      preventDuplicates: true,
      maxOpened: 3,
      autoDismiss: true,
      timeOut: 4000,
      extendedTimeOut: 1000,
      progressBar: true,
      progressAnimation: 'increasing',
      enableHtml: false,
      closeButton: false,
      tapToDismiss: true,
      toastClass: 'ngx-toastr slide-in-left',
      titleClass: 'toast-title',
      messageClass: 'toast-message',
    }),
    // NOTE: chart.js is intentionally NOT registered here. It is registered
    // inside the lazy analytics chunk (instructor-analytics.page.ts) so all of
    // chart.js stays out of the initial bundle.
    {
  provide: APP_INITIALIZER,
  useFactory: initializeAuth,
  deps: [AuthService, NotificationsService],
  multi: true,
},
  ],
};
