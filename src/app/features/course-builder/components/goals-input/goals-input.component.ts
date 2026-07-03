import { Component, Input, inject, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
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
export class GoalsInputComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  @Input({ required: true }) goalsArray!: FormArray;

  editingIndex = signal<number | null>(null);
  @ViewChildren('goalInput') goalInputs!: QueryList<ElementRef>;

  get goals(): FormControl[] {
    return this.goalsArray.controls as FormControl[];
  }

  ngAfterViewInit() {
    // Watch for changes to editing index to auto-focus the input
    this.goalInputs.changes.subscribe(() => {
      setTimeout(() => {
        const index = this.editingIndex();
        if (index !== null && this.goalInputs.length > index) {
          const inputRef = this.goalInputs.toArray()[index];
          inputRef?.nativeElement?.focus();
        }
      }, 0);
    });
  }

  addGoal() {
    const newControl = this.fb.control('', [
      Validators.required,
      Validators.pattern(/.*\S.*/)
    ]);
    
    this.goalsArray.push(newControl);
    this.goalsArray.markAsDirty();
    
    // Auto-enter edit mode for the new goal
    const newIndex = this.goalsArray.length - 1;
    this.startEdit(newIndex);
  }

  removeGoal(index: number) {
    if (this.goalsArray.length > 0) {
      this.goalsArray.removeAt(index);
      this.goalsArray.markAsDirty();
      // Exit edit mode if we're removing the edited item
      if (this.editingIndex() === index) {
        this.editingIndex.set(null);
      }
    }
  }

  startEdit(index: number) {
    this.editingIndex.set(index);
    setTimeout(() => {
      const inputRef = this.goalInputs.toArray()[index];
      inputRef?.nativeElement?.focus();
    }, 0);
  }

  stopEdit() {
    this.editingIndex.set(null);
    const control = this.goalsArray.at(this.editingIndex() ?? 0);
    if (control) {
      control.markAsTouched();
    }
  }

  // Helper method to check if goal should show error
  shouldShowGoalError(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}
