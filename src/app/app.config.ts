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
  return () => firstValueFrom(authService.initializeAuth());
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
