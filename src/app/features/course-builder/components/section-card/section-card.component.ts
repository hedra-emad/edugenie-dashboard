import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LessonCardComponent } from '../lesson-card/lesson-card.component';

@Component({
  selector: 'app-section-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    LessonCardComponent
  ],
  templateUrl: './section-card.component.html',
  styleUrl: './section-card.component.css'
})
export class SectionCardComponent {
  private fb = inject(FormBuilder);
  @Input({ required: true }) sectionForm!: FormGroup;
  @Input() index = 0;
  @Input() isFirst = false;
  @Input() isLast = false;

  @Output() delete = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  @Output() createSection = new EventEmitter<void>();

  onCreateSection(event: Event) {
    event.stopPropagation();
    this.createSection.emit();
  }

  get expectedOutcomesArray(): FormArray {
    return this.sectionForm.get('expectedOutcomes') as FormArray;
  }

  get outcomes(): FormControl[] {
    return this.expectedOutcomesArray.controls as FormControl[];
  }

  get lessonsArray(): FormArray {
    return this.sectionForm.get('lessons') as FormArray;
  }

  get lessons(): FormGroup[] {
    return this.lessonsArray.controls as FormGroup[];
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit();
  }

  onMoveUp(event: Event) {
    event.stopPropagation();
    this.moveUp.emit();
  }

  onMoveDown(event: Event) {
    event.stopPropagation();
    this.moveDown.emit();
  }

  // Outcomes Management
  addOutcome() {
    this.expectedOutcomesArray.push(this.fb.control('', Validators.required));
    this.expectedOutcomesArray.markAsDirty();
  }

  removeOutcome(index: number) {
    this.expectedOutcomesArray.removeAt(index);
    this.expectedOutcomesArray.markAsDirty();
  }

  // Lessons Management
  addLesson() {
    const lesson = this.fb.group({
      title: ['', Validators.required],
      videoFile: [null as string | null],
      uploadStatus: ['idle'],
      uploadProgress: [0]
    });
    this.lessonsArray.push(lesson);
    this.lessonsArray.markAsDirty();
  }

  deleteLesson(index: number) {
    this.lessonsArray.removeAt(index);
    this.lessonsArray.markAsDirty();
  }

  moveLessonUp(index: number) {
    if (index === 0) return;
    const control = this.lessonsArray.at(index);
    this.lessonsArray.removeAt(index);
    this.lessonsArray.insert(index - 1, control);
    this.lessonsArray.markAsDirty();
  }

  moveLessonDown(index: number) {
    if (index === this.lessonsArray.length - 1) return;
    const control = this.lessonsArray.at(index);
    this.lessonsArray.removeAt(index);
    this.lessonsArray.insert(index + 1, control);
    this.lessonsArray.markAsDirty();
  }
}
