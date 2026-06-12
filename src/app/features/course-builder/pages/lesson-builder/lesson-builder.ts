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

  courseId!: string;
  sectionId!: string;

  lessonsForm = this.fb.group({
    lessons: this.fb.array<FormGroup>([])
  });

  ngOnInit() {
    this.courseId = this.route.snapshot.parent?.paramMap.get('courseId')!;
    this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;

    console.log('courseId', this.courseId);
    console.log('sectionId', this.sectionId);

    this.loadLessons();
  }

  get lessonsArray(): FormArray<FormGroup> {
    return this.lessonsForm.get('lessons') as FormArray<FormGroup>;
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
        uploadStatus: ['idle']
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
                uploadStatus: ['idle']
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
      ['/course-builder', this.courseId, 'curriculum'],
      {
        queryParams: {
          highlight: this.sectionId
        }
      }
    );
  }


  moveUp(index: number) {
    if (index === 0) return;

    const control = this.lessonsArray.at(index);
    this.lessonsArray.removeAt(index);
    this.lessonsArray.insert(index - 1, control);
  }

  moveDown(index: number) {
    if (index === this.lessonsArray.length - 1) return;

    const control = this.lessonsArray.at(index);
    this.lessonsArray.removeAt(index);
    this.lessonsArray.insert(index + 1, control);
  }
}