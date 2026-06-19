import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef
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
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
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
    ExpansionPanelComponent,

  ],
  templateUrl: './section-card.component.html',
  styleUrl: './section-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionCardComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sectionsService = inject(SectionsService);

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

  @ViewChild('panel') panel!: MatExpansionPanel;




  preventScrollChange(event: Event) {
    (event.target as HTMLElement).blur();
  }

  // ================= Lifecycle =================
  ngOnChanges() {
    if (this.expanded) {
      setTimeout(() => {
        const panel = document.querySelector('.mat-expansion-panel.mat-expanded');
        panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  private cdr = inject(ChangeDetectorRef);

  // ================= SAVE (CREATE / UPDATE) =================
  saveSection() {
    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }
    const form = this.sectionForm;

    const sectionId = extractId(form.get('id')?.value);

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

          this.toastr.success('Section created successfully');
        } else {
          this.toastr.success('Section updated successfully');
        }

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
    const sectionId = extractId(rawId);

    if (!sectionId) {
      this.delete.emit(this.index);
      return;
    }

    this.isDeleting = true;

    this.sectionsService.deleteSection(this.courseId, String(sectionId))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.delete.emit(this.index);
        },
        error: (err) => {
          console.error('Delete error:', err);
          this.isDeleting = false;
          this.toastr.error('Delete failed');
        }
      });
  }


  cancelDelete(event: Event) {
    event.stopPropagation();
    this.showDeleteConfirm = false;
  }

  // ================= NAVIGATION =================
  onGoToLessons() {
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
    return !!this.sectionForm.get('id')?.value;
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