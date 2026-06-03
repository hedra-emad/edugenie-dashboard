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
import { ViewChild, ElementRef } from '@angular/core';

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

  @ViewChild('levelSelect') levelSelectRef!: ElementRef;

@HostListener('document:click', ['$event'])
handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (!this.levelSelectRef?.nativeElement.contains(target)) {
    this.openLevel = false;
  }
}

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

    return score < 3 || isBlacklisted ? { weakPassword: true } : null;
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
            Validators.pattern(/^[\p{L}\s'-]+$/u),
          ],
        ],
        lastName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.pattern(/^[\p{L}\s'-]+$/u),
          ],
        ],
        email: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
          ],
        ],
      }
    ),
    securityInfo: this.fb.group(
      {
        password: ['', [Validators.required, this.passwordValidator]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    ),
    profileSetup: this.fb.group({
      level: [''],
      interests: [[]],
    }),
  });

  //  Computed Properties 

  get roleSelection(): FormGroup {
    return this.registerForm.get('roleSelection') as FormGroup;
  }

  get accountInfo(): FormGroup {
    return this.registerForm.get('accountInfo') as FormGroup;
  }

  get securityInfo(): FormGroup {
    return this.registerForm.get('securityInfo') as FormGroup;
  }

  get profileSetup(): FormGroup {
    return this.registerForm.get('profileSetup') as FormGroup;
  }

  get isProfileEmpty(): boolean {
    const val = this.profileSetup.value;
    const levelEmpty = !val.level;
    const interestsEmpty = !val.interests || val.interests.length === 0;
    return levelEmpty && interestsEmpty;
  }

  get isProfileComplete(): boolean {
    return this.profileSetup.valid;
  }

  get isProfilePartial(): boolean {
    return !this.isProfileEmpty && !this.isProfileComplete;
  }

  get role(): 'student' | 'instructor' {
    return this.roleSelection.get('role')?.value ?? 'student';
  }

  /** Total steps depend on the selected role */
  get totalSteps(): number {
    return this.role === 'instructor' ? 3 : 4;
  }

  /** Progress percentage adapts to role */
  get progressPercent(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  openLevel = false;
selectedLevel = '';

selectLevel(level: string) {
  this.selectedLevel = level;
  this.profileSetup.get('level')?.setValue(level);
  this.openLevel = false;
}

  //  Lifecycle

  @HostListener('window:resize')
  onResize(): void {}

  ngOnInit(): void {
    this.onResize();

    this.profileSetup.valueChanges.subscribe(() => {
      if (this.isProfilePartial) {
        this.profileSetup.markAllAsTouched();
      } else if (this.isProfileEmpty) {
        this.profileSetup.markAsUntouched();
      }
    });
  }

  //  Step Metadata 

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1: return 'Choose Your Role';
      case 2: return 'Account Information';
      case 3: return 'Security Information';
      case 4: return 'Profile Setup';
      default: return '';
    }
  }

  isStepInvalid(): boolean {
    switch (this.currentStep) {
      case 1: return this.roleSelection.invalid;
      case 2: return this.accountInfo.invalid;
      case 3: return this.securityInfo.invalid;
      case 4: return this.profileSetup.invalid;
      default: return true;
    }
  }

  //  Navigation ──

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

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
      this.currentStep = 3;
      return;
    }

    if (this.currentStep === 3) {
      if (this.securityInfo.invalid) {
        this.securityInfo.markAllAsTouched();
        return;
      }

      this.isSubmitting = true;
      setTimeout(() => {
        this.isSubmitting = false;

        if (this.role === 'instructor') {
          // Instructor flow: register here
          console.log('Instructor registered:', { ...this.accountInfo.value, ...this.securityInfo.value });
          this.router.navigate(['/login']);
          return;
        }

        // Student flow: continue to step 4
        this.currentStep = 4;
      }, 800);
      return;
    }

    if (this.currentStep === 4) {
      if (this.isProfileEmpty) {
        this.skipProfile();
      } else if (this.isProfileComplete) {
        this.submitStudentProfile(true);
      }
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
        security: this.securityInfo.value,
        profile: withProfile ? this.profileSetup.value : null,
      });
      this.router.navigate(['/login']);
    }, 1000);
  }

  //  Password Helpers ──

  getPasswordStrength(): number {
    const pwd = this.securityInfo.get('password')?.value || '';
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
    if (!this.securityInfo.get('password')?.value) return '';
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
  const hasValue = !!this.securityInfo.get('password')?.value;

  if (!hasValue) return 'bg-gray-200';

  // empty bars
  if (index >= strength) return 'bg-gray-200';

  // choose color by total strength level
  if (strength <= 1) return 'bg-red-500';              // Weak
  if (strength === 2) return 'bg-[#ff8800]';          // Fair
  if (strength === 3) return 'bg-[#ffc300]';           // Good
  return 'bg-green-500';                                // Strong
}

getStrengthTextColor(): string {
  const strength = this.getPasswordStrength();
  const hasValue = !!this.securityInfo.get('password')?.value;

  if (!hasValue) return 'text-gray-400';

  if (strength <= 1) return 'text-red-500';     // Weak
  if (strength === 2) return 'text-[#ff8800]';  // Fair
  if (strength === 3) return 'text-[#ffc300]';  // Good
  return 'text-green-500';                      // Strong
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
