import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-input.component.html',
  styleUrl: './auth-input.component.css'
})
export class AuthInputComponent {
  @Input({ required: true }) control!: AbstractControl | null;
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() id = '';

  get formControl(): FormControl {
    return this.control as FormControl;
  }
}
