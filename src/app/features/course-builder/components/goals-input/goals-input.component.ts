import { Component, Input, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-goals-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './goals-input.component.html',
  styleUrl: './goals-input.component.css'
})
export class GoalsInputComponent {
  private fb = inject(FormBuilder);
  private ngZone = inject(NgZone);
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
    
    // Focus the new input after Angular's change detection completes
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const inputs = document.querySelectorAll('app-goals-input input[type="text"]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    });
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
