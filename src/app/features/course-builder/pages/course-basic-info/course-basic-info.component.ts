import { Component, Input, ElementRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { GoalsInputComponent } from '../../components/goals-input/goals-input.component';
import { RequirementsInputComponent } from '../../components/requirements-input/requirements-input.component';
import { Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CoursesService } from '../../../../core/services/courses';
import { CourseStatus } from '../../../../core/enums/course-status';
import { environment } from '../../../../../environments/environment';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { FormBuilder } from '@angular/forms';
@Component({
  selector: 'app-course-basic-info',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CategorySelectorComponent,
    GoalsInputComponent,
    RequirementsInputComponent
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
  @Input() courseId: string | null = null;

  isUploading = signal(false);
  hasThumbnail = signal(false);
  hasChanges = signal(false);
  private initialized = false;
  // isDragging = signal(false);

  // imageError = '';
  selectedThumbnailFile: File | null = null;

  imageError: string | null = null;

  @Input({ required: true }) parentForm!: FormGroup;
  @Output() courseCreatedEvent = new EventEmitter<string>();
  thumbnailPreview = signal<string>('');
  openLevel = false;
  mode = signal<'create' | 'update'>('create');

  status = signal<'idle' | 'saving' | 'updating' | 'ready'>('idle');

  initialValue: any = null;

  ngOnChanges() {
    if (this.courseId) {
      this.mode.set('update');
      this.status.set('ready');
    }

    if (this.parentForm && !this.initialValue) {
      this.initialValue = this.parentForm.getRawValue();

      this.parentForm.valueChanges.subscribe(() => {
        const current = this.parentForm.getRawValue();

        this.hasChanges.set(
          JSON.stringify(current) !== JSON.stringify(this.initialValue)
        );
      });
    }
  }

  initBaseline() {
    this.initialValue = this.parentForm.getRawValue();
    this.initialized = true;

    this.parentForm.valueChanges.subscribe(() => {
      if (!this.initialized) return;

      const current = this.parentForm.getRawValue();

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
    return this.parentForm.get(name) as FormControl;
  }

  isInvalid(name: string) {
    const control = this.getControl(name);
    return control.touched && control.invalid;

  }

  isValid(name: string) {
    const control = this.getControl(name);
    return control.touched && control.valid;
  }

  get goalsArray(): FormArray {
    return this.parentForm.get('goals') as FormArray;
  }

  get requirementsArray(): FormArray {
    return this.parentForm.get('requirements') as FormArray;
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
      return this.parentForm.invalid || this.status() === 'saving';
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

    if (this.mode() === 'create') {
      this.createCourse();
      return;
    }

    if (this.mode() === 'update') {
      if (!this.hasChanges()) {
        console.log('Continue');
        return;
      }

      this.updateCourse();
    }
  }

  updateCourse() {
    if (this.parentForm.invalid) {
      this.parentForm.markAllAsTouched();
      return;
    }

    this.status.set('updating');

    const formValue = this.parentForm.getRawValue();

    const payload: any = {
      title: formValue.title,
      description: formValue.description,
      price: formValue.price,
      level: formValue.level,
      categoryId: formValue.category,
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
        this.status.set('ready');   // ⭐ IMPORTANT
        this.hasChanges.set(false);
        this.initialValue = this.parentForm.getRawValue();
      },
      error: () => {
        this.isSaving.set(false);
        this.status.set('ready');
      }
    });
  }

  createCourse() {

    if (!this.courseId && !this.selectedThumbnailFile) {
      this.imageError = 'Thumbnail is required';
      return;
    }
    if (this.parentForm.invalid) {
      this.parentForm.markAllAsTouched();
      return;
    }

    if (!this.selectedThumbnailFile) {
      alert('Please select a thumbnail');
      return;
    }

    this.isSaving.set(true);

    this.cloudinaryService
      .uploadThumbnail(this.selectedThumbnailFile)
      .subscribe({
        next: (uploadRes) => {

          const formValue = this.parentForm.value;

          const payload = {
            title: formValue.title,
            description: formValue.description,
            price: formValue.price,
            thumbnail: uploadRes.secure_url,
            level: formValue.level,
            categoryId: formValue.category,
            goals: formValue.goals || [],
            requirements: formValue.requirements || [],
            courseStatus: CourseStatus.DRAFT,
          };

          this.coursesService.createCourse(payload).subscribe({
            next: (course) => {

              this.courseCreatedEvent.emit(course._id);

              this.courseCreatedEvent.emit(course._id);

              this.isSaving.set(false);
              console.log('Course created', course);
              this.mode.set('update');
              this.status.set('ready');
            },

            error: (err) => {
              this.isSaving.set(false);

              console.log('FULL ERROR', err);
              console.log('STATUS', err.status);
              console.log('ERROR BODY', err.error);
              console.log('MESSAGE', err.error?.message);
            }
          });

        },

        error: (err) => {
          this.isSaving.set(false);
          console.error('Cloudinary upload failed', err);
        }
      });
  }
}
