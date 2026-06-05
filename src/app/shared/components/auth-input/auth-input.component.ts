import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-input.component.html',
})
export class AuthInputComponent {
  @Input({ required: true }) control!: AbstractControl | null;
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() id = '';
  @Input() showSuccessWhenValid = false;

  @Input() errorMessages: Record<string, string> = {};

  Object = Object;

  get formControl(): FormControl {
    return this.control as FormControl;
  }
  getErrorMessage(errorKey: string): string {
  return (
    this.errorMessages[errorKey] ||
    {
      required: `${this.label} is require`,
      minlength: 'Minimum length not met',
      pattern: 'Invalid format',
      email: 'Invalid email address',
    }[errorKey] ||
    'Invalid value'
  );
}
}