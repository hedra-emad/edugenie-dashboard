import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { CourseBasicInfoComponent } from '../../components/course-basic-info/course-basic-info.component';
import { CurriculumBuilderComponent } from '../../components/curriculum-builder/curriculum-builder.component';
import { PublishActionsComponent } from '../../components/publish-actions/publish-actions.component';
import { MatIconModule } from '@angular/material/icon';

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
  templateUrl: './create-course-page.component.html',
  styleUrl: './create-course-page.component.css'
})
export class CreateCoursePageComponent implements OnInit {
  private fb = inject(FormBuilder);

  courseForm!: FormGroup;
  draftStatus = signal<'Draft' | 'Published'>('Draft');
  isSaving = signal(false);
  hasUnsavedChanges = signal(false);
  notificationMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  ngOnInit() {
    this.initForm();
    this.prepopulateForm();

    // Subscribe to form value/status changes to update dirty state
    this.courseForm.valueChanges.subscribe(() => {
      this.hasUnsavedChanges.set(this.courseForm.dirty);
    });
  }

  private initForm() {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      categories: [[] as string[], Validators.required],
      level: ['Beginner', Validators.required],
      price: [null as number | null, [Validators.required, Validators.min(0)]],
      thumbnail: [null as string | null],
      goals: this.fb.array([]),
      requirements: this.fb.array([]),
      sections: this.fb.array([])
    });
  }

  private prepopulateForm() {
    // Basic fields
    this.courseForm.patchValue({
      title: 'Angular 20 Core Concepts',
      description: 'Master standalone components, reactive signals, custom directives, and modern web application architectural patterns using Angular 20.',
      categories: ['Web Development', 'Machine Learning'],
      level: 'Intermediate',
      price: 99.99,
      thumbnail: null
    });

    // Prepopulate Goals
    const goalsArray = this.courseForm.get('goals') as FormArray;
    ['Understand modern Angular standalone application architecture',
     'Write reactive application states using Angular Signals',
     'Implement responsive Tailwind components'
    ].forEach(goal => goalsArray.push(this.fb.control(goal, Validators.required)));

    // Prepopulate Requirements
    const reqArray = this.courseForm.get('requirements') as FormArray;
    ['Basic understanding of TypeScript and CSS',
     'NodeJS installed on your development machine'
    ].forEach(req => reqArray.push(this.fb.control(req, Validators.required)));

    // Prepopulate Sections & Lessons
    const sectionsArray = this.courseForm.get('sections') as FormArray;

    // Section 1
    const sec1 = this.fb.group({
      title: ['Getting Started with Standalone', Validators.required],
      description: ['Learn the core philosophy behind Angular standalone components and configure your first project.'],
      isBasicSection: [true],
      expectedOutcomes: this.fb.array([
        this.fb.control('Set up a new Angular 20 workspace from scratch', Validators.required),
        this.fb.control('Migrate a legacy NgModules application to standalones', Validators.required)
      ]),
      lessons: this.fb.array([
        this.fb.group({
          title: ['Introduction to Standalone Components', Validators.required],
          videoFile: ['01_intro_standalone.mp4'],
          uploadStatus: ['success'],
          uploadProgress: [100]
        }),
        this.fb.group({
          title: ['Configuring App Routing without NgModules', Validators.required],
          videoFile: [null as string | null],
          uploadStatus: ['idle'],
          uploadProgress: [0]
        })
      ])
    });

    // Section 2
    const sec2 = this.fb.group({
      title: ['Advanced Reactive Features', Validators.required],
      description: ['Dive deep into modern signals, computed values, and reactive form flows.'],
      isBasicSection: [false],
      expectedOutcomes: this.fb.array([
        this.fb.control('Replace traditional RxJS behavior with clean signals', Validators.required),
        this.fb.control('Handle side-effects inside components using effects', Validators.required)
      ]),
      lessons: this.fb.array([
        this.fb.group({
          title: ['What are Angular Signals?', Validators.required],
          videoFile: ['02_signals_basics.mp4'],
          uploadStatus: ['success'],
          uploadProgress: [100]
        })
      ])
    });

    sectionsArray.push(sec1);
    sectionsArray.push(sec2);

    // Reset dirty state after prepopulation
    this.courseForm.markAsPristine();
    this.hasUnsavedChanges.set(false);
  }

  saveDraft() {
    this.isSaving.set(true);
    this.notificationMessage.set(null);

    // Simulate network save
    setTimeout(() => {
      this.isSaving.set(false);
      this.courseForm.markAsPristine();
      this.hasUnsavedChanges.set(false);
      this.draftStatus.set('Draft');
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
      this.draftStatus.set('Published');
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
