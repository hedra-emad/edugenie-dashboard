import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { LessonCardComponent } from '../lesson-card/lesson-card.component';
import { Router } from '@angular/router';
import { SectionsService } from '../../../../core/services/sections';

@Component({
  selector: 'app-section-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './section-card.component.html',
  styleUrl: './section-card.component.css'
})
export class SectionCardComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sectionsService = inject(SectionsService);

  // ================= Inputs =================
  @Input({ required: true }) sectionForm!: FormGroup;
  @Input() index = 0;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input() highlight = false;
  @Input() expanded = false;
  @Input() courseId!: string;

  // ================= Outputs =================
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();
  @Output() goToLessons = new EventEmitter<void>();
  @Output() sectionCreated = new EventEmitter<string>();

  // ================= UI State =================
  isSaving = false;
  isDeleting = false;

  // ================= Lifecycle =================
 ngOnChanges() {
  if (this.expanded) {
    setTimeout(() => {
      const panel = document.querySelector('.mat-expansion-panel.mat-expanded');
      panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  } else {
    const panel = document.querySelector('.mat-expanded');
    panel?.classList.remove('mat-expanded');
  }
}

  // ================= SAVE (CREATE / UPDATE) =================
  saveSection() {
    const form = this.sectionForm;

    const sectionId = form.get('id')?.value;

    const payload = {
      title: form.get('title')?.value,
      description: form.get('description')?.value,
      expectedOutcomes: this.expectedOutcomesArray.value,
      isBasicSection: form.get('isBasicSection')?.value
    };


    this.isSaving = true;

    const request = sectionId
      ? this.sectionsService.updateSection(this.courseId, sectionId, payload)
      : this.sectionsService.addSection(this.courseId, payload);

    request.subscribe({
      next: (res: any) => {
        this.isSaving = false;

        if (!sectionId) {

          const createdSection = res[res.length - 1];

          const incomingId = createdSection?._id;

          if (incomingId) {

            if (!form.contains('id')) {
              form.addControl('id', new FormControl(incomingId));
            } else {
              form.get('id')?.setValue(incomingId);
            }

            form.get('id')?.updateValueAndValidity();
          }
        }

        form.markAsPristine();
        form.updateValueAndValidity();
      },

      error: () => {
        this.isSaving = false;
      }
    });
  }

  // ================= DELETE =================
 deleteSection() {
  const sectionId = this.sectionForm.get('id')?.value;
  if (!sectionId) return;

  this.sectionForm.markAsPristine();
  this.sectionForm.markAsUntouched();

  this.isDeleting = true;

  this.sectionsService.deleteSection(this.courseId, sectionId)
    .subscribe({
      next: () => {
        this.isDeleting = false;

        // important: remove from UI AFTER backend success
        this.delete.emit(sectionId);
      },
      error: () => {
        this.isDeleting = false;
      }
    });
}

  // ================= NAVIGATION =================
  onGoToLessons(event: Event) {
    event.stopPropagation();

    const sectionId = this.sectionForm.get('id')?.value;
    if (!sectionId || !this.courseId) return;

    this.router.navigate([
      '/course-builder',
      this.courseId,
      'sections',
      sectionId,
      'lessons'
    ]);
  }

  // ================= OUTCOMES =================
  get expectedOutcomesArray(): FormArray {
    return this.sectionForm.get('expectedOutcomes') as FormArray ?? this.fb.array([]);
  }

  get outcomes(): FormControl[] {
    return this.expectedOutcomesArray.controls as FormControl[];
  }

  addOutcome() {
    console.log('ADD OUTCOME CLICKED');

    this.expectedOutcomesArray.push(
      this.fb.control('', Validators.required)
    );

    console.log(this.expectedOutcomesArray.value);
  }

  removeOutcome(index: number) {
    this.expectedOutcomesArray.removeAt(index);
    this.expectedOutcomesArray.markAsDirty();
  }

  // ================= GETTERS =================
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

  get isExistingSection(): boolean {
    return !!this.sectionForm.get('id')?.value;
  }

  // ================= LESSONS =================
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

  // ================= MOVES =================
  onMoveUp(event: Event) {
    event.stopPropagation();
    this.moveUp.emit();
  }

  onMoveDown(event: Event) {
    event.stopPropagation();
    this.moveDown.emit();
  }

  get totalSectionDuration(): number {
    const lessons = this.sectionForm.get('lessons')?.value || [];

    return lessons.reduce((sum: number, lesson: any) => {
      return sum + Number(lesson.videoDuration || 0);
    }, 0);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}