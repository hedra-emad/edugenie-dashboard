import { Component, Input, ElementRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { GoalsInputComponent } from '../../components/goals-input/goals-input.component';
import { RequirementsInputComponent } from '../../components/requirements-input/requirements-input.component';
import { Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../../../../core/services/courses';
import { CourseStatus } from '../../../../core/enums/course-status';
import { environment } from '../../../../../environments/environment';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { FormBuilder } from '@angular/forms';
import { Course } from '../../../../core/models/course.model';
import { CourseBuilderModel } from '../../models/course-builder.model';
import { ActionBarComponent } from "../../components/shared/action-bar/action-bar.component";
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
    ActionBarComponent
  ],
  templateUrl: './course-basic-info.component.html',
  styleUrl: './course-basic-info.component.css'
})


export class CourseBasicInfoComponent {

  private coursesService = inject(CoursesService);
  private router = inject(Router);
  private cloudinaryService = inject(CloudinaryService);
  isDragging = signal(false);

  private fb = inject(FormBuilder);
  isSaving = signal(false);
  courseCreated = signal(false);
  @Output() continue = new EventEmitter<void>();

  isUploading = signal(false);
  hasThumbnail = signal(false);
  hasChanges = signal(false);
  private initialized = false;
  selectedThumbnailFile: File | null = null;

  imageError: string | null = null;

  @Output() courseCreatedEvent = new EventEmitter<string>();
  thumbnailPreview = signal<string>('');
  openLevel = false;
  mode = signal<'create' | 'update'>('create');
  courseId: string | null = null;

  status = signal<'idle' | 'saving' | 'updating' | 'ready'>('idle');

  private route = inject(ActivatedRoute);
  initialValue: any = null;


  courseForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    price: [0, [Validators.required, Validators.min(0)]],
    thumbnail: [''],
    level: ['', Validators.required],
    category: ['', Validators.required],
    goals: this.fb.array([]),
    requirements: this.fb.array([])
  });

  ngOnInit() {
    const id =
      this.route.snapshot.paramMap.get('courseId') ||
      this.route.parent?.snapshot.paramMap.get('courseId');

    if (!id) {
      console.warn('No courseId found → create mode');
      return;
    }

    this.courseId = id;
    this.mode.set('update');

    this.loadCourse(this.courseId);
  }

  ngOnChanges() {
    if (this.courseId) {
      this.mode.set('update');
      this.status.set('ready');
    }

    if (this.courseForm && !this.initialValue) {
      this.initialValue = this.courseForm.getRawValue();

      this.courseForm.valueChanges.subscribe(() => {
        const current = this.courseForm.getRawValue();

        this.hasChanges.set(
          JSON.stringify(current) !== JSON.stringify(this.initialValue)
        );
      });
    }
  }

  initBaseline() {
    this.initialValue = this.courseForm.getRawValue();
    this.initialized = true;

    this.courseForm.valueChanges.subscribe(() => {
      if (!this.initialized) return;

      const current = this.courseForm.getRawValue();

      this.hasChanges.set(
        JSON.stringify(current) !== JSON.stringify(this.initialValue)
      );
    });
  }

  handleFile(file: File) {

    this.imageError = null;

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      this.imageError = 'Image must be less than 2MB';
      this.selectedThumbnailFile = null;
      this.hasThumbnail.set(false);
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please upload a valid image';
      this.selectedThumbnailFile = null;
      this.hasThumbnail.set(false);
      return;
    }

    this.selectedThumbnailFile = file;
    this.hasThumbnail.set(true);

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

  selectLevel(level: string) {
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

  loadCourse(id: string) {
    this.coursesService.getCourseById(id).subscribe(course => {

      // 1. Fill form first
      this.courseForm.patchValue({
        title: course.title,
        description: course.description,
        price: course.price,
        thumbnail: course.thumbnail,
        level: course.level,
        category: course.categoryId
      });

      this.setArray('goals', course.goals || []);
      this.setArray('requirements', course.requirements || []);

      if (course.thumbnail) {
        this.thumbnailPreview.set(course.thumbnail);
        this.hasThumbnail.set(true);
      }

      // 2. IMPORTANT: reset baseline AFTER form is fully ready
      setTimeout(() => {
        this.initialValue = this.courseForm.getRawValue();
        this.hasChanges.set(false);
      });

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

  isButtonDisabled(): boolean {

    if (this.mode() === 'create') {
      return this.courseForm.invalid || this.status() === 'saving';
    }

    // UPDATE MODE → NEVER DISABLED
    return false;
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
      return 'Add Course';
    }

    return '';
  }

  onMainAction() {

    if (this.mode() === 'update') {

      if (!this.hasChanges()) {
        this.router.navigate([
          '/course-builder',
          this.courseId,
          'curriculum'
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

    const formValue = this.courseForm.getRawValue();

    const payload: any = {
      title: formValue.title,
      description: formValue.description,
      price: formValue.price,
      level: formValue.level,
      categoryId: formValue.category!,
      goals: formValue.goals || [],
      requirements: formValue.requirements || [],
    };

    const upload$ = this.selectedThumbnailFile
      ? this.cloudinaryService.uploadThumbnail(this.selectedThumbnailFile)
      : null;

    if (upload$) {
      upload$.subscribe({
        next: (res) => {
          payload.thumbnail = res.secure_url;
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
    this.coursesService.updateCourse(this.courseId!, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.status.set('ready');   // IMPORTANT
        this.hasChanges.set(false);
        this.initialValue = this.courseForm.getRawValue();
        this.initialValue = this.courseForm.getRawValue();
      },
      error: () => {
        this.isSaving.set(false);
        this.status.set('ready');
      }
    });
  }

  createCourse() {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const form = this.courseForm.getRawValue();

    this.cloudinaryService.uploadThumbnail(this.selectedThumbnailFile!)
      .subscribe(upload => {

        const payload: CourseBuilderModel = {
          title: form.title!,
          description: form.description!,
          price: form.price!,
          level: form.level as any,
          categoryId: form.category!,
          goals: form.goals as string[],
          requirements: form.requirements as string[],
          thumbnail: upload.secure_url,
          courseStatus: CourseStatus.DRAFT
        };

        this.coursesService.createCourse(payload).subscribe(course => {
          this.courseCreatedEvent.emit(course._id);
          this.isSaving.set(false);
        });
      });
  }
}
