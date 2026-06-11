import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SectionCardComponent } from '../../components/section-card/section-card.component';
import { ActivatedRoute } from '@angular/router';
import { SectionsService } from '../../../../core/services/sections';
import { CoursesService } from '../../../../core/services/courses';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { BackButtonComponent } from '../../components/shared/back-button/back-button';

export function maxArrayLength(max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (Array.isArray(value) && value.length > max) {
      return { maxArrayLength: true };
    }

    return null;
  };
}
@Component({
  selector: 'app-section-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    BackButtonComponent, 
    SectionCardComponent
  ],
  templateUrl: './section-builder.component.html',
  styleUrl: './section-builder.component.css'
})


export class SectionBuilderComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private sectionsService = inject(SectionsService);
  private coursesService = inject(CoursesService);

  @Input() courseId: string | null = null;

  sectionForm = this.fb.group({
    sections: this.fb.array([])
  });


  get sectionsArray(): FormArray {
    return this.sectionForm.get('sections') as FormArray;
  }

  get sections(): FormGroup[] {
    return this.sectionsArray.controls as FormGroup[];
  }

  ngOnInit() {
    const id =
      this.route.snapshot.paramMap.get('courseId') ||
      this.route.parent?.snapshot.paramMap.get('courseId');

    if (!id) {
      console.error('Course ID not found in route');
      return;
    }

    this.courseId = id;

    console.log('Course ID resolved:', this.courseId);

    this.loadSections();
  }

  addSection() {
    const section = this.fb.group({
      id: [null],
      isSaving: [false],
      isDeleting: [false],

      title: ['', [Validators.required, Validators.minLength(3)]],

      description: ['', [Validators.minLength(10)]],

      expectedOutcomes: this.fb.array([], [maxArrayLength(20)]),

      isBasicSection: [false],

      lessons: this.fb.array([])
    });
    this.sectionsArray.push(section);
    this.sectionsArray.markAsDirty();
  }

  deleteSection(index: number) {

    const form = this.sectionsArray.at(index);

    const sectionId = form.get('id')?.value;
    form.get('isDeleting')?.setValue(true);

    // Unsaved section
    if (!sectionId) {
      this.sectionsArray.removeAt(index);
      this.sectionsArray.markAsDirty();
      return;
    }

    // Existing section in DB
    this.sectionsService
      .deleteSection(this.courseId!, sectionId)
      .subscribe({
        next: () => {

          this.sectionsArray.removeAt(index);
          this.sectionsArray.markAsDirty();

          console.log('Section deleted successfully');
        },

        error: (err) => {

          form.get('isDeleting')?.setValue(false);

          console.error('Failed to delete section', err);
        }
      });
  }

  moveSectionUp(index: number) {
    if (index === 0) return;
    const control = this.sectionsArray.at(index);
    this.sectionsArray.removeAt(index);
    this.sectionsArray.insert(index - 1, control);
    this.sectionsArray.markAsDirty();
  }

  moveSectionDown(index: number) {
    if (index === this.sectionsArray.length - 1) return;
    const control = this.sectionsArray.at(index);
    this.sectionsArray.removeAt(index);
    this.sectionsArray.insert(index + 1, control);
    this.sectionsArray.markAsDirty();
  }

  createSection(index: number) {

    if (!this.courseId) {
      return;
    }

    const form = this.sectionsArray.at(index);

    const payload = {
      title: form.get('title')?.value,
      description: form.get('description')?.value,
      expectedOutcomes: form.get('expectedOutcomes')?.value || [],
      isBasicSection: form.get('isBasicSection')?.value
    };

    const sectionId = form.get('id')?.value;

    form.get('isSaving')?.setValue(true);

    if (sectionId) {

      this.sectionsService
        .updateSection(this.courseId, sectionId, payload)
        .subscribe({
          next: (res) => {
            form.get('isSaving')?.setValue(false);
            console.log('Section updated', res);
          },
          error: (err) => {
            form.get('isSaving')?.setValue(false);
            console.error(err);
          }
        });

    } else {

      this.sectionsService
        .addSection(this.courseId, payload)
        .subscribe({
          next: (res: any) => {

            form.get('isSaving')?.setValue(false);

            form.patchValue({
              id: res._id
            });

            console.log('Section created', res);
          },
          error: (err) => {
            form.get('isSaving')?.setValue(false);
            console.error(err);
          }
        });

    }
  }

  loadSections() {
    if (!this.courseId) return;


    this.coursesService.findOne(this.courseId).subscribe({
      next: (course: any) => {
        const sections = course.sections || [];

        this.sectionsArray.clear();



        sections.forEach((section: any) => {
          this.sectionsArray.push(
            this.fb.group({
              title: [
                section.title || '',
                [
                  Validators.required,
                  Validators.minLength(3)
                ]
              ],

              description: [
                section.description || '',
                [
                  Validators.minLength(10)
                ]
              ],

              isBasicSection: [
                section.isBasicSection || false
              ],

              expectedOutcomes: this.fb.array(
                (section.expectedOutcomes || []).map(
                  (outcome: string) =>
                    this.fb.control(outcome, Validators.required)
                ),
                [maxArrayLength(20)]
              ),

              lessons: this.fb.array(section.lessons || []),
              id: [section._id],
              isSaving: [false],
              isDeleting: [false],
            })
          );
        });

        console.log('Sections loaded from course:', sections);
      },
      error: (err) => {
        console.error('Failed to load course sections:', err);
      }
    });
  }


}