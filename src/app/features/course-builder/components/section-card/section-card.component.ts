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
  @Input() highlight: boolean = false;
  @Input() expanded = false;

  @Output() delete = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  @Output() createSection = new EventEmitter<void>();
  @Output() goToLessons = new EventEmitter<string>();

  onCreateSection(event: Event) {
    event.stopPropagation();
    this.createSection.emit();
  }

  ngOnChanges() {
    if (this.expanded) {
      setTimeout(() => {
        const panel = document.querySelector('.mat-expansion-panel.mat-expanded');
        panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  get expectedOutcomesArray(): FormArray {
    return this.sectionForm.get('expectedOutcomes') as FormArray;
  }

  get outcomes(): FormControl[] {
    return this.expectedOutcomesArray.controls as FormControl[];
  }

  get titleControl() {
    return this.sectionForm.get('title');
  }

  get descriptionControl() {
    return this.sectionForm.get('description');
  }

  get lessonsArray(): FormArray {
    return this.sectionForm.get('lessons') as FormArray;
  }

  get lessons(): FormGroup[] {
    return this.lessonsArray.controls as FormGroup[];
  }

  onGoToLessons(event: Event) {
    event.stopPropagation();

    const id = this.sectionForm.get('id')?.value;
    this.goToLessons.emit(id);
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

    if (this.outcomes.length >= 20) {
      return;
    }

    this.expectedOutcomesArray.push(
      this.fb.control('', Validators.required)
    );
  }

  removeOutcome(index: number) {
    this.expectedOutcomesArray.removeAt(index);
    this.expectedOutcomesArray.markAsDirty();
  }

  get isExistingSection(): boolean {
    return !!this.sectionForm.get('id')?.value;
  }

  get isSaving(): boolean {
    return this.sectionForm.get('isSaving')?.value ?? false;
  }

  get isDeleting(): boolean {
    return this.sectionForm.get('isDeleting')?.value ?? false;
  }
  // Lessons Management
  addLesson() {
    const lessonGroup = this.fb.group({
      id: [null],
      title: ['', Validators.required],

      videoUrl: [''],
      videoPublicId: [''],
      videoDuration: [0],

      uploadStatus: ['idle']
    });

    this.lessonsArray.push(lessonGroup);
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
