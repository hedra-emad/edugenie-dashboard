// src/app/features/auth/redeem/redeem.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-redeem',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;font-family:sans-serif">
      <ng-container *ngIf="!error; else errorTpl">
        <div style="width:32px;height:32px;border:3px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <p style="color:var(--color-text-secondary, #666)">Signing you in…</p>
      </ng-container>
      <ng-template #errorTpl>
        <p style="color:#c0392b">{{ error }}</p>
        <a href="/admin-login" style="color:inherit">Back to login</a>
      </ng-template>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `,
})
export class RedeemComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  error: string | null = null;

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');

    if (!code) {
      this.error = 'No authentication code provided.';
      return;
    }

    this.authService.redeemCode(code).subscribe({
      next: ({ userRole }) => {
        // redeemCode sets the jwt HttpOnly cookie via NestJS.
        // Now fetch the full profile to populate AuthService state.
        this.authService.getProfile().subscribe({
          next: () => {
            const destination = this.getDestination(userRole);
            this.router.navigate([destination]);
          },
          error: () => {
            this.error = 'Could not load your profile. Please try again.';
          },
        });
      },
      error: (err) => {
        console.error('Redeem error:', err);
        if (err?.status === 401) {
          this.error = 'This link has expired. Please log in again.';
        } else {
          this.error = 'Authentication failed. Please try again.';
        }
      },
    });
  }

  private getDestination(role: string): string {
    switch (role) {
      case 'instructor': return '/my-courses';
      case 'admin':
      case 'superadmin': return '/admin';
      default: return '/settings';
    }
  }
}