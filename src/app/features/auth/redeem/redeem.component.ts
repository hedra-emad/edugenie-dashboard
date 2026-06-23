import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user-profile.model';
import { switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-redeem',
  standalone: true,
  template: `
    <div class="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div class="flex flex-col items-center">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p class="mt-4 text-sm font-medium text-gray-600">Signing you in...</p>
      </div>
    </div>
  `,
  styles: []
})
export class RedeemComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (!code) {
        this.router.navigate(['/login']);
        return;
      }

      this.http.post<{ success: boolean; data: { userId: string; userRole: UserRole } }>('/auth/redeem-code', { code })
        .pipe(
          switchMap((res) => {
            if (res.success && res.data) {
              // Cookie is now set — fetch full profile to populate auth state
              // before the guard checks isAuthenticated()
              return this.authService.getProfile();
            }
            return of(null);
          }),
          catchError(() => {
            this.router.navigate(['/login'], { queryParams: { error: 'session_expired' } });
            return of(null);
          })
        )
        .subscribe((profileRes) => {
          if (profileRes && profileRes.success && profileRes.data) {
            const homeRoute = this.authService.getHomeRouteForRole(profileRes.data.role as UserRole);
            this.router.navigate([homeRoute]);
          } else if (profileRes !== null) {
            // redeem succeeded but profile fetch failed
            this.router.navigate(['/login'], { queryParams: { error: 'session_expired' } });
          }
        });
    });
  }
}
