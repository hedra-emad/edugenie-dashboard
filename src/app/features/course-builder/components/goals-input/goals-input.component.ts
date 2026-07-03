import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-goals-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './goals-input.component.html',
  styleUrl: './goals-input.component.css'
})
export class GoalsInputComponent {
  private fb = inject(FormBuilder);
  @Input({ required: true }) goalsArray!: FormArray;

  get goals(): FormControl[] {
    return this.goalsArray.controls as FormControl[];
  }

  addGoal() {
    const newControl = this.fb.control('', [
      Validators.required,
      Validators.pattern(/.*\S.*/)
    ]);
    
    this.goalsArray.push(newControl);
    this.goalsArray.markAsDirty();
    
    // Focus the new input after a short delay
    setTimeout(() => {
      const inputs = document.querySelectorAll('app-goals-input input[type="text"]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    }, 100);
  }

  removeGoal(index: number) {
    if (this.goalsArray.length > 0) {
      this.goalsArray.removeAt(index);
      this.goalsArray.markAsDirty();
    }
  }

  // Helper method to check if goal should show error
  shouldShowGoalError(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}
