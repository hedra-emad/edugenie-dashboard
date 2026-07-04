import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { AttachmentsService } from '../../../../core/services/attachments';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import {
  Attachment,
  AttachmentParentType,
  CreateAttachmentPayload,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_PARENT,
} from '../../../../core/models/attachment.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-attachment-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    AppLoader,
  ],
  templateUrl: './attachment-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentManagerComponent implements OnInit {
  // ─── Inputs ────────────────────────────────────────────────
  @Input({ required: true }) parentType!: AttachmentParentType;
  @Input() courseId?: string | null;
  @Input() sectionId?: string;
  @Input() lessonId?: string;

  // ─── ViewChild ─────────────────────────────────────────────
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  // ─── Services ──────────────────────────────────────────────
  private attachmentsService = inject(AttachmentsService);
  private cloudinaryService = inject(CloudinaryService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  // ─── State ─────────────────────────────────────────────────
  attachments = signal<Attachment[]>([]);
  isLoading = signal(true);
  isUploading = signal(false);
  deletingId = signal<string | null>(null);
  updatingId = signal<string | null>(null);
  editingAttachment = signal<Attachment | null>(null);
  pendingAttachments = signal<{ id: string; file: File; title: string; isPublic: boolean; failed?: boolean; error?: string }[]>([]);

  // Inline upload form state
  pendingFile = signal<File | null>(null);
  pendingTitle = signal('');
  isPublicToggle = signal(false);
  fileError = signal<string | null>(null);

  // Expand/collapse state (mirrors PreviewVideoUploadComponent)
  expanded = signal(false);

  // Drag and drop state
  isDraggingOver = signal(false);

  // Constants exposed to template
  readonly MAX_SIZE = MAX_ATTACHMENT_FILE_SIZE_BYTES;
  readonly MAX_COUNT = MAX_ATTACHMENTS_PER_PARENT;
  readonly ACCEPTED_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.png,.jpg,.jpeg,.csv,.md';

  toggle(): void {
    this.expanded.set(!this.expanded());
  }

  get isPendingMode(): boolean {
    return !this.courseId
      || (this.parentType === AttachmentParentType.SECTION && !this.sectionId)
      || (this.parentType === AttachmentParentType.LESSON && !this.lessonId);
  }

  // ─── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    if (this.courseId) {
      this.loadAttachments();
    } else {
      // No parent yet — nothing to fetch, queue mode only
      this.isLoading.set(false);
    }

    // Auto-expand if there's already something worth showing
    if (this.pendingAttachments().length > 0) {
      this.expanded.set(true);
    }
  }

  // ─── Data Loading ──────────────────────────────────────────
  loadAttachments(): void {
    if (!this.courseId) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
          this.attachmentsService
        .listForInstructor(this.courseId, this.sectionId!)
        .subscribe({
        next: (list) => {
          this.attachments.set(list);
          this.isLoading.set(false);
          if (list.length > 0) this.expanded.set(true);
          this.cdr.markForCheck();
        },
        error: () => {
          this.attachments.set([]);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Computed helpers ──────────────────────────────────────
  get isAtLimit(): boolean {
    return (this.attachments().length + this.pendingAttachments().length) >= this.MAX_COUNT;
  }

  get isLessonLevel(): boolean {
    return this.parentType === AttachmentParentType.LESSON;
  }

  get countLabel(): string {
    return `${this.attachments().length}/${this.MAX_COUNT}`;
  }

  // ─── File Selection ────────────────────────────────────────
  onUploadZoneClick(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    input.value = ''; // reset so re-selecting same file triggers change

    this.fileError.set(null);

    // Validate size
    if (file.size > this.MAX_SIZE) {
      this.fileError.set(`File exceeds the 25 MB limit (${this.formatFileSize(file.size)})`);
      return;
    }

    // Validate count
    if (this.isAtLimit) {
      this.fileError.set(`Maximum ${this.MAX_COUNT} attachments reached`);
      return;
    }

    // Default title from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    this.pendingTitle.set(nameWithoutExt);
    this.pendingFile.set(file);
    this.isPublicToggle.set(false);
  }

  cancelPending(): void {
    this.pendingFile.set(null);
    this.pendingTitle.set('');
    this.isPublicToggle.set(false);
    this.fileError.set(null);
    this.editingAttachment.set(null);
  }

  editAttachment(attachment: Attachment): void {
    // If already editing this attachment, allow toggling to cancel
    if (this.editingAttachment()?.id === attachment.id) {
      this.cancelPending();
      return;
    }
    
    // Cancel any existing edit mode first
    if (this.editingAttachment()) {
      this.cancelPending();
    }
    
    // Now enter edit mode for the clicked attachment
    this.editingAttachment.set(attachment);
    this.pendingTitle.set(attachment.title);
    this.isPublicToggle.set(attachment.isPublic);
    this.pendingFile.set(null);
    this.fileError.set(null);
  }

  // ─── Save Flow ───────────────────────────────────────────
  confirmSave(): void {
    const file = this.pendingFile();
    const title = this.pendingTitle().trim();
    const editing = this.editingAttachment();

    if (!title) return;
    if (!editing && !file) return;

    // ── PENDING MODE: no parent entity yet ──────────────────────
    if (this.isPendingMode) {
      if (!file) return; // editing doesn't apply pre-creation
      if (this.pendingAttachments().length + this.attachments().length >= this.MAX_COUNT) {
        this.fileError.set(`Maximum ${this.MAX_COUNT} attachments reached`);
        return;
      }

      this.pendingAttachments.update(list => [
        ...list,
        { id: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`, file, title, isPublic: this.isLessonLevel ? false : this.isPublicToggle() }
      ]);
      this.cancelPending();
      this.cdr.markForCheck();
      return;
    }

    // ── EXISTING MODE: parent already exists, behave as before ──
    this.isUploading.set(true);
    this.fileError.set(null);

    if (file) {
      const folder = this.buildFolder();
      this.cloudinaryService.uploadAttachment(file, folder).subscribe({
        next: (cloudRes) => {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';

          if (editing) {
            const payload: Partial<Attachment> = {
              title,
              isPublic: this.isLessonLevel ? false : this.isPublicToggle(),
              fileUrl: cloudRes.secure_url,
              filePublicId: cloudRes.public_id,
              fileType: cloudRes.format || ext,
              fileSize: cloudRes.bytes || file.size,
              originalFilename: file.name,
            };
            this.attachmentsService.update(editing.id, payload).subscribe({
              next: (updatedAttachment) => {
                this.attachments.update((list) => list.map((a) => (a.id === editing.id ? updatedAttachment : a)));
                this.isUploading.set(false);
                this.cancelPending();
                this.toastr.success(`"${title}" updated successfully`);
                this.cdr.markForCheck();
              },
              error: (err) => {
                this.cloudinaryService.deleteAttachmentAsset(cloudRes.public_id).subscribe();
                this.isUploading.set(false);
                this.toastr.error(err?.error?.message || 'Failed to update attachment');
                this.cdr.markForCheck();
              },
            });
          } else {
            const payload: CreateAttachmentPayload = {
              title,
              originalFilename: file.name,
              fileUrl: cloudRes.secure_url,
              filePublicId: cloudRes.public_id,
              fileType: cloudRes.format || ext,
              fileSize: cloudRes.bytes || file.size,
              isPublic: this.isLessonLevel ? false : this.isPublicToggle(),
            };
          this.attachmentsService.create(this.courseId!, payload, this.sectionId!).subscribe({
              next: (attachment) => {
                this.attachments.update((list) => [...list, attachment]);
                this.isUploading.set(false);
                this.cancelPending();
                this.toastr.success(`"${title}" uploaded successfully`);
                this.cdr.markForCheck();
              },
              error: (err) => {
                this.cloudinaryService.deleteAttachmentAsset(cloudRes.public_id).subscribe();
                this.isUploading.set(false);
                this.toastr.error(err?.error?.message || 'Failed to save attachment');
                this.cdr.markForCheck();
              },
            });
          }
        },
        error: () => {
          this.isUploading.set(false);
          this.toastr.error('File upload failed. Please try again.');
          this.cdr.markForCheck();
        },
      });
    } else if (editing) {
      const payload: Partial<Attachment> = { title, isPublic: this.isLessonLevel ? false : this.isPublicToggle() };
      this.attachmentsService.update(editing.id, payload).subscribe({
        next: (updatedAttachment) => {
          this.attachments.update((list) => list.map((a) => (a.id === editing.id ? updatedAttachment : a)));
          this.isUploading.set(false);
          this.cancelPending();
          this.toastr.success(`"${title}" updated successfully`);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isUploading.set(false);
          this.toastr.error('Failed to update attachment');
          this.cdr.markForCheck();
        },
      });
    }
  }

  removeQueued(id: string): void {
    this.pendingAttachments.update(list => list.filter(p => p.id !== id));
  }

  // ─── Delete Flow ───────────────────────────────────────────
  requestDelete(attachment: Attachment): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Attachment?',
        message: `"${attachment.title}" will be permanently removed.`,
        confirmLabel: 'Delete',
      },
    });

    ref.afterClosed().subscribe((result) => {
      if (result === 'confirm') {
        this.executeDelete(attachment);
      }
    });
  }

  private executeDelete(attachment: Attachment): void {
    this.deletingId.set(attachment.id);

    this.attachmentsService.remove(attachment.id).subscribe({
      next: () => {
        this.attachments.update((list) => list.filter((a) => a.id !== attachment.id));
        this.deletingId.set(null);
        this.toastr.success(`"${attachment.title}" deleted`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingId.set(null);
        this.toastr.error('Failed to delete attachment');
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Update Flow ───────────────────────────────────────────
  toggleVisibility(attachment: Attachment): void {
    if (this.isLessonLevel) return; // Lesson attachments are always private

    this.updatingId.set(attachment.id);
    const newIsPublic = !attachment.isPublic;

    this.attachmentsService.update(attachment.id, { isPublic: newIsPublic }).subscribe({
      next: (updatedAttachment) => {
        this.attachments.update((list) =>
          list.map((a) => (a.id === attachment.id ? updatedAttachment : a))
        );
        this.updatingId.set(null);
        this.toastr.success(`"${attachment.title}" is now ${newIsPublic ? 'public' : 'private'}`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.updatingId.set(null);
        this.toastr.error('Failed to update attachment visibility');
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────
  private buildFolder(courseId: string = this.courseId!, sectionId = this.sectionId, lessonId = this.lessonId): string {
    const base = `edugenie/courses/attachments/${courseId}`;
    if (sectionId && lessonId) {
      return `${base}/sections/${sectionId}/lessons/${lessonId}`;
    }
    if (sectionId) {
      return `${base}/sections/${sectionId}`;
    }
    return `${base}/course`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(fileType: string): string {
    const type = (fileType || '').toLowerCase();
    if (type === 'pdf') return 'picture_as_pdf';
    if (['doc', 'docx'].includes(type)) return 'description';
    if (['xls', 'xlsx', 'csv'].includes(type)) return 'table_chart';
    if (['ppt', 'pptx'].includes(type)) return 'slideshow';
    if (['zip', 'rar', 'gz', '7z'].includes(type)) return 'folder_zip';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(type)) return 'image';
    if (['txt', 'md'].includes(type)) return 'article';
    return 'insert_drive_file';
  }

  trackById(_index: number, attachment: Attachment): string {
    return attachment.id;
  }

  trackPendingById(_index: number, p: { id: string }): string {
    return p.id;
  }

  private truncateName(name: string, maxLength = 40): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }

  /**
   * Uploads every queued (pending) attachment and creates its DB record,
   * now that the parent entity exists. Called by the page component right
   * after course/section/lesson creation succeeds.
   *
   * Failures don't kill the batch — failed items stay in pendingAttachments()
   * (flagged) so the user can retry just those, without re-selecting files.
   */
  flushPending(courseId: string, sectionId?: string, lessonId?: string): Observable<Attachment[]> {
    const queue = this.pendingAttachments();
    if (queue.length === 0) return of([]);

    this.isUploading.set(true);
    const folder = this.buildFolder(courseId, sectionId, lessonId);

    const tasks = queue.map(item =>
      this.cloudinaryService.uploadAttachment(item.file, folder).pipe(
        switchMap(cloudRes => {
          const ext = item.file.name.split('.').pop()?.toLowerCase() || '';
          const payload: CreateAttachmentPayload = {
            title: item.title,
            originalFilename: item.file.name,
            fileUrl: cloudRes.secure_url,
            filePublicId: cloudRes.public_id,
            fileType: cloudRes.format || ext,
            fileSize: cloudRes.bytes || item.file.size,
            isPublic: item.isPublic,
          };
          
          return this.attachmentsService.create(courseId, payload, sectionId!).pipe(
            map(attachment => ({ ok: true as const, id: item.id, attachment })),
            catchError(err => {
              // DB record failed after upload succeeded — best-effort cleanup of orphaned asset
              this.cloudinaryService.deleteAttachmentAsset(cloudRes.public_id).subscribe();
              return of({ ok: false as const, id: item.id, error: err?.error?.message || 'Failed to save attachment' });
            })
          );
        }),
        catchError(err => of({ ok: false as const, id: item.id, error: 'Upload failed' }))
      )
    );

    return forkJoin(tasks).pipe(
      map(results => {
        const succeededIds = new Set(results.filter(r => r.ok).map(r => r.id));
        const succeeded = results.filter((r): r is { ok: true; id: string; attachment: Attachment } => r.ok);

        // Keep only failed items in the queue (flagged), drop succeeded ones
        this.pendingAttachments.update(list =>
          list
            .filter(p => !succeededIds.has(p.id))
            .map(p => {
              const failure = results.find(r => r.id === p.id && !r.ok) as { error: string } | undefined;
              return failure ? { ...p, failed: true, error: failure.error } : p;
            })
        );

        this.attachments.update(list => [...list, ...succeeded.map(s => s.attachment)]);
        this.isUploading.set(false);
        if (succeeded.length > 0 || this.attachments().length > 0) this.expanded.set(true);
        this.cdr.markForCheck();

        if (this.pendingAttachments().some(p => p.failed)) {
          this.toastr.warning(`${succeeded.length}/${queue.length} attachments uploaded. Some failed — you can retry them.`);
        }

        return succeeded.map(s => s.attachment);
      })
    );
  }

  /** Retry a single failed queued attachment after a flush partially failed. */
  retryQueued(id: string, courseId?: string, sectionId?: string, lessonId?: string): void {
    if (!courseId) return; // shouldn't happen — failed items only exist post-creation
    const item = this.pendingAttachments().find(p => p.id === id);
    if (!item) return;

    this.pendingAttachments.update(list => list.map(p => p.id === id ? { ...p, failed: false, error: undefined } : p));
    this.flushPending(courseId, sectionId, lessonId).subscribe();
  }

  // ─── Drag and Drop ────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isAtLimit) {
      this.isDraggingOver.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Only take the first file if multiple are dropped
    const file = files[0];
    this.fileError.set(null);

    // Validate size
    if (file.size > this.MAX_SIZE) {
      this.fileError.set(`File exceeds the 25 MB limit (${this.formatFileSize(file.size)})`);
      return;
    }

    // Validate count
    if (this.isAtLimit) {
      this.fileError.set(`Maximum ${this.MAX_COUNT} attachments reached`);
      return;
    }

    // Default title from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    this.pendingTitle.set(nameWithoutExt);
    this.pendingFile.set(file);
    this.isPublicToggle.set(false);
    this.expanded.set(true);
  }
}