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
    const { email, password, rememberMe } = this.loginForm.value;

    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    this.authService.login({ email, password, rememberMe: !!rememberMe }).subscribe({
      next: (res: LoginResponse) => {
        const role = res.data.user.role;

        // This portal is admin-only. Instructors sign in from the EduGenie app
        // (they reach the dashboard via SSO handoff) and students stay there —
        // so a non-admin who authenticates here is turned away and the session
        // the backend just minted is revoked.
        if (!ADMIN_ROLES.has(role)) {
          this.authService.endSessionSilently().subscribe({
            next: () => {
              this.isLoading.set(false);
              this.errorMessage.set(
                'This portal is for administrators only. Instructors and students should sign in through the EduGenie app.',
              );
            },
          });
          return;
        }

        this.isLoading.set(false);
        this.router.navigate([this.authService.getHomeRouteForRole(role)]);
      },

      error: (err) => {
        this.isLoading.set(false);
        const status = err?.status;
        const message = err?.message;

        if (status === 401) {
          this.errorMessage.set('Invalid email or password');
        } else if (status === 403 || message?.toLowerCase().includes('deactivated') || message?.toLowerCase().includes('deleted')) {
          this.errorMessage.set('This account has been deactivated or deleted. Please contact support.');
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
