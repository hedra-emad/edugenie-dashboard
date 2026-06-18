import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout.component';
import { AuthLogoComponent } from '../../../../shared/components/auth-logo/auth-logo.component';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { AuthTabsComponent } from '../../../../shared/components/auth-tabs/auth-tabs.component';
import { AuthInputComponent } from '../../../../shared/components/auth-input/auth-input.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { RememberMeComponent } from '../../../../shared/components/remember-me/remember-me.component';
import { AuthButtonComponent } from '../../../../shared/components/auth-button/auth-button.component';
import { AuthDividerComponent } from '../../../../shared/components/auth-divider/auth-divider.component';
import { SocialLoginComponent } from '../../../../shared/components/social-login/social-login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginResponse } from '../../../../core/models/user-profile.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuthLayoutComponent,
    AuthLogoComponent,
    AuthCardComponent,
    AuthTabsComponent,
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

  activeTab = signal<'signin' | 'signup'>('signin');
  isLoading = signal(false);
  isWatchMode = signal(false);

  @HostListener('window:resize')
  onResize() {
    this.isWatchMode.set(window.innerWidth <= 360);
  }

  ngOnInit() {
    this.onResize();
  }

  private router = inject(Router);

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

  setTab(tab: 'signin' | 'signup') {
    this.activeTab.set(tab);

    if (tab === 'signup') {
      this.router.navigate(['/register']);
    }
  }

  onSubmit() {
    this.errorMessage.set(null);
    const { email, password, rememberMe } = this.loginForm.value;
    if (this.loginForm.valid) {
      // console.log(this.loginForm.value);
      this.isLoading.set(true);

      this.authService.login({
  email,
  password,
})
        .subscribe({
        next: (res: LoginResponse) => {
          this.isLoading.set(false);
          const homeRoute = this.authService.getHomeRouteForRole(res.data.user.role);
          this.router.navigate([homeRoute]);
        },

          error: (err) => {
          console.error('Login error:', err);

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
        }
        });
    } else {
      this.loginForm.markAllAsTouched();
    }

    
  }

  loginWithGoogle() {
    // console.log('Google login clicked');
  }

  loginWithGithub() {
    // console.log('Github login clicked');
  }
}
