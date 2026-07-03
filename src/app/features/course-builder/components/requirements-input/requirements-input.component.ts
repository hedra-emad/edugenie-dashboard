import { Component, Input, inject, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
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
export class RequirementsInputComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  @Input({ required: true }) requirementsArray!: FormArray;

  editingIndex = signal<number | null>(null);
  @ViewChildren('requirementInput') requirementInputs!: QueryList<ElementRef>;

  get requirements(): FormControl[] {
    return this.requirementsArray.controls as FormControl[];
  }

  ngAfterViewInit() {
    // Watch for changes to editing index to auto-focus the input
    this.requirementInputs.changes.subscribe(() => {
      setTimeout(() => {
        const index = this.editingIndex();
        if (index !== null && this.requirementInputs.length > index) {
          const inputRef = this.requirementInputs.toArray()[index];
          inputRef?.nativeElement?.focus();
        }
      }, 0);
    });
  }

  addRequirement() {
    const newControl = this.fb.control('', [
      Validators.required,
      Validators.pattern(/.*\S.*/)
    ]);
    
    this.requirementsArray.push(newControl);
    this.requirementsArray.markAsDirty();
    
    // Auto-enter edit mode for the new requirement
    const newIndex = this.requirementsArray.length - 1;
    this.startEdit(newIndex);
  }

  removeRequirement(index: number) {
    if (this.requirementsArray.length > 0) {
      this.requirementsArray.removeAt(index);
      this.requirementsArray.markAsDirty();
      // Exit edit mode if we're removing the edited item
      if (this.editingIndex() === index) {
        this.editingIndex.set(null);
      }
    }
  }

  startEdit(index: number) {
    this.editingIndex.set(index);
    setTimeout(() => {
      const inputRef = this.requirementInputs.toArray()[index];
      inputRef?.nativeElement?.focus();
    }, 0);
  }

  stopEdit() {
    this.editingIndex.set(null);
    const control = this.requirementsArray.at(this.editingIndex() ?? 0);
    if (control) {
      control.markAsTouched();
    }
  }

  // Helper method to check if requirement should show error
  shouldShowRequirementError(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}
