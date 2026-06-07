import { Component, Input, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategorySelectorComponent } from '../category-selector/category-selector.component';
import { GoalsInputComponent } from '../goals-input/goals-input.component';
import { RequirementsInputComponent } from '../requirements-input/requirements-input.component';

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
  @Input({ required: true }) parentForm!: FormGroup;
  @ViewChild('thumbnailInput') thumbnailInput!: ElementRef<HTMLInputElement>;

  thumbnailPreview = signal<string | null>(null);

  getControl(name: string): FormControl {
    return this.parentForm.get(name) as FormControl;
  }

  get goalsArray(): FormArray {
    return this.parentForm.get('goals') as FormArray;
  }

  get requirementsArray(): FormArray {
    return this.parentForm.get('requirements') as FormArray;
  }

  triggerThumbnailUpload() {
    this.thumbnailInput.nativeElement.click();
  }

  onThumbnailSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.thumbnailPreview.set(result);
        this.getControl('thumbnail').setValue(result);
        this.getControl('thumbnail').markAsDirty();
      };
      reader.readAsDataURL(file);
    }
  }

  removeThumbnail(event: Event) {
    event.stopPropagation();
    this.thumbnailPreview.set(null);
    this.getControl('thumbnail').setValue(null);
    this.getControl('thumbnail').markAsDirty();
    if (this.thumbnailInput) {
      this.thumbnailInput.nativeElement.value = '';
    }
  }
}
