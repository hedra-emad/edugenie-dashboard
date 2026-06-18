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
    this.goalsArray.push(
      this.fb.control('', [
        Validators.required,
        Validators.pattern(/.*\S.*/)
      ])
    );

    this.goalsArray.markAsDirty();
  }

  removeGoal(index: number) {
    this.goalsArray.removeAt(index);
    this.goalsArray.markAsDirty();
  }
}
