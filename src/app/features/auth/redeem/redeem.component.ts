import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      const code = params['code'];
      if (!code) {
        this.router.navigate(['/login']);
        return;
      }

      try {
        const result = await this.authService.redeemCode(code).toPromise();
        if (result) {
          // Force auth state refresh before navigation
          await this.authService.initializeAuth().toPromise();
          // Now navigate — auth guard will see authenticated user
          const route = this.authService.getHomeRouteForRole(result.userRole);
          this.router.navigate([route]);
        }
      } catch (error) {
        this.router.navigate(['/login'], { queryParams: { error: 'session_expired' } });
      }
    });
  }
}
