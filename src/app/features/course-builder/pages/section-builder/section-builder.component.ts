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
import { Section } from '../../../../core/models/section.model';
import { Lesson } from '../../../../core/models/lesson.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

import { DraftStateService } from '../../../../core/services/draft-state.service';
import { FormDraftIntegrationService } from '../../../../core/services/form-draft-integration.service';
import { PageSkeletonComponent } from '../../../../shared/components/loading';

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
    DragDropModule,
    EmptyStateComponent,
    PageSkeletonComponent
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
  private draftStateService = inject(DraftStateService);
  private formDraftIntegration = inject(FormDraftIntegrationService);


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

    this.loadSections();

    // Subscribe to query params so that navigating back from lesson-builder
    // (which passes ?expand=sectionId&highlight=sectionId) works even when
    // this component is already mounted and ngOnInit would not re-fire.
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const highlight = params['highlight'] ?? null;
        const expand = params['expand'] ?? null;

        if (expand) {
          this.expandedSectionId = expand;
        }
        if (highlight) {
          this.highlightSectionId = highlight;
          // Clear highlight glow after 5 seconds
          setTimeout(() => { this.highlightSectionId = null; }, 5000);
        }

        // Scroll to expanded section after DOM updates
        if (expand) {
          setTimeout(() => {
            const idx = this.sections.findIndex(s => s.get('id')?.value === expand);
            if (idx !== -1) {
              const el = document.getElementById('section-card-' + idx);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
        }

        // Clear query params from the URL so a future refresh doesn't re-expand
        if (highlight || expand) {
          this.router.navigate([], { queryParams: {}, replaceUrl: true });
        }
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
    const draftId = this.formDraftIntegration.generateDraftId('section', this.courseId);

    const section = this.fb.group({
      id: [draftId],

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
      previewVideoUrl: [null as string | null],
      previewVideoPublicId: [null as string | null]
    });

    this.sectionsArray.push(section);

    this.expandedSectionId = draftId;
    this.cdr.detectChanges();
    const newIndex = this.sectionsArray.length - 1;
    setTimeout(() => {
      const element = document.getElementById('section-card-' + newIndex);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
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

  private populateLessonsForSection(sectionGroup: FormGroup, sectionId: string, serverLessons: Lesson[]) {
    const lessonsArray = sectionGroup.get('lessons') as FormArray;
    lessonsArray.clear();

    // 1. Add server-side lessons
    serverLessons.forEach((lesson: Lesson) => {
      lessonsArray.push(
        this.fb.group({
          id: [extractId((lesson as any)._id || lesson.id || lesson)],
          title: [lesson.title || '', Validators.required],
          videoUrl: [lesson.videoUrl || ''],
          videoPublicId: [lesson.videoPublicId || ''],
          videoDuration: [lesson.videoDuration || 0],
          expanded: [false]
        })
      );
    });

    // 2. Add draft lessons (unsaved new lessons)
    if (sectionId) {
      const draftLessons = this.draftStateService.getDraftsByParent(sectionId)
        .filter(draft => draft.type === 'lesson' && this.draftStateService.isDraftId(draft.id));

      draftLessons.forEach(draft => {
        lessonsArray.push(
          this.fb.group({
            id: [draft.id],
            title: [draft.data?.title || '', Validators.required],
            videoUrl: [draft.data?.videoUrl || ''],
            videoPublicId: [draft.data?.videoPublicId || ''],
            videoDuration: [draft.data?.videoDuration || 0],
            expanded: [false]
          })
        );
      });
    }
  }

  loadSections() {
    if (!this.courseId) return;
    this.coursesService.findOne(this.courseId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (course) => {
        const sections = course.sections || [];
        this.sectionsArray.clear();
        console.log('expandedSectionId from route:', this.expandedSectionId);

        sections.forEach((section: Section) => {
          const sectionId = extractId((section as any)._id || section.id || section) || '';
                  console.log('loaded section id:', sectionId);
          const sectionGroup = this.fb.group({
            title: [section.title || '', [Validators.required, Validators.minLength(3)]],
            description: [section.description || '', [Validators.minLength(10)]],
            price: [section.price ?? 0, [Validators.required, Validators.min(0)]],
            expectedOutcomes: this.fb.array(
              (section.expectedOutcomes || []).map((o: string) =>
                this.fb.control(o ?? '', Validators.required)
              ) || []
            ),
            lessons: this.fb.array([]),
            id: [sectionId],
            isSaving: [false],
            isDeleting: [false],
            previewVideoUrl: [section.previewVideoUrl || null],
            previewVideoPublicId: [section.previewVideoPublicId || null]
          });

          this.populateLessonsForSection(sectionGroup, sectionId, section.lessons || []);
          this.sectionsArray.push(sectionGroup);
        });

        // Load new draft sections (ID starts with 'draft_')
        const draftSections = this.draftStateService.getDraftsByParent(this.courseId)
          .filter(draft => draft.type === 'section' && this.draftStateService.isDraftId(draft.id));
        draftSections.forEach(draft => {

          const sectionGroup = this.fb.group({   
            id: [draft.id],
            title: [draft.data?.title || '', [Validators.required, Validators.minLength(3)]],
            description: [draft.data?.description || '', [Validators.minLength(10)]],
            price: [draft.data?.price ?? 0, [Validators.required, Validators.min(0)]],
            expectedOutcomes: this.fb.array(
              (draft.data?.expectedOutcomes || []).map((o: string) =>
                this.fb.control(o ?? '', Validators.required)
              )
            ),
            lessons: this.fb.array([]),
            isSaving: [false],
            isDeleting: [false],
            previewVideoUrl: [draft.data?.previewVideoUrl || null],
            previewVideoPublicId: [draft.data?.previewVideoPublicId || null]
          });

          this.populateLessonsForSection(sectionGroup, draft.id, []);
          this.sectionsArray.push(sectionGroup);
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