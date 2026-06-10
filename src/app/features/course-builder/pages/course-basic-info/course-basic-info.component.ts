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
  styleUrl: './course-basic-info.component.css',
  // 
})


export class CourseBasicInfoComponent {
  private coursesService = inject(CoursesService);
  private router = inject(Router);
  private cloudinaryService = inject(CloudinaryService);
  isDragging = signal(false);

  isSaving = signal(false);
  courseCreated = signal(false);
  courseId = signal<string | null>(null);
  hasChanges = signal(false);
  courseForm: any;

  isUploading = signal(false);
  hasThumbnail = signal(false);
  // isDragging = signal(false);

  // imageError = '';
  selectedThumbnailFile: File | null = null;

  imageError: string | null = null;

  @Input({ required: true }) parentForm!: FormGroup;
  thumbnailPreview = signal<string>('');
  openLevel = false;


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

    if (this.isSaving()) {
      return 'hourglass_top';
    }

    if (!this.courseId()) {
      return 'add';
    }

    if (this.hasChanges()) {
      return 'save';
    }

    return 'arrow_forward';
  }

  getButtonLabel(): string {

    if (this.isSaving()) {
      return 'Saving...';
    }

    if (!this.courseId()) {
      return 'Add Course';
    }

    if (this.hasChanges()) {
      return 'Save';
    }

    return 'Continue';
  }

  onMainAction() {

    if (!this.courseId()) {
      this.createCourse();
      return;
    }

    if (this.hasChanges()) {
      console.log('Save Course');
      return;
    }

    console.log('Continue');
  }

  createCourse() {

    if (!this.selectedThumbnailFile || this.imageError) {
      this.imageError = this.imageError || 'Thumbnail is required';
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
      .uploadImage(this.selectedThumbnailFile)
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

              this.courseId.set(course._id);

              this.isSaving.set(false);

              console.log('Course created', course);
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
