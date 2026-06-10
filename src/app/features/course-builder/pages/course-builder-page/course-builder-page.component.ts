import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { CourseBasicInfoComponent } from '../course-basic-info/course-basic-info.component';
import { SectionBuilderComponent } from '../../pages/section-builder/section-builder.component';
import { PublishActionsComponent } from '../../components/publish-actions/publish-actions.component';
import { MatIconModule } from '@angular/material/icon';
import { CoursesService, CreateCoursePayload } from '../../../../core/services/courses';
import { Router } from '@angular/router';
import { CourseStatus } from '../../../../core/enums/course-status';
import { ActivatedRoute } from '@angular/router';
import { ViewChild } from '@angular/core';

// import { CourseBasicInfoComponent } from '../course-basic-info/course-basic-info.component';

@Component({
  selector: 'app-create-course-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CourseHeaderComponent,
    CourseBasicInfoComponent,
    SectionBuilderComponent,
    PublishActionsComponent
  ],
  templateUrl: './course-builder-page.component.html',
  styleUrl: './course-builder-page.component.css'
})

export class CourseBuilderPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private coursesService = inject(CoursesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  @ViewChild(CourseBasicInfoComponent)
  courseBasicInfo!: CourseBasicInfoComponent;

  courseForm!: FormGroup;

  hasRealChanges = signal(false);
  initialFormValue: any = null;


  draftStatus = signal<'draft' | 'published'>('draft');
  isSaving = signal(false);
  hasUnsavedChanges = signal(false);
  notificationMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  currentStep = signal(1);

  createdCourseId = signal<string | null>(null);


  nextStep() {
    if (this.currentStep() === 1) {
      const fieldsToValidate = [
        'title',
        'description',
        'price',
        'thumbnail',
        'level',
        'category'
      ];

      let isValid = true;

      fieldsToValidate.forEach(field => {
        const control = this.courseForm.get(field);

        control?.markAsTouched();

        if (control?.invalid) {
          isValid = false;
        }
      });

      if (!isValid) {
        this.showNotification(
          'Please complete the basic course information first.',
          'error'
        );
        return;
      }
    }

    this.currentStep.update(step => step + 1);
  }

  previousStep() {
    this.currentStep.update(step => step - 1);
  }

  onCourseCreated(courseId: string) {
    this.createdCourseId.set(courseId);

    this.currentStep.set(2);
  }

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

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.createdCourseId.set(id);

      this.coursesService.getCourseById(id).subscribe(course => {
        this.loadCourse(course);
      });
    }



    this.courseForm.valueChanges.subscribe(() => {
      const current = this.courseForm.getRawValue();

      if (!this.initialFormValue) return;

      this.hasRealChanges.set(
        JSON.stringify(current) !== JSON.stringify(this.initialFormValue)
      );
    });
  }

  loadCourse(course: any) {
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      price: course.price,
      thumbnail: course.thumbnail,
      level: course.level,
      category: course.categoryId,
    });

    this.setArray('goals', course.goals || []);
    this.setArray('requirements', course.requirements || []);

    setTimeout(() => {
      if (this.courseBasicInfo) {
        this.courseBasicInfo.thumbnailPreview.set(course.thumbnail);
        this.courseBasicInfo.hasThumbnail.set(true);
      }

      // ⭐ IMPORTANT: save initial state AFTER loading
      this.initialFormValue = this.courseForm.getRawValue();
    });
  }

  setGoals(goals: string[]) {
    const arr = this.courseForm.get('goals') as FormArray;
    arr.clear();

    goals.forEach(goal => {
      arr.push(this.fb.control(goal));
    });
  }

  setRequirements(reqs: string[]) {
    const arr = this.courseForm.get('requirements') as FormArray;
    arr.clear();

    reqs.forEach(req => {
      arr.push(this.fb.control(req));
    });
  }


  setArray(name: string, values: string[]) {
    const arr = this.courseForm.get(name) as FormArray;
    arr.clear();

    values.forEach(v => {
      arr.push(new FormControl(v));
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
