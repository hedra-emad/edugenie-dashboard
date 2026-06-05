import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-input.component.html',
  styleUrl: './password-input.component.css'
})
export class PasswordInputComponent {
  @Input({ required: true }) control!: AbstractControl | null;
  @Input() label = 'Password';
  @Input() placeholder = '••••••••';
  @Input() id = 'password';
  @Input() showSuccessWhenValid = false;

  showPassword = signal(false);

  get formControl(): FormControl {
    return this.control as FormControl;
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }
}
