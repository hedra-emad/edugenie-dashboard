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
import { takeUntil } from 'rxjs/operators';

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

import { ViewChild } from '@angular/core';
import { ExpansionPanelComponent } from '../shared/expansion-panel/expansion-panel.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SubButtonComponent } from '../../../../shared/components/sub-button/sub-button.component';
import { MainButtonComponent } from '../../../../shared/components/main-button/main-button.component';
import { extractId } from '../../pages/section-builder/section-builder.component';

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
export class SectionCardComponent implements OnInit, OnDestroy {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sectionsService = inject(SectionsService);
  private draftStateService = inject(DraftStateService);
  private formDraftIntegration = inject(FormDraftIntegrationService);
  
  // Lifecycle management
  private destroy$ = new Subject<void>();

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
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  // ================= Draft State =================
  draftId: string = '';
  hasDraftData = false;

  // Utility function to truncate names for toastr messages
  private truncateName(name: string, maxLength: number = 40): string {
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
  }

  ngOnDestroy() {
    this.cleanup();
  }

  ngOnChanges() {
    if (this.expanded) {
      setTimeout(() => {
        const panel = document.querySelector('.mat-expansion-panel.mat-expanded');
        panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
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

    const payload = {
      title: form.get('title')?.value,
      description: form.get('description')?.value,
      expectedOutcomes: this.expectedOutcomesArray.value
        .filter((o: string) => o?.trim()),
      price: form.get('price')?.value !== null ? Number(form.get('price')?.value) : null,
      order: this.index
    };


    this.isSaving = true;

    const request = sectionId
      ? this.sectionsService.updateSection(this.courseId, sectionId, payload)
      : this.sectionsService.addSection(this.courseId, payload);

    request.subscribe({
      next: (res: any) => {
        this.isSaving = false;

        const isNewSection = !sectionId;

        if (isNewSection) {
          const createdSection = Array.isArray(res) ? res[res.length - 1] : res;

          const incomingId = extractId(createdSection);

          if (incomingId) {
            if (!form.contains('id')) {
              form.addControl('id', new FormControl(incomingId));
            } else {
              form.get('id')?.setValue(incomingId);
            }

            form.get('id')?.updateValueAndValidity();
          }
        }

        const sectionTitle = form.get('title')?.value || 'Section';
        const truncatedTitle = this.truncateName(sectionTitle);
        if (!sectionId) {
          this.toastr.success(`"${truncatedTitle}" created successfully`);
        } else {
          this.toastr.success(`"${truncatedTitle}" updated successfully`);
        }

        // Clear draft state after successful save
        this.clearDraftAfterSave();

        // Disconnect old draft ID explicitly
        this.formDraftIntegration.disconnectForm(this.draftId);

        // Re-initialize draft system with the new real ID
        this.initializeDraftSystem();

        form.markAsPristine();
        form.updateValueAndValidity();
        this.cdr.markForCheck();
      },

      error: () => {
        this.isSaving = false;
        this.cdr.markForCheck();
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

  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}