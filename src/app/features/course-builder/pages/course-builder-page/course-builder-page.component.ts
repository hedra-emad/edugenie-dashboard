import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { CourseBasicInfoComponent } from '../course-basic-info/course-basic-info.component';
import { CurriculumBuilderComponent } from '../../components/curriculum-builder/curriculum-builder.component';
import { PublishActionsComponent } from '../../components/publish-actions/publish-actions.component';
import { MatIconModule } from '@angular/material/icon';
import { CoursesService, CreateCoursePayload } from '../../../../core/services/courses';
import { Router } from '@angular/router';
import { CourseStatus } from '../../../../core/enums/course-status';

@Component({
  selector: 'app-create-course-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CourseHeaderComponent,
    CourseBasicInfoComponent,
    CurriculumBuilderComponent,
    PublishActionsComponent
  ],
  templateUrl: './course-builder-page.component.html',
  styleUrl: './course-builder-page.component.css'
})
export class CourseBuilderPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private coursesService = inject(CoursesService);
  private router = inject(Router);

  courseForm!: FormGroup;
  draftStatus = signal<'draft' | 'published'>('draft');
  isSaving = signal(false);
  hasUnsavedChanges = signal(false);
  notificationMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  ngOnInit() {
  this.courseForm = this.fb.group({
  title: ['', [Validators.required, Validators.minLength(5)]],
  description: ['', [Validators.required, Validators.minLength(20)]],
  price: [null, [Validators.required, Validators.min(0)]],
  thumbnail: [''],
  level: ['', Validators.required],
  category: ['', Validators.required],
  goals: this.fb.array([]),
  requirements: this.fb.array([]),
  sections: this.fb.array([]),
  });

  this.courseForm.valueChanges.subscribe(() => {
    this.hasUnsavedChanges.set(this.courseForm.dirty);
  });
}


  saveDraft() {
    this.isSaving.set(true);
    this.notificationMessage.set(null);

    // Simulate network save
    setTimeout(() => {
      this.isSaving.set(false);
      this.courseForm.markAsPristine();
      this.hasUnsavedChanges.set(false);
      this.draftStatus.set('draft');
      this.showNotification('Draft saved successfully!', 'success');
    }, 1200);
  }

  publishCourse() {
    if (this.courseForm.invalid) {
      this.showNotification('Please fill out all required fields before publishing.', 'error');
      return;
    }

    this.isSaving.set(true);
    this.notificationMessage.set(null);

    // Simulate network publish
    setTimeout(() => {
      this.isSaving.set(false);
      this.courseForm.markAsPristine();
      this.hasUnsavedChanges.set(false);
      this.draftStatus.set('published');
      this.showNotification('Course published successfully!', 'success');
    }, 1200);
  }

  private showNotification(text: string, type: 'success' | 'error') {
    this.notificationMessage.set({ text, type });
    setTimeout(() => {
      this.notificationMessage.set(null);
    }, 4000);
  }
}
