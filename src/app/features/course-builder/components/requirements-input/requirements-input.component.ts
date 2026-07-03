import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-requirements-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './requirements-input.component.html',
  styleUrl: './requirements-input.component.css'
})
export class RequirementsInputComponent {
  private fb = inject(FormBuilder);
  @Input({ required: true }) requirementsArray!: FormArray;

  get requirements(): FormControl[] {
    return this.requirementsArray.controls as FormControl[];
  }

  addRequirement() {
    const newControl = this.fb.control('', [
      Validators.required,
      Validators.pattern(/.*\S.*/)
    ]);
    
    this.requirementsArray.push(newControl);
    this.requirementsArray.markAsDirty();
    
    // Focus the new input after a short delay
    setTimeout(() => {
      const inputs = document.querySelectorAll('app-requirements-input input[type="text"]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    }, 100);
  }

  removeRequirement(index: number) {
    if (this.requirementsArray.length > 0) {
      this.requirementsArray.removeAt(index);
      this.requirementsArray.markAsDirty();
    }
  }

  // Helper method to check if requirement should show error
  shouldShowRequirementError(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}
