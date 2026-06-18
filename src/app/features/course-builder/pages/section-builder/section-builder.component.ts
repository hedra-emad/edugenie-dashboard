import { Component, OnInit, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
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
import { AppLoader } from "../../../../shared/components/add-loader/app-loader";

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
    SectionCardComponent,
    AppLoader,
    DragDropModule
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
  courseNotFound = signal(false);
  expandedSectionId: string | null = null;
  highlightSectionId: string | null = null;
  courseId!: string;
  private cdr = inject(ChangeDetectorRef);
  newSectionIndex: number | null = null;
  isLoading = true;

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

      price: [0, [Validators.required, Validators.min(0)]],
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

  onSectionDropped(event: CdkDragDrop<FormGroup[]>) {
    moveItemInArray(
      this.sectionsArray.controls,
      event.previousIndex,
      event.currentIndex
    );
    this.sectionsArray.updateValueAndValidity();
    this.sectionsArray.markAsDirty();
    this.saveSectionOrder();
  }

  trackBySection(index: number, item: FormGroup) {
    return item.get('id')?.value;
  }

  loadSections() {
    if (!this.courseId) return;
    this.isLoading = true;
    this.coursesService.findOne(this.courseId).subscribe({
      next: (course: any) => {
        const sections = course.sections || [];
        this.sectionsArray.clear();

        sections.forEach((section: any) => {
          this.sectionsArray.push(
            this.fb.group({
              title: [section.title || '', [Validators.required, Validators.minLength(3)]],
              description: [section.description || '', [Validators.minLength(10)]],
              price: [section.price ?? 0, [Validators.required, Validators.min(0)]],
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

        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('Sections loaded from course:', sections);
      },
      error: (err) => {
        console.error('Failed to load course sections:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  moveSectionUp(index: number) {
    if (index === 0) return;
    const arr = this.sectionsArray;
    const current = arr.at(index);
    const above = arr.at(index - 1);
    arr.setControl(index - 1, current);
    arr.setControl(index, above);
    arr.updateValueAndValidity();
    this.saveSectionOrder();
  }

  moveSectionDown(index: number) {
    const arr = this.sectionsArray;
    if (index === arr.length - 1) return;
    const current = arr.at(index);
    const below = arr.at(index + 1);
    arr.setControl(index + 1, current);
    arr.setControl(index, below);
    arr.updateValueAndValidity();
    this.saveSectionOrder();
  }

  private saveSectionOrder() {
    const ids = this.sectionsArray.controls
      .map(c => c.get('id')?.value)
      .filter(Boolean);

    if (ids.length < 2) return;

    this.sectionsService.reorderSections(this.courseId, ids)
      .subscribe({ error: err => console.error('Reorder failed', err) });
  }

  get totalCourseDuration(): number {
    return this.sections.reduce((total, section) => {
      const lessons = section.get('lessons')?.value || [];
      return total + lessons.reduce((sum: number, lesson: any) => sum + Number(lesson.videoDuration || 0), 0);
    }, 0);
  }

  get totalCourseLessons(): number {
    return this.sections.reduce((total, section) => {
      const lessons = section.get('lessons')?.value || [];
      return total + lessons.length;
    }, 0);
  }

  formatCourseDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

}