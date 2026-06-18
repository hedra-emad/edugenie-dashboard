import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LessonCardComponent } from '../../components/lesson-card/lesson-card.component';
import { SectionsService } from '../../../../core/services/sections';
import { LessonsService } from '../../../../core/services/lessons';
import { BackButtonComponent } from "../../components/shared/back-button/back-button";
// import { LessonCardComponent_1 as LessonCardComponent } from "../components/lesson-card/lesson-card.component";
import { ChangeDetectorRef } from '@angular/core';
@Component({
  selector: 'app-lessons-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    LessonCardComponent,
    BackButtonComponent
  ],
  templateUrl: './lesson-builder.html',
  styleUrl: './lesson-builder.css'
})
export class LessonBuilder implements OnInit {

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private sectionsService = inject(SectionsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private lessonsService = inject(LessonsService);

  courseId!: string;
  sectionId!: string;

  lessonsForm = this.fb.group({
    lessons: this.fb.array<FormGroup>([])
  });

  ngOnInit() {
    this.courseId = this.route.snapshot.parent?.paramMap.get('courseId')!;
    this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;


    this.loadLessons();
  }

  get lessonsArray(): FormArray<FormGroup> {
    return this.lessonsForm.get('lessons') as FormArray<FormGroup>;
  }

  onLessonCreated(event: { index: number; id: string }) {

    const lessonGroup =
      this.lessonsArray.at(event.index) as FormGroup;

    lessonGroup.patchValue({
      id: event.id
    });

    this.cdr.detectChanges();
  }

  get lessons(): FormGroup[] {
    return this.lessonsArray.controls as FormGroup[];
  }

  addLesson() {
    this.lessonsArray.push(
      this.fb.group({
        id: [null],
        title: ['', Validators.required],
        videoUrl: [''],
        videoPublicId: [''],
        videoDuration: [0],
        uploadStatus: ['idle'],
        expanded: [true]
      })
    );
  }

  onDeleted(index: number) {
    this.lessonsArray.removeAt(index);
  }

  loadLessons() {
    this.sectionsService.getCourse(this.courseId)
      .subscribe({
        next: (course: any) => {

          const section = course.sections.find(
            (s: any) => s._id === this.sectionId
          );

          const lessons = section?.lessons || [];

          this.lessonsArray.clear();

          lessons.forEach((lesson: any) => {
            this.lessonsArray.push(
              this.fb.group({
                id: [lesson._id],
                title: [lesson.title, Validators.required],
                videoUrl: [lesson.videoUrl || ''],
                videoPublicId: [lesson.videoPublicId || ''],
                videoDuration: [lesson.videoDuration || 0],
                uploadStatus: ['idle'],
                expanded: [false]
              })
            );
          });

        },
        error: (err) => {
          console.error('Failed to load course', err);
        }
      });
  }

  goBackToSections() {
    this.router.navigate(
      ['/course-builder', this.courseId, 'sections'],
      {
        queryParams: {
          highlight: this.sectionId,
          expand: this.sectionId
        }
      }
    );
  }


  moveUp(index: number) {
    if (index === 0) return;
    const arr = this.lessonsArray;
    const current = arr.at(index);
    const above = arr.at(index - 1);
    arr.setControl(index - 1, current);
    arr.setControl(index, above);
    arr.updateValueAndValidity();
    this.saveOrder(); // fire after swap
  }

  moveDown(index: number) {
    const arr = this.lessonsArray;
    if (index === arr.length - 1) return;
    const current = arr.at(index);
    const below = arr.at(index + 1);
    arr.setControl(index + 1, current);
    arr.setControl(index, below);
    arr.updateValueAndValidity();
    this.saveOrder();
  }

  private saveOrder() {
    const ids = this.lessonsArray.controls
      .map(c => c.get('id')?.value)
      .filter(Boolean); // skip unsaved lessons (no id yet)

    if (ids.length < 2) return; // nothing to reorder

    this.lessonsService.reorderLessons(this.courseId, this.sectionId, ids)
      .subscribe({ error: err => console.error('Reorder failed', err) });
  }

  trackByLesson(index: number, item: FormGroup) {
    return item.get('id')?.value || index;
  }

  get lessonsLength() {
    return this.lessonsArray.length;
  }


}