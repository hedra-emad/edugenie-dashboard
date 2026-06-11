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
    // 1. If the parent component passed it directly via template binding, we are good!
    if (this.courseId) {
      this.loadSections();
      console.log('SectionBuilder initialized via Input binding:', this.courseId);
      return;
    }

    // 2. Otherwise, scan the entire active route path tree for any parameter
    let currentRoute: ActivatedRoute | null = this.route;
    while (currentRoute) {
      // Try scanning for 'id' first, then fallback to checking for 'courseId'
      const idParam = currentRoute.snapshot.paramMap.get('id') ||
        currentRoute.snapshot.paramMap.get('courseId');

      if (idParam) {
        this.courseId = idParam;
        break;
      }
      // Move up to the parent route segment
      currentRoute = currentRoute.parent;
    }

    if (this.courseId) {
      console.log('SectionBuilder successfully located Course ID from route tree:', this.courseId);
    } else {
      console.error(
        'SectionBuilder Routing Error: Looked through the entire URL path tree but could not find an ":id" or ":courseId" parameter.',
        this.route.snapshot.params
      );
    }
  }

  addSection() {
    const section = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(3)
        ]
      ],

      description: [
        '',
        [
          Validators.minLength(10)
        ]
      ],

      expectedOutcomes: this.fb.array([], [
        maxArrayLength(20)
      ]),
      isBasicSection: [false],
      lessons: this.fb.array([])
    });
    this.sectionsArray.push(section);
    this.sectionsArray.markAsDirty();
  }

  deleteSection(index: number) {
    this.sectionsArray.removeAt(index);
    this.sectionsArray.markAsDirty();
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
      console.error('Cannot save section: courseId is missing.');
      return;
    }

    const section = this.sectionsArray.at(index).value;
    const payload = {
      title: section.title,
      description: section.description,
      expectedOutcomes: section.expectedOutcomes || [],
      isBasicSection: section.isBasicSection
    };

    this.sectionsService.addSection(this.courseId, payload)
      .subscribe({
        next: res => console.log('Section saved successfully:', res),
        error: err => console.error('API Error saving section:', err)
      });
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
              title: [section.title, Validators.required],
              description: [section.description || ''],
              isBasicSection: [section.isBasicSection || false],
              expectedOutcomes: this.fb.array(section.expectedOutcomes || []),
              lessons: this.fb.array(section.lessons || [])
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