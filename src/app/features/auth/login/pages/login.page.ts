import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    SocialLoginComponent
  ],
  template: `
    <app-auth-layout>
      <app-auth-logo></app-auth-logo>
      
      <app-auth-card>
        <app-auth-tabs 
          [activeTab]="activeTab()" 
          (onTabChange)="setTab($event)">
        </app-auth-tabs>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          
          <app-role-selector formControlName="role"></app-role-selector>

          <app-auth-input 
            [control]="loginForm.controls['email']" 
            label="Email Address" 
            id="email" 
            type="email" 
            placeholder="name@example.com">
            <svg icon class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </app-auth-input>

          <app-password-input 
            [control]="loginForm.controls['password']" 
            label="Password" 
            id="password" 
            placeholder="••••••••">
          </app-password-input>

          <app-remember-me formControlName="rememberMe"></app-remember-me>

          <app-auth-button 
            type="submit" 
            [loading]="isLoading()" 
            [disabled]="loginForm.invalid && loginForm.touched">
            Sign In
          </app-auth-button>

        </form>

        <app-auth-divider>or continue with</app-auth-divider>

        <app-social-login 
          (onGoogle)="loginWithGoogle()" 
          (onGithub)="loginWithGithub()">
        </app-social-login>
        
      </app-auth-card>
    </app-auth-layout>
  `,
  styles: []
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  
  activeTab = signal<'signin' | 'signup'>('signin');
  isLoading = signal(false);

  loginForm: FormGroup = this.fb.group({
    role: ['student', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  setTab(tab: 'signin' | 'signup') {
    this.activeTab.set(tab);
    // Setup logic if changing to register
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      
      // Mock API call
      setTimeout(() => {
        console.log('Login Form Data:', this.loginForm.value);
        this.isLoading.set(false);
      }, 1500);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  loginWithGoogle() {
    console.log('Google login clicked');
  }

  loginWithGithub() {
    console.log('Github login clicked');
  }
}
