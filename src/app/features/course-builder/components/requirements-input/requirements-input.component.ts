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
    this.requirementsArray.push(this.fb.control('', Validators.required));
    this.requirementsArray.markAsDirty();
  }

  removeRequirement(index: number) {
    this.requirementsArray.removeAt(index);
    this.requirementsArray.markAsDirty();
  }
}
