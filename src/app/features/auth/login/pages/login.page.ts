import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout.component';
import { AuthLogoComponent } from '../../../../shared/components/auth-logo/auth-logo.component';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { AuthInputComponent } from '../../../../shared/components/auth-input/auth-input.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { RememberMeComponent } from '../../../../shared/components/remember-me/remember-me.component';
import { AuthButtonComponent } from '../../../../shared/components/auth-button/auth-button.component';
import { AuthDividerComponent } from '../../../../shared/components/auth-divider/auth-divider.component';
import { SocialLoginComponent } from '../../../../shared/components/social-login/social-login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginResponse } from '../../../../core/models/user-profile.model';
import { environment } from '../../../../../environments/environment';
/** Roles that are allowed to access the Admin Panel */
const ADMIN_ROLES = new Set(['admin', 'superadmin']);

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuthLayoutComponent,
    AuthLogoComponent,
    AuthCardComponent,
    AuthInputComponent,
    PasswordInputComponent,
    RememberMeComponent,
    AuthButtonComponent,
    AuthDividerComponent,
    SocialLoginComponent,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPageComponent implements OnInit {
  errorMessage = signal<string | null>(null);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal(false);
  isWatchMode = signal(false);

  @HostListener('window:resize')
  onResize() {
    this.isWatchMode.set(window.innerWidth <= 360);
  }

  ngOnInit() {
    this.onResize();
    this.route.queryParams.subscribe((params) => {
      if (params['error']) {
        if (params['error'] === 'invalid_token') {
          this.errorMessage.set('Invalid or missing authentication token.');
        } else if (params['error'] === 'auth_failed') {
          this.errorMessage.set('Authentication failed. Please log in again.');
        } else {
          this.errorMessage.set('An error occurred during authentication.');
        }
      }
    });
  }

  loginForm: FormGroup = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  onSubmit() {
    this.errorMessage.set(null);
    const { email, password } = this.loginForm.value;

    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    this.authService.login({ email, password }).subscribe({
      next: (res: LoginResponse) => {
        this.isLoading.set(false);
        const role = res.data.user.role;

        // Block non-admin roles immediately — clear any stored session and stay on this page
        if (!ADMIN_ROLES.has(role)) {
          this.authService.clearCurrentUser();

          this.errorMessage.set(
            'Students and instructors should sign in through the EduGenie website.'
          );

          setTimeout(() => {
            window.location.href = `${environment.studentAppUrl}/login`;
          }, 1500);

          return;
        }

        // Admin / SuperAdmin — continue exactly as before
        const homeRoute = this.authService.getHomeRouteForRole(role);
        this.router.navigate([homeRoute]);
      },

      error: (err) => {
        this.isLoading.set(false);
        const status = err?.status;

        if (status === 401) {
          this.errorMessage.set('Invalid email or password');
        } else if (status === 429) {
          this.errorMessage.set('Too many login attempts. Please try again in 15 minutes.');
        } else if (status === 0) {
          this.errorMessage.set('Network error. Please check your connection');
        } else {
          this.errorMessage.set('Something went wrong. Please try again later');
        }
      },
    });
  }

  loginWithGoogle() { }
  loginWithGithub() { }
}
