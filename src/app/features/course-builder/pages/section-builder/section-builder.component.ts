import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SectionCardComponent } from '../../components/section-card/section-card.component';
import { ActivatedRoute, Router } from '@angular/router';
import { SectionsService } from '../../../../core/services/sections';
import { CoursesService } from '../../../../core/services/courses';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { BackButtonComponent } from '../../components/shared/back-button/back-button';
import { ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { take } from 'rxjs';

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
  courseTitle: string | null = null;
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private sectionsService = inject(SectionsService);
  private coursesService = inject(CoursesService);
  private router = inject(Router);
  expandedSectionId: string | null = null;
  highlightSectionId: string | null = null;
  courseId!: string;
  private cdr = inject(ChangeDetectorRef);
  newSectionIndex: number | null = null;


  sectionForm = this.fb.group({
    sections: this.fb.array([])
  });

  goToCourse() {
    this.router.navigate(['../'], {
      relativeTo: this.route
    });
  }

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

    if (!id) return;

    this.courseId = id;


    const highlight = this.route.snapshot.queryParamMap.get('highlight');
    const expand = this.route.snapshot.queryParamMap.get('expand');

    this.highlightSectionId = highlight;
    this.expandedSectionId = expand;

    this.loadSections();


    this.router.navigate([], {
      queryParams: {},
      replaceUrl: true
    });
  }

  ngAfterViewInit() {
    if (this.highlightSectionId) {
      setTimeout(() => {
        this.highlightSectionId = null;
      }, 5000);
    }
  }

  addSection() {
    const section = this.fb.group({
      id: [null],

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

      expectedOutcomes: this.fb.array([]),

      isBasicSection: [false],
      lessons: this.fb.array([]),

      isSaving: [false],
      isDeleting: [false],
    });

    this.sectionsArray.push(section);


    this.expandedSectionId = null;
  }

  onSectionDeleted(index: number) {
    this.expandedSectionId = null;

    setTimeout(() => {
      this.sectionsArray.removeAt(index);
    }, 150);
  }

  onSectionCreated(sectionId: string) {
    this.expandedSectionId = sectionId;
  }

  moveSectionUp(index: number) {
    if (index === 0) return;

    const sections = this.sectionsArray;

    const current = sections.at(index);
    const above = sections.at(index - 1);

    sections.setControl(index - 1, current);
    sections.setControl(index, above);

    sections.markAsDirty();
  }

  moveSectionDown(index: number) {
    const sections = this.sectionsArray;

    if (index === sections.length - 1) return;

    const current = sections.at(index);
    const below = sections.at(index + 1);

    sections.setControl(index + 1, current);
    sections.setControl(index, below);

    sections.markAsDirty();
  }

  trackBySection(index: number, item: FormGroup) {
    return item.get('id')?.value;
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
              title: [section.title || '', [Validators.required, Validators.minLength(3)]],
              description: [section.description || '', [Validators.minLength(10)]],
              isBasicSection: [section.isBasicSection || false],
              expectedOutcomes: this.fb.array(
                (section.expectedOutcomes || []).map((o: string) =>
                  this.fb.control(o ?? '', Validators.required)
                ) || []
              ),

              // 👇 التعديل الجوهري هنا: تحويل كائنات الـ lessons إلى FormGroup منفصلة لكل درس
              lessons: this.fb.array(
                (section.lessons || []).map((lesson: any) =>
                  this.fb.group({
                    id: [lesson._id || lesson.id || null], // تأكيد وجود حقل الـ id مستقبلاً من السيرفر
                    title: [lesson.title || '', Validators.required],
                    videoUrl: [lesson.videoUrl || ''],
                    videoPublicId: [lesson.videoPublicId || ''],
                    videoDuration: [lesson.videoDuration || 0],
                    expanded: [false] // حقل إضافي إذا كنت تستخدمه للتحكم بفتح وإغلاق العناصر
                  })
                )
              ),

              id: [section._id],
              isSaving: [false],
              isDeleting: [false],
            })
          );
        });

        this.cdr.detectChanges();
        console.log('Sections loaded from course:', sections);
      },
      error: (err) => {
        console.error('Failed to load course sections:', err);
      }
    });
  }


}