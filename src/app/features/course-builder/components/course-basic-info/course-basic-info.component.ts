import { Component, Input, ElementRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategorySelectorComponent } from '../category-selector/category-selector.component';
import { GoalsInputComponent } from '../goals-input/goals-input.component';
import { RequirementsInputComponent } from '../requirements-input/requirements-input.component';
import { Output, EventEmitter } from '@angular/core'; 
import { Router } from '@angular/router';
import { CoursesService } from '../../../../core/services/courses';
import { CourseStatus } from '../../../../core/enums/course-status';
import { environment } from '../../../../../environments/environment';

// import { CourseStatus } from 
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

isSaving = signal(false);
courseForm: any;

isUploading = signal(false);

  @Input({ required: true }) parentForm!: FormGroup;
  thumbnailPreview = signal<string>('https://dummyimage.com/600x400');
  openLevel = false;

  

uploadToCloudinary(file: File) {

  this.isUploading.set(true);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', `${environment.cloudinary.uploadPreset}`);

  fetch(`https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {

      console.log('Cloudinary response:', data);

      const url = data.secure_url;

      this.parentForm.get('thumbnail')?.setValue(url);
      this.thumbnailPreview.set(url);

      this.isUploading.set(false);
    })
    .catch(err => {
      console.error('Upload error:', err);
      this.isUploading.set(false);
    });
}

  onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // preview local
  const reader = new FileReader();
  reader.onload = () => {
    this.thumbnailPreview.set(reader.result as string);
  };
  reader.readAsDataURL(file);

  // upload to cloudinary
  this.uploadToCloudinary(file);
}

selectLevel(level: string) {
  this.getControl('level').setValue(level);
  this.openLevel = false;
}

  getControl(name: string): FormControl {
    return this.parentForm.get(name) as FormControl;
  }

  get goalsArray(): FormArray {
    return this.parentForm.get('goals') as FormArray;
  }

  get requirementsArray(): FormArray {
    return this.parentForm.get('requirements') as FormArray;
  }
  

  createCourse() {
  if (this.parentForm.invalid) {
    this.parentForm.markAllAsTouched();
    return;
  }

  this.isSaving.set(true);

  const formValue = this.parentForm.value;

  const payload = {
    title: formValue.title,
    description: formValue.description,
    price: formValue.price,
   thumbnail: formValue.thumbnail,
    level: formValue.level,
   categoryId: formValue.category,
    goals: formValue.goals || [],
    requirements: formValue.requirements || [],
    courseStatus: 'draft'
  };
  console.log('🚀 CREATE COURSE PAYLOAD:', payload);
  console.log(payload);

  this.coursesService.createCourse(payload).subscribe({
    next: (course) => {
      this.isSaving.set(false);

      this.router.navigate(['/course-builder', course._id]);
    },

   error: (err) => {
  this.isSaving.set(false);

  console.log('FULL ERROR:', err);
  console.log('STATUS:', err.status);

  console.log('RAW ERROR BODY:', JSON.stringify(err.error, null, 2));
  console.log('MESSAGE:', err.error?.message);
}
  });
}
}
