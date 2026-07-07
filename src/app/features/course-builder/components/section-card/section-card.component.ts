import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

// Draft system imports
import { DraftStateService } from '../../../../core/services/draft-state.service';
import { FormDraftIntegrationService } from '../../../../core/services/form-draft-integration.service';

import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { SectionsService } from '../../../../core/services/sections';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';

import { ViewChild, OnChanges } from '@angular/core';
import { ExpansionPanelComponent } from '../shared/expansion-panel/expansion-panel.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { extractId } from '../../pages/section-builder/section-builder.component';
import { AttachmentManagerComponent } from '../attachment-manager/attachment-manager.component';
import { AttachmentParentType } from '../../../../core/models/attachment.model';
import { QuizzesService } from '../../../../core/services/quizzes';

@Component({
  selector: 'app-section-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    DragDropModule,
    MatDialogModule,
    ExpansionPanelComponent
  ],
  templateUrl: './section-card.component.html',
  styleUrl: './section-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionCardComponent implements OnInit, OnDestroy, OnChanges {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sectionsService = inject(SectionsService);
  private draftStateService = inject(DraftStateService);
  private formDraftIntegration = inject(FormDraftIntegrationService);
  private quizzesService = inject(QuizzesService);
  // Lifecycle management
  private destroy$ = new Subject<void>();

  // Quiz state
  hasQuiz = false;

  // ================= Inputs =================
  @Input({ required: true }) sectionForm!: FormGroup;
  @Input() index = 0;
  @Input() highlight = false;
  @Input() expanded = false;
  @Input() courseId!: string;

  // ================= Outputs =================
  @Output() delete = new EventEmitter<number>();
  @Output() goToLessons = new EventEmitter<void>();
  @Output() sectionCreated = new EventEmitter<string>();


  // ================= UI State =================
  isSaving = false;
  isDeleting = false;
  showDeleteConfirm = false;
  AttachmentParentType = AttachmentParentType;
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  // ================= Draft State =================
  draftId = '';
  hasDraftData = false;

  // Utility function to truncate names for toastr messages
  private truncateName(name: string, maxLength = 40): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }

  @ViewChild('panel') panel!: MatExpansionPanel;




  preventScrollChange(event: Event) {
    (event.target as HTMLElement).blur();
  }

  // ================= Lifecycle =================
  ngOnInit() {
    this.initializeDraftSystem();
    this.checkQuizExists();
  }

  private checkQuizExists() {
    const sectionId = this.sectionForm.get('id')?.value;
    if (!sectionId || this.draftStateService.isDraftId(sectionId)) {
      this.hasQuiz = false;
      return;
    }

    this.quizzesService.getQuizForSection(sectionId).subscribe({
      next: (quiz) => {
        this.hasQuiz = !!quiz;
        this.cdr.markForCheck(); // Trigger change detection
      },
      error: () => {
        this.hasQuiz = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    this.cleanup();
  }

  ngOnChanges() {
    if (this.expanded && this.panel) {
      // Wait for Material expansion animation to complete before scrolling
      // This is more reliable than setTimeout since it listens to the actual animation event
      this.panel.opened.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
        const panelElement = document.querySelector('.mat-expansion-panel.mat-expanded');
        panelElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    
    // Check quiz exists when section form changes
    this.checkQuizExists();
  }

  // Public method to refresh quiz state (can be called from parent components)
  refreshQuizState() {
    this.checkQuizExists();
  }

  private initializeDraftSystem() {
    // Generate or get draft ID
    let sectionId = this.sectionForm.get('id')?.value;
    if (!sectionId) {
      sectionId = this.formDraftIntegration.generateDraftId('section', this.courseId);
      this.sectionForm.get('id')?.setValue(sectionId, { emitEvent: false });
    }

    this.draftId = sectionId;

    // Check if there's existing draft data for this section
    const existingDraft = this.draftStateService.getDraft(this.draftId);
    const hasExistingDraft = !!(existingDraft && existingDraft.data);

    // Connect form to draft system
    this.formDraftIntegration.connectForm(this.sectionForm, {
      draftId: this.draftId,
      type: 'section',
      parentId: this.courseId,
      excludeFields: ['id', 'order'], // Don't save these fields
      autoSave: true,
      autoSaveDelay: 1000
    });

    // If there's existing draft data, ensure form is marked as dirty
    if (hasExistingDraft && existingDraft.data) {
      this.sectionForm.markAsDirty();
      this.cdr.markForCheck();
    }

    // Monitor draft changes
    this.draftStateService.getDraftChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDraftState();
      });

    // Initial draft state update
    this.updateDraftState();
  }

  private updateDraftState() {
    this.hasDraftData = this.formDraftIntegration.hasDraftData(this.draftId);
    this.cdr.markForCheck();
  }

  private cleanup() {
    this.destroy$.next();
    this.destroy$.complete();
    this.formDraftIntegration.disconnectForm(this.draftId);
  }

  private cdr = inject(ChangeDetectorRef);

  // ================= SAVE (CREATE / UPDATE) =================
  saveSection() {
    if (this.isDeleting) return;
    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }
    const form = this.sectionForm;

    const rawId = form.get('id')?.value;
    const isDraft = rawId && String(rawId).startsWith('draft_');
    const sectionId = isDraft ? null : extractId(rawId);

    // If form is pristine and section exists, navigate directly to lessons
    if (this.sectionForm.pristine && sectionId) {
      this.router.navigate([
        '/course-builder',
        this.courseId,
        'sections',
        sectionId,
        'lessons'
      ]);
      return;
    }

    const payload: any = {
      title: form.get('title')?.value,
      description: form.get('description')?.value,
      expectedOutcomes: this.expectedOutcomesArray.value
        .filter((o: string) => o?.trim()),
      price: form.get('price')?.value !== null ? Number(form.get('price')?.value) : null,
      order: this.index
    };

    this.isSaving = true;
    this.cdr.markForCheck();

    const saveObs = sectionId
      ? this.sectionsService.updateSection(this.courseId, String(sectionId), payload)
      : this.sectionsService.addSection(this.courseId, payload);

    saveObs.subscribe({
      next: (sections) => {
        // For create: find the newly created section
        let newSectionId = sectionId;
        if (!sectionId && Array.isArray(sections)) {
          // Find the section with matching title (most recently created)
          const newSection = sections.find(s => s.title === payload.title);
          newSectionId = extractId(newSection?.id);
          if (newSectionId) {
            this.sectionForm.get('id')?.setValue(newSectionId, { emitEvent: false });
            this.sectionCreated.emit(newSectionId);
          }
        }

        this.sectionForm.markAsPristine();
        this.clearDraftAfterSave();

        const sectionTitle = this.sectionForm.get('title')?.value || 'Section';
        const truncatedTitle = this.truncateName(sectionTitle);

        this.isSaving = false;
        this.cdr.markForCheck();
        this.toastr.success(`"${truncatedTitle}" saved successfully`);
        if (newSectionId) {
          this.router.navigate([
            '/course-builder',
            this.courseId,
            'sections',
            newSectionId,
            'lessons'
          ]);
        }
      },
      error: (err) => {
        console.error('Save error:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
        const sectionTitle = this.sectionForm.get('title')?.value || 'Section';
        const truncatedTitle = this.truncateName(sectionTitle);
        this.toastr.error(`Failed to save "${truncatedTitle}"`);
      }
    });
  }

  // ================= DELETE =================
  requestDelete() {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Section?', message: 'This cannot be undone.' }
    });

    ref.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.confirmDelete();
      }
    });
  }

  confirmDelete() {
    const rawId = this.sectionForm.get('id')?.value;
    const isDraft = rawId && String(rawId).startsWith('draft_');
    const sectionId = isDraft ? null : extractId(rawId);

    if (!sectionId) {
      // Clear draft state after successful delete
      this.clearDraftAfterSave();
      this.delete.emit(this.index);
      return;
    }

    this.isDeleting = true;
    this.cdr.markForCheck();

    this.sectionsService.deleteSection(this.courseId, String(sectionId))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.cdr.markForCheck();

          // Clear draft state after successful delete
          this.clearDraftAfterSave();

          this.delete.emit(this.index);
        },
        error: (err) => {
          console.error('Delete error:', err);
          this.isDeleting = false;
          this.cdr.markForCheck();
          const sectionTitle = this.sectionForm.get('title')?.value || 'Section';
          const truncatedTitle = this.truncateName(sectionTitle);
          this.toastr.error(`Failed to delete "${truncatedTitle}"`);
        }
      });
  }


  cancelDelete(event: Event) {
    event.stopPropagation();
    this.showDeleteConfirm = false;
  }

  // ================= NAVIGATION =================
  onGoToLessons() {
    if (this.isDeleting) return;
    if (!this.isExistingSection) return;
    const rawId = this.sectionForm.get('id')?.value;
    const sectionId = extractId(rawId);
    if (!sectionId || !this.courseId) return;

    this.router.navigate([
      '/course-builder',
      this.courseId,
      'sections',
      sectionId,
      'lessons'
    ]);
  }

  onGoToQuiz() {
    if (this.isDeleting) return;
    if (!this.isExistingSection) return;
    const rawId = this.sectionForm.get('id')?.value;
    const sectionId = extractId(rawId);
    if (!sectionId || !this.courseId) return;

    this.router.navigate([
      '/course-builder',
      this.courseId,
      'sections',
      sectionId,
      'quiz-config'
    ]);
  }

  // ================= OUTCOMES =================
  get expectedOutcomesArray(): FormArray {
    return this.sectionForm.get('expectedOutcomes') as FormArray ?? this.fb.array([]);
  }

  get outcomes(): FormControl[] {
    return this.expectedOutcomesArray.controls as FormControl[];
  }

  addOutcome() {
    this.expectedOutcomesArray.push(
      this.fb.control('', Validators.required)
    );
  }

  removeOutcome(index: number) {
    this.expectedOutcomesArray.removeAt(index);
    this.expectedOutcomesArray.markAsDirty();
  }

  // ================= GETTERS =================
  get titleControl() {
    return this.sectionForm.get('title');
  }

  get descriptionControl() {
    return this.sectionForm.get('description');
  }

  get lessonsArray(): FormArray {
    return this.sectionForm.get('lessons') as FormArray;
  }

  get lessons(): FormGroup[] {
    return this.lessonsArray.controls as FormGroup[];
  }

  get isExistingSection(): boolean {
    const id = this.sectionForm.get('id')?.value;
    return !!id && !String(id).startsWith('draft_');
  }

  get isUnsavedSection(): boolean {
    return !this.isExistingSection;
  }

  get isModifiedSection(): boolean {
    return this.isExistingSection && this.sectionForm.dirty;
  }

  // ================= Draft State Methods =================
  clearDraftAfterSave() {
    this.formDraftIntegration.clearDraft({
      draftId: this.draftId,
      type: 'section',
      parentId: this.courseId
    });
    this.hasDraftData = false;
  }

  getDraftIndicatorType(): 'unsaved' | 'modified' {
    if (this.isUnsavedSection) {
      return 'unsaved';
    } else if (this.isModifiedSection) {
      return 'modified';
    }
    return 'unsaved'; // fallback
  }





  get hasCreatedLessons(): boolean {
    const lessons = this.sectionForm.get('lessons')?.value || [];
    return lessons.some((lesson: any) => {
      const id = lesson?.id;
      return id && id !== null && !this.draftStateService.isDraftId(String(id));
    });
  }

  get allLessonsHaveTranscripts(): boolean {
    const lessons = this.sectionForm.get('lessons')?.value || [];
    if (lessons.length === 0) return false; // No lessons = can't generate quiz
    
    return lessons.every((lesson: any) => {
      // Check if lesson has a transcript
      return lesson?.transcript && String(lesson.transcript).trim() !== '';
    });
  }

  get canGenerateOrShowQuiz(): boolean {
    // If quizzes already exist, allow showing them (only section needs to exist)
    if (this.hasQuiz) {
      return this.isExistingSection;
    }
    
    // For generating new quizzes, need:
    // 1. Section exists
    // 2. Has created lessons
    // 3. All lessons have transcripts
    return this.isExistingSection && this.hasCreatedLessons && this.allLessonsHaveTranscripts;
  }

  get totalSectionDuration(): number {
    const lessons = this.sectionForm.get('lessons')?.value || [];
    return lessons.reduce((sum: number, lesson: any) => {
      return sum + Number(lesson.videoDuration || 0);
    }, 0);
  }

  get totalLessonsCount(): number {
    const lessons = this.sectionForm.get('lessons')?.value || [];
    return lessons.length;
  }

  get isEmpty(): boolean {
    return this.totalLessonsCount === 0;
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  get sectionId(): string {
    return extractId(this.sectionForm.get('id')?.value) ?? '';
  }
}