import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout.component';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { AuthTabsComponent } from '../../../../shared/components/auth-tabs/auth-tabs.component';
import { AuthInputComponent } from '../../../../shared/components/auth-input/auth-input.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { AuthButtonComponent } from '../../../../shared/components/auth-button/auth-button.component';
import { AuthDividerComponent } from '../../../../shared/components/auth-divider/auth-divider.component';
import { AuthLogoComponent } from '../../../../shared/components/auth-logo/auth-logo.component';
import { RoleSelectorComponent } from '../../../../shared/components/role-selector/role-selector.component';
import { SocialLoginComponent } from '../../../../shared/components/social-login/social-login.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuthLayoutComponent,
    AuthCardComponent,
    AuthTabsComponent,
    AuthInputComponent,
    PasswordInputComponent,
    AuthButtonComponent,
    AuthDividerComponent,
    AuthLogoComponent,
    RoleSelectorComponent,
    SocialLoginComponent
  ],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css',
})
export class RegisterPageComponent implements OnInit {
  fb = inject(FormBuilder);
  router = inject(Router);

  currentStep = 1;
  totalSteps = 2;
  isSubmitting = false;
  isWatchMode = signal(false);

  @HostListener('window:resize')
  onResize() {
    const isWatch = window.innerWidth <= 360;
    this.isWatchMode.set(isWatch);

    if (this.registerForm) {
      const acc = this.accountCreation;
      if (isWatch) {
        acc.get('lastName')?.disable();
        acc.get('confirmPassword')?.disable();
        acc.get('role')?.disable();
      } else {
        acc.get('lastName')?.enable();
        acc.get('confirmPassword')?.enable();
        acc.get('role')?.enable();
      }
    }
  }

  ngOnInit() {
    this.onResize();
  }

  registerForm: FormGroup = this.fb.group({
    accountCreation: this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      role: ['student', [Validators.required]]
    }, { validators: this.passwordMatchValidator }),
    profileSetup: this.fb.group({
      level: [''],
      goal: [''],
      interests: [[]]
    })
  });

  get accountCreation() { return this.registerForm.get('accountCreation') as FormGroup; }
  get profileSetup() { return this.registerForm.get('profileSetup') as FormGroup; }

  passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    if (g.get('confirmPassword')?.disabled) return null;
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  availableInterests = ['AI & ML', 'Design', 'Business', 'Web Dev', 'Data Science'];

  toggleInterest(interest: string) {
    const interestsControl = this.profileSetup.get('interests');
    const current = (interestsControl?.value || []) as string[];
    if (current.includes(interest)) {
      interestsControl?.setValue(current.filter((i: string) => i !== interest));
    } else {
      interestsControl?.setValue([...current, interest]);
    }
  }

  getPasswordStrength(): number {
    const pwd = this.accountCreation.get('password')?.value || '';
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (!this.accountCreation.get('password')?.value) return '';
    switch (strength) {
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return '';
    }
  }

  getStrengthColor(index: number): string {
    const strength = this.getPasswordStrength();
    if (!this.accountCreation.get('password')?.value) return 'bg-gray-200';
    if (index >= strength) return 'bg-gray-200';
    if (strength === 1) return 'bg-error';
    if (strength === 2) return 'bg-warning';
    return 'bg-success';
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1: return 'Account Creation';
      case 2: return 'Profile Setup';
      default: return '';
    }
  }

  isStepInvalid(): boolean {
    switch (this.currentStep) {
      case 1: return this.accountCreation.invalid;
      case 2: return this.profileSetup.invalid;
      default: return true;
    }
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (this.accountCreation.valid) {
        this.isSubmitting = true;
        // Mock account creation API
        setTimeout(() => {
          console.log('Account Created successfully:', this.accountCreation.value);
          this.isSubmitting = false;
          if (this.isWatchMode()) {
            this.router.navigate(['/login']);
          } else {
            this.currentStep = 2;
          }
        }, 1200);
      } else {
        this.accountCreation.markAllAsTouched();
      }
    } else if (this.currentStep === 2) {
      this.onSubmit();
    }
  }

  skipProfile() {
    console.log('Profile setup skipped');
    this.router.navigate(['/login']);
  }

  onSubmit() {
    if (this.profileSetup.valid || this.currentStep === 2) {
      this.isSubmitting = true;
      setTimeout(() => {
        this.isSubmitting = false;
        console.log('Profile updated:', this.profileSetup.value);
        this.router.navigate(['/login']);
      }, 1000);
    }
  }

  handleTabChange(tab: 'signin' | 'signup') {
    if (tab === 'signin') {
      this.router.navigate(['/login']);
    }
  }
}
