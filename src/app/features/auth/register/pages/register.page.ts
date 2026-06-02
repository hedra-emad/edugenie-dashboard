import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
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
    SocialLoginComponent,
  ],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css',
})
export class RegisterPageComponent implements OnInit {
  fb = inject(FormBuilder);
  router = inject(Router);

  currentStep = 1;
  isSubmitting = false;
  isWatchMode = signal(false);

  //  Validators

  passwordValidator = (control: AbstractControl): ValidationErrors | null => {
    const pwd: string = control.value || '';
    if (!pwd) return null;

    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const longEnough = pwd.length >= 10;

    const blacklist = [
      '123456', 'password', '123456789', 'qwerty', '12345678',
      '111111', '1234567', 'sunshine', 'iloveyou', 'princess',
      'admin', 'welcome', '666666', 'abc123', 'football', '123123',
      'monkey', '654321',
    ];

    const isBlacklisted = blacklist.includes(pwd.toLowerCase());

    let score = 0;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    if (longEnough) score++;

    return score < 4 || isBlacklisted ? { weakPassword: true } : null;
  };

  interestsValidator = (control: AbstractControl): ValidationErrors | null => {
    const arr = Array.isArray(control.value) ? control.value : [];
    return arr.length < 1 ? { noInterest: true } : null;
  };

  passwordMatchValidator = (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!password || !confirm) return null;
    return password === confirm ? null : { mismatch: true };
  };

  //  Form 

  registerForm: FormGroup = this.fb.group({
    roleSelection: this.fb.group({
      role: ['student', Validators.required],
    }),
    accountInfo: this.fb.group(
      {
        firstName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.pattern(/^[a-zA-Z\u0600-\u06FF\s'-]+$/),
          ],
        ],
        lastName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.pattern(/^([\p{L}\s'-]+)$/u),
          ],
        ],
        email: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
          ],
        ],
        password: ['', [Validators.required, this.passwordValidator]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    ),
    profileSetup: this.fb.group({
      level: ['', Validators.required],
      goal: ['', [Validators.required, Validators.minLength(10)]],
      interests: [[], this.interestsValidator],
    }),
  });

  //  Computed Properties 

  get roleSelection(): FormGroup {
    return this.registerForm.get('roleSelection') as FormGroup;
  }

  get accountInfo(): FormGroup {
    return this.registerForm.get('accountInfo') as FormGroup;
  }

  get profileSetup(): FormGroup {
    return this.registerForm.get('profileSetup') as FormGroup;
  }

  get role(): 'student' | 'instructor' {
    return this.roleSelection.get('role')?.value ?? 'student';
  }

  /** Total steps depend on the selected role */
  get totalSteps(): number {
    return this.role === 'instructor' ? 2 : 3;
  }

  /** Progress percentage adapts to role */
  get progressPercent(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  //  Lifecycle

  @HostListener('window:resize')
  onResize(): void {}

  ngOnInit(): void {
    this.onResize();
  }

  //  Step Metadata 

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1: return 'Choose Your Role';
      case 2: return 'Account Information';
      case 3: return 'Profile Setup';
      default: return '';
    }
  }

  isStepInvalid(): boolean {
    switch (this.currentStep) {
      case 1: return this.roleSelection.invalid;
      case 2: return this.accountInfo.invalid;
      case 3: return this.profileSetup.invalid;
      default: return true;
    }
  }

  //  Navigation ──

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.roleSelection.invalid) {
        this.roleSelection.markAllAsTouched();
        return;
      }
      this.currentStep = 2;
      return;
    }

    if (this.currentStep === 2) {
      if (this.accountInfo.invalid) {
        this.accountInfo.markAllAsTouched();
        return;
      }

      this.isSubmitting = true;
      setTimeout(() => {
        this.isSubmitting = false;

        if (this.role === 'instructor') {
          // Instructor flow: account only → login
          console.log('Instructor registered:', this.accountInfo.value);
          this.router.navigate(['/login']);
          return;
        }

        // Student flow: continue to step 3
        this.currentStep = 3;
      }, 800);
      return;
    }

    if (this.currentStep === 3) {
      this.submitStudentProfile(true);
    }
  }

  /** Skip profile setup — submit account only, navigate to login */
  skipProfile(): void {
    console.log('Student registered (no profile):', this.accountInfo.value);
    this.router.navigate(['/login']);
  }

  /** Submit with full profile data */
  private submitStudentProfile(withProfile: boolean): void {
    if (withProfile && this.profileSetup.invalid) {
      this.profileSetup.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      console.log('Student registered:', {
        account: this.accountInfo.value,
        profile: withProfile ? this.profileSetup.value : null,
      });
      this.router.navigate(['/login']);
    }, 1000);
  }

  //  Password Helpers ──

  getPasswordStrength(): number {
    const pwd = this.accountInfo.get('password')?.value || '';
    if (!pwd) return 0;

    let strength = 0;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    return strength;
  }

  getPasswordStrengthText(): string {
    if (!this.accountInfo.get('password')?.value) return '';
    switch (this.getPasswordStrength()) {
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return '';
    }
  }

  getStrengthColor(index: number): string {
    const strength = this.getPasswordStrength();
    if (!this.accountInfo.get('password')?.value) return 'bg-gray-200';
    if (index >= strength) return 'bg-gray-200';
    if (strength === 1) return 'bg-error';
    if (strength === 2) return 'bg-warning';
    return 'bg-success';
  }

  //  Interests 

  availableInterests = ['AI & ML', 'Design', 'Business', 'Web Dev', 'Data Science'];

  toggleInterest(interest: string): void {
    const ctrl = this.profileSetup.get('interests');
    const current = (ctrl?.value || []) as string[];
    ctrl?.setValue(
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest]
    );
  }

  //  Tab Handler ─

  handleTabChange(tab: 'signin' | 'signup'): void {
    if (tab === 'signin') {
      this.router.navigate(['/login']);
    }
  }
}
