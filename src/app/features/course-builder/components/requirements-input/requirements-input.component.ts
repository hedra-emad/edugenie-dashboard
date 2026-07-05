import { Component, Input, inject, NgZone, OnInit } from '@angular/core';
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
export class RequirementsInputComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ngZone = inject(NgZone);
  @Input({ required: true }) requirementsArray!: FormArray;

  ngOnInit() {
    // Only add first empty input if this is a brand new form (no requirements at all)
    // Don't re-add if user intentionally deleted all requirements
    if (this.requirementsArray.length === 0 && !this.hasUserDeletedAll()) {
      this.addRequirementToArray();
    }
  }

  private hasUserDeletedAll(): boolean {
    // Check if there's any indication in the form that user deliberately cleared requirements
    // If the form was populated from API and now is empty, don't add a new input
    return (this.requirementsArray as any)._userDeletedAll || false;
  }

  get requirements(): FormControl[] {
    return this.requirementsArray.controls as FormControl[];
  }

  addRequirement() {
    this.addRequirementToArray();
  }

  private addRequirementToArray() {
    const newControl = this.fb.control('', [
      Validators.required,
      Validators.pattern(/.*\S.*/)
    ]);
    
    this.requirementsArray.push(newControl);
    this.requirementsArray.markAsDirty();
    
    // Focus the new input after Angular's change detection completes
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const inputs = document.querySelectorAll('app-requirements-input textarea');
      const lastInput = inputs[inputs.length - 1] as HTMLTextAreaElement;
      if (lastInput) {
        lastInput.focus();
      }
    });
  }

  removeRequirement(index: number) {
    if (this.requirementsArray.length > 0) {
      this.requirementsArray.removeAt(index);
      this.requirementsArray.markAsDirty();
      
      // Mark that user deleted requirements
      if (this.requirementsArray.length === 0) {
        (this.requirementsArray as any)._userDeletedAll = true;
      }
    }
  }

  // Helper method to check if requirement should show error
  shouldShowRequirementError(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}
