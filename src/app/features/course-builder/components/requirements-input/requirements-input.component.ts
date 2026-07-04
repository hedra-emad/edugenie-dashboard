import { Component, Input, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-requirements-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './requirements-input.component.html',
  styleUrl: './requirements-input.component.css'
})
export class RequirementsInputComponent {
  private fb = inject(FormBuilder);
  private ngZone = inject(NgZone);
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
    
    // Focus the new input after Angular's change detection completes
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const inputs = document.querySelectorAll('app-requirements-input input[type="text"]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    });
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
