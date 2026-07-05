import { Component, Input, inject, NgZone, OnInit } from '@angular/core';
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
export class GoalsInputComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ngZone = inject(NgZone);
  @Input({ required: true }) goalsArray!: FormArray;

  ngOnInit() {
    // Only add first empty input if this is a brand new form (no goals at all)
    // Don't re-add if user intentionally deleted all goals
    if (this.goalsArray.length === 0 && !this.hasUserDeletedAll()) {
      this.addGoalToArray();
    }
  }

  private hasUserDeletedAll(): boolean {
    // Check if there's any indication in the form that user deliberately cleared goals
    // If the form was populated from API and now is empty, don't add a new input
    return (this.goalsArray as any)._userDeletedAll || false;
  }

  get goals(): FormControl[] {
    return this.goalsArray.controls as FormControl[];
  }

  addGoal() {
    this.addGoalToArray();
  }

  private addGoalToArray() {
    const newControl = this.fb.control('', [
      Validators.required,
      Validators.pattern(/.*\S.*/)
    ]);
    
    this.goalsArray.push(newControl);
    this.goalsArray.markAsDirty();
    
    // Focus the new input after Angular's change detection completes
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const inputs = document.querySelectorAll('app-goals-input textarea');
      const lastInput = inputs[inputs.length - 1] as HTMLTextAreaElement;
      if (lastInput) {
        lastInput.focus();
      }
    });
  }

  removeGoal(index: number) {
    if (this.goalsArray.length > 0) {
      this.goalsArray.removeAt(index);
      this.goalsArray.markAsDirty();
      
      // Mark that user deleted goals
      if (this.goalsArray.length === 0) {
        (this.goalsArray as any)._userDeletedAll = true;
      }
    }
  }

  // Helper method to check if goal should show error
  shouldShowGoalError(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}
