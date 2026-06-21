import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { apiInterceptor } from './core/interceptors/api.interceptor';

function initializeAuth(authService: AuthService) {
  return async () => {
    try {
      await firstValueFrom(authService.initializeAuth());
    } catch {
      // Auth init failure must never abort Angular bootstrap.
      // AuthService.initializeAuth() already handles errors internally,
      // but guard here as a safety net against EmptyError / network errors.
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
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
    provideCharts(withDefaultRegisterables()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
