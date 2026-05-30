import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout.component';
import { AuthLogoComponent } from '../../../../shared/components/auth-logo/auth-logo.component';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { AuthTabsComponent } from '../../../../shared/components/auth-tabs/auth-tabs.component';
import { RoleSelectorComponent } from '../../../../shared/components/role-selector/role-selector.component';
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
    RoleSelectorComponent,
    AuthInputComponent,
    PasswordInputComponent,
    RememberMeComponent,
    AuthButtonComponent,
    AuthDividerComponent,
    SocialLoginComponent
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
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
