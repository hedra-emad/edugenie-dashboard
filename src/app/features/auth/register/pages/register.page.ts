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

  // 1️⃣ قمنا بنقل الـ Validators هنا لتصبح معرفة مسبقاً قبل استخدامها بالأسفل
  passwordValidator = (control: AbstractControl): ValidationErrors | null => {
    const pwd: string = control.value || '';
    if (!pwd) return null;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const longEnough = pwd.length >= 10;
    const blacklist = [
      '123456', 'password', '123456789', 'qwerty', '12345678', '111111', '1234567', 'sunshine', 'iloveyou', 'princess',
      'admin', 'welcome', '666666', 'abc123', 'football', '123123', 'monkey', '654321'
    ];
    const isBlacklisted = blacklist.includes(pwd.toLowerCase());
    let score = 0;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    if (longEnough) score++;
    if (score < 4 || isBlacklisted) {
      return { weakPassword: true };
    }
    return null;
  };

  interestsValidator = (control: AbstractControl): ValidationErrors | null => {
    const arr = Array.isArray(control.value) ? control.value : [];
    if (!arr || arr.length < 1) {
      return { noInterest: true };
    }
    return null;
  };

  profileConsistencyValidator = (group: AbstractControl): ValidationErrors | null => {
    return null;
  };

  
  registerForm: FormGroup = this.fb.group({
    accountCreation: this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\u0600-\u06FF\s'-]+$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^([\p{L}\s'-]+)$/u)]],
      email: [
  '',
  [
    Validators.required,
     Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
  ]
],
      password: ['', [Validators.required, this.passwordValidator]],
      confirmPassword: ['', [Validators.required]],
      role: ['student', [Validators.required]],
      bio: [''],  
    }, { validators: this.passwordMatchValidator }),
    profileSetup: this.fb.group({
      level: ['', Validators.required],
      goal: ['', [Validators.required, Validators.minLength(10)]],
      interests: [[], this.interestsValidator]
    }, { validators: this.profileConsistencyValidator })
  });

  @HostListener('window:resize')
  onResize() {}

  ngOnInit() {
    this.onResize();
  }

  get accountCreation() { return this.registerForm.get('accountCreation') as FormGroup; }
  get profileSetup() { return this.registerForm.get('profileSetup') as FormGroup; }


  
  markGroupTouched(group: FormGroup) {
    Object.values(group.controls).forEach(ctrl => {
      ctrl.markAsTouched();
      ctrl.updateValueAndValidity();
    });
  }

  getPasswordStrength(): number {
  const pwd = this.accountCreation.get('password')?.value || '';
  if (!pwd) return 0;

  let strength = 0;

  if (pwd.length >= 10) strength++;
  if (/[A-Z]/.test(pwd)) strength++;
  if (/[a-z]/.test(pwd)) strength++;
  if (/[0-9]/.test(pwd)) strength++;
  if (/[^A-Za-z0-9]/.test(pwd)) strength++;

  return strength;
}

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;

  if (!password || !confirm) return null;

  return password === confirm ? null : { mismatch: true };
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

      setTimeout(() => {
        this.isSubmitting = false;

        // 👇 لو Instructor
        if (this.role === 'instructor') {
          console.log('Instructor Signup:', this.accountCreation.value);
          this.router.navigate(['/login']);
          return;
        }

        // 👇 لو Student
        this.currentStep = 2;

      }, 800);

    } else {
      this.accountCreation.markAllAsTouched();
    }
  } 
  else if (this.currentStep === 2) {
    this.onSubmit();
  }
}

  skipProfile() {
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

  get role() {
  return this.accountCreation.get('role')?.value;
}

}


