import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-callback.page.html',
  styleUrl: './auth-callback.page.css',
})
export class AuthCallbackPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      if (!token) {
        this.router.navigate(['/login'], { queryParams: { error: 'invalid_token' } });
        return;
      }

      this.authService.verifyExchangeToken(token).subscribe({
        next: (res) => {
          const homeRoute = this.authService.getHomeRouteForRole(res.data.user.role);

          if (this.authService.isExternalRedirect(homeRoute)) {
            const exchangeToken = res.data.exchangeToken;
            if (exchangeToken) {
              window.location.href = `${this.authService.getStudentAppRedirectUrl()}/auth-callback?token=${exchangeToken}`;
            } else {
              window.location.href = this.authService.getStudentAppRedirectUrl();
            }
            return;
          }

          this.router.navigate([homeRoute]);
        },
        error: (err) => {
          console.error('Auth callback error:', err);
          this.router.navigate(['/login'], { queryParams: { error: 'auth_failed' } });
        },
      });
    });
  }
}
