import { Component, OnInit, inject, Input, DestroyRef, signal } from '@angular/core';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Course } from '../../../../core/models/course.model';
import { Section } from '../../../../core/models/section.model';
import { Lesson } from '../../../../core/models/lesson.model';
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

export function maxArrayLength(max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (Array.isArray(value) && value.length > max) {
      return { maxArrayLength: true };
    }

    return null;
  };
}

export function extractId(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val.id === 'string') return val.id;
  if (typeof val._id === 'string') return val._id;

  const buf = val.buffer || val;
  
  // Node.js Buffer JSON serialization
  if (buf && buf.type === 'Buffer' && Array.isArray(buf.data)) {
    return buf.data.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }

  // Uint8Array or Buffer object
  if (buf instanceof Uint8Array || (buf && typeof buf.byteLength === 'number' && typeof buf.slice === 'function')) {
     return Array.from(new Uint8Array(buf)).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }
  
  if (val.toString && typeof val.toString === 'function' && val.toString() !== '[object Object]') {
      return val.toString();
  }

  return null;
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
    DragDropModule,
    EmptyStateComponent
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
  private destroyRef = inject(DestroyRef);
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
    this.sectionsArray.removeAt(index);
    this.cdr.detectChanges();
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
    this.coursesService.findOne(this.courseId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (course: Course) => {
        const sections = course.sections || [];
        this.sectionsArray.clear();

        sections.forEach((section: Section) => {
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


              lessons: this.fb.array(
                (section.lessons || []).map((lesson: Lesson) =>
                  this.fb.group({
                    id: [extractId((lesson as any)._id || lesson.id || lesson)],
                    title: [lesson.title || '', Validators.required],
                    videoUrl: [lesson.videoUrl || ''],
                    videoPublicId: [lesson.videoPublicId || ''],
                    videoDuration: [lesson.videoDuration || 0],
                    expanded: [false]
                  })
                )
              ),

              id: [extractId((section as any)._id || section.id || section)],
              isSaving: [false],
              isDeleting: [false],
            })
          );
        });

        this.isLoading = false;
        this.cdr.detectChanges();
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
    const controls = this.sectionsArray.controls;

    const hasUnsaved = controls.some(c => !extractId(c.get('id')?.value));

    if (hasUnsaved) {
      // console.warn('Cannot reorder: there are unsaved sections');
      return;
    }

    const ids = controls.map(c => extractId(c.get('id')!.value) as string);

    this.sectionsService.reorderSections(this.courseId, ids)
      .subscribe({
        next: res => console.log('Reorder OK', res),
        error: err => console.error('Reorder failed', err)
      });
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