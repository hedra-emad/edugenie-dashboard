import { Component, Input, ElementRef, signal, inject, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { GoalsInputComponent } from '../../components/goals-input/goals-input.component';
import { RequirementsInputComponent } from '../../components/requirements-input/requirements-input.component';
import { Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../../../../core/services/courses';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { FormBuilder } from '@angular/forms';
import { CreateCoursePayload } from '../../../../core/models/course.model';
import { ActionBarComponent } from "../../components/shared/action-bar/action-bar.component";
import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CourseLevel } from '../../../../core/enums/course-level.enum';
import { ToastrService } from 'ngx-toastr';
import { CourseBuilderPageComponent } from '../course-builder-page/course-builder-page.component';
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';

@Component({
  selector: 'app-course-basic-info',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CategorySelectorComponent,
    GoalsInputComponent,
    RequirementsInputComponent,
    ActionBarComponent,
    AppLoader
  ],
  templateUrl: './course-basic-info.component.html',
  styleUrl: './course-basic-info.component.css'
})

export class CourseBasicInfoComponent {

  private coursesService = inject(CoursesService);
  router = inject(Router);
  private cloudinaryService = inject(CloudinaryService);
  isDragging = signal(false);
  private destroyRef = inject(DestroyRef);

  private fb = inject(FormBuilder);
  isSaving = signal(false);
  courseCreated = signal(false);
  @Output() continue = new EventEmitter<void>();

  isUploading = signal(false);
  hasThumbnail = signal(false);
  hasChanges = signal(false);
  selectedThumbnailFile: File | null = null;

  imageError: string | null = null;

  @Output() courseCreatedEvent = new EventEmitter<string>();
  thumbnailPreview = signal<string>('');
  openLevel = false;
  mode = signal<'create' | 'update'>('create');
  courseId: string | null = null;
  isLoading = signal(true);
  existingThumbnailPublicId: string | null = null;

  status = signal<'idle' | 'saving' | 'updating' | 'ready'>('idle');

  private route = inject(ActivatedRoute);
  initialValue: any = null;
  CourseLevel = CourseLevel;
  private toastr = inject(ToastrService);
  parent = inject(CourseBuilderPageComponent, { optional: true });

  constructor() {
    effect(() => {
      const course = this.parent?.courseData();
      if (course && this.mode() === 'update') {
        this.populateForm(course);
        this.isLoading.set(false);
      }
    });
  }

  courseForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    thumbnail: ['', Validators.required],


    level: [null as CourseLevel | null, Validators.required],

    category: new FormControl<string | null>(null, Validators.required),
    goals: this.fb.array([]),
    requirements: this.fb.array([])
  });

  ngOnInit() {
    const id =
      this.route.snapshot.paramMap.get('courseId') ||
      this.route.parent?.snapshot.paramMap.get('courseId');

    if (!id) {
      this.isLoading.set(false);
      return;
    }

    this.courseId = id;
    this.mode.set('update');

    this.listenToArraysChanges();
  }

  handleFile(file: File) {

    this.imageError = null;

    const maxSize = 2 * 1024 * 1024;

    // 1) VALIDATION FIRST
    if (file.size > maxSize) {
      this.imageError = 'Image must be less than 2MB';
      this.selectedThumbnailFile = null;
      this.hasThumbnail.set(false);

      this.courseForm.get('thumbnail')?.reset();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please upload a valid image';
      this.selectedThumbnailFile = null;
      this.hasThumbnail.set(false);

      this.courseForm.get('thumbnail')?.reset();
      return;
    }

    // 2) ONLY IF VALID → SET STATE
    this.selectedThumbnailFile = file;
    this.hasThumbnail.set(true);

    this.courseForm.get('thumbnail')?.setValue(file.name);
    this.courseForm.get('thumbnail')?.markAsDirty();
    this.courseForm.get('thumbnail')?.updateValueAndValidity();

    // 3) preview
    const reader = new FileReader();
    reader.onload = () => {
      this.thumbnailPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) return;

    this.handleFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);

    const file = event.dataTransfer?.files?.[0];

    if (!file) return;

    this.handleFile(file);
  }

  selectLevel(level: CourseLevel) {
    this.getControl('level').setValue(level);
    this.openLevel = false;
  }

  getControl(name: string): FormControl {
    return this.courseForm.get(name) as FormControl;
  }

  isInvalid(name: string) {
    const control = this.getControl(name);
    return control.touched && control.invalid;

  }

  isValid(name: string) {
    const control = this.getControl(name);
    return control.touched && control.valid;
  }

  private setBaseline() {
    this.initialValue = this.normalize(this.courseForm.getRawValue());
    this.hasChanges.set(false);

    this.courseForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const current = this.normalize(this.courseForm.getRawValue());

        this.hasChanges.set(
          JSON.stringify(current) !== JSON.stringify(this.initialValue)
        );
      });
  }

  private normalize(value: any) {
    return {
      ...value,
      goals: [...(value.goals || [])],
      requirements: [...(value.requirements || [])],
    };
  }

  populateForm(course: any) {
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      level: course.level,
      category:
        course.categoryId?._id ||
        course.categoryId?.id ||
        course.categoryId ||
        course.category?._id ||
        course.category?.id ||
        course.category
    });


    if (course.thumbnail) {
      this.thumbnailPreview.set(course.thumbnail);
      this.hasThumbnail.set(true);
    }

    this.setArray('goals', course.goals || []);
    this.setArray('requirements', course.requirements || []);

    setTimeout(() => {
      this.setBaseline();
    });
  }

  isButtonDisabled(): boolean {
    if (this.status() === 'saving' || this.status() === 'updating') {
      return true;
    }

    if (this.mode() === 'create') {
      // Find invalid controls
      const invalidControls = Object.keys(this.courseForm.controls).filter(key => {
        return this.courseForm.get(key)?.invalid;
      });
      if (invalidControls.length > 0) {
        // console.log('Invalid controls:', invalidControls);
      }
      if (!this.selectedThumbnailFile) {
        // console.log('Thumbnail file missing');
      }

      return this.courseForm.invalid || !this.selectedThumbnailFile;
    }

    if (this.mode() === 'update') {
      return this.courseForm.invalid;
    }

    return false;
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


  get goalsArray(): FormArray {
    return this.courseForm.get('goals') as FormArray;
  }

  get requirementsArray(): FormArray {
    return this.courseForm.get('requirements') as FormArray;
  }


  getButtonIcon(): string {

    if (this.mode() === 'create') {
      if (this.status() === 'saving') return 'hourglass_top';
      return 'add';
    }

    if (this.mode() === 'update') {
      if (this.status() === 'updating') return 'sync';

      if (this.hasChanges()) return 'save';

      return 'arrow_forward';
    }


    return 'arrow_forward';
  }


  getButtonLabel(): string {

    if (this.mode() === 'update') {

      if (this.status() === 'updating') return 'Updating...';

      // ⭐ ALWAYS show Continue if no baseline change detected yet
      if (!this.hasChanges()) return 'Continue';

      return 'Update';
    }

    if (this.mode() === 'create') {
      if (this.status() === 'saving') return 'Saving...';
      const invalidKeys = Object.keys(this.courseForm.controls).filter(k => this.courseForm.get(k)?.invalid);
      if (invalidKeys.length > 0) return `Missing: ${invalidKeys.join(', ')}`;
      if (!this.selectedThumbnailFile) return `Missing: thumbnail`;
      return 'Add Course';
    }

    return '';
  }

  onMainAction() {
    if (this.mode() === 'create') {
      this.createCourse();
      return;
    }

    if (this.mode() === 'update') {

      if (!this.hasChanges()) {
        this.router.navigate([
          '/course-builder',
          this.courseId,
          'sections'
        ]);
        return;
      }

      this.updateCourse();
    }
  }

  updateCourse() {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.status.set('updating');

    const formValue = this.courseForm.getRawValue() as {
      title: string;
      description: string;
      thumbnail: string;
      level: CourseLevel;
      category: string | { _id: string };
      goals: string[];
      requirements: string[];
    };
    const categoryId =
      typeof formValue.category === 'string'
        ? formValue.category
        : (formValue.category as any)?._id || (formValue.category as any)?.id;

    const payload: any = {
      title: formValue.title,
      description: formValue.description,
      level: formValue.level,
      categoryId: categoryId,
      goals: formValue.goals || [],
      requirements: formValue.requirements || [],
    };

    const upload$ = this.selectedThumbnailFile
      ? this.cloudinaryService.uploadThumbnail(
        this.selectedThumbnailFile,
        this.courseId!,
        this.existingThumbnailPublicId,
      )
      : null;


    if (upload$) {
      upload$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          payload.thumbnail = res.secure_url;
          payload.thumbnailPublicId = res.public_id;
          this.existingThumbnailPublicId = res.public_id;
          this.sendUpdate(payload);
        },
        error: (err) => {
          this.status.set('ready');
          console.error(err);
        }
      });
    } else {
      payload.thumbnail = formValue.thumbnail;
      this.sendUpdate(payload);
    }
  }

  sendUpdate(payload: any) {
    this.coursesService.updateCourse(this.courseId!, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.status.set('ready');
        this.hasChanges.set(false);

        this.initialValue = this.normalize(this.courseForm.getRawValue());

        this.courseForm.markAsPristine();
        this.toastr.success('Course updated successfully');

      },
      error: () => {
        this.isSaving.set(false);
        this.status.set('ready');
      }
    });
  }

  createCourse() {
    // 1) Validate form + thumbnail presence
    if (this.courseForm.invalid || !this.selectedThumbnailFile) {
      this.courseForm.markAllAsTouched();
      if (!this.selectedThumbnailFile) {
        this.imageError = 'Thumbnail is required';
      }
      return;
    }

    // 2) Set loading state
    this.status.set('saving');
    this.isSaving.set(true);

    const form = this.courseForm.getRawValue();

    // 3) Strict guard
    if (!form.title || !form.description || !form.level || !form.category) {
      this.courseForm.markAllAsTouched();
      this.status.set('idle');
      this.isSaving.set(false);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // PHASE 1: Stage thumbnail in pending folder to get a valid
    //          URL (backend requires non-empty URL to create course)
    // ─────────────────────────────────────────────────────────
    this.cloudinaryService
      .uploadThumbnail(this.selectedThumbnailFile!)   // no courseId → pending folder
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stagingRes) => {
          const stagingPublicId = stagingRes.public_id;

          // PHASE 2: Create course with the staging thumbnail URL
          const payload: CreateCoursePayload = {
            title: form.title!.trim(),
            description: form.description!.trim(),
            level: form.level as CourseLevel,
            categoryId: form.category as string,
            goals: (form.goals || []).map((g: any) =>
              typeof g === 'string' ? g : g?.value
            ),
            requirements: (form.requirements || []).map((r: any) =>
              typeof r === 'string' ? r : r?.value
            ),
            thumbnail: stagingRes.secure_url,
            thumbnailPublicId: stagingRes.public_id,
          };

          this.coursesService.createCourse(payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (course) => {
                this.courseId = course.id;

                // PHASE 3: Re-upload to correct courseId folder,
                //          delete staging asset, patch course with final URL
                this.cloudinaryService
                  .uploadThumbnail(
                    this.selectedThumbnailFile!,
                    this.courseId,          // now we have the real courseId
                    stagingPublicId,        // delete the pending asset after upload
                  )
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: (finalRes) => {
                      this.existingThumbnailPublicId = finalRes.public_id;

                      this.coursesService
                        .updateCourse(this.courseId!, {
                          thumbnail: finalRes.secure_url,
                          thumbnailPublicId: finalRes.public_id,
                        })
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe({
                          next: () => this.finalizeCourseCreation(course.id),
                          error: () => this.finalizeCourseCreation(course.id), // non-blocking
                        });
                    },
                    error: (err) => {
                      // Staging URL is still valid — course works, just folder is not ideal
                      console.error('PHASE 3 RE-UPLOAD ERROR:', err);
                      this.existingThumbnailPublicId = stagingPublicId;
                      this.finalizeCourseCreation(course.id);
                    }
                  });
              },
              error: (err) => {
                console.error('CREATE COURSE ERROR:', err);
                this.status.set('idle');
                this.isSaving.set(false);
              }
            });
        },
        error: (err) => {
          console.error('STAGING UPLOAD ERROR:', err);
          this.status.set('idle');
          this.isSaving.set(false);
          this.imageError = 'Failed to upload thumbnail';
        }
      });
  }

  /** Shared finalization after all phases of course creation succeed */
  private finalizeCourseCreation(courseId: string) {
    this.status.set('ready');
    this.isSaving.set(false);
    this.mode.set('update');
    this.initialValue = this.normalize(this.courseForm.getRawValue());
    this.hasChanges.set(false);
    this.setBaseline();
    this.courseCreatedEvent.emit(courseId);
    this.toastr.success('Course created successfully');
  }

  formatLevel(level: string): string {
    if (!level) return '';
    return level.charAt(0).toUpperCase() + level.slice(1);
  }

  get goalsInvalid(): boolean {
    return this.goalsArray.invalid;
  }

  get requirementsInvalid(): boolean {
    return this.requirementsArray.invalid;
  }

  private listenToArraysChanges() {
    this.goalsArray.statusChanges.subscribe(() => {
      this.courseForm.updateValueAndValidity({ emitEvent: false });
    });

    this.requirementsArray.statusChanges.subscribe(() => {
      this.courseForm.updateValueAndValidity({ emitEvent: false });
    });
  }

  get isGoalsInvalid(): boolean {
    return this.goalsArray.controls.some(c => c.invalid);
  }

  get isRequirementsInvalid(): boolean {
    return this.requirementsArray.controls.some(c => c.invalid);
  }

  get isFormWithArraysInvalid(): boolean {
    return (
      this.courseForm.invalid ||
      this.isGoalsInvalid ||
      this.isRequirementsInvalid ||
      !this.selectedThumbnailFile
    );
  }

  get isSubmitDisabled(): boolean {
    return (
      this.courseForm.invalid ||
      this.status() === 'saving' ||
      this.status() === 'updating'
    );
  }
}
