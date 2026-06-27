import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  @Input({ required: true }) courseId!: string;
  @Input() sectionId?: string;
  @Input() lessonId?: string;

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

  // Inline upload form state
  pendingFile = signal<File | null>(null);
  pendingTitle = signal('');
  isPublicToggle = signal(false);
  fileError = signal<string | null>(null);

  // Constants exposed to template
  readonly MAX_SIZE = MAX_ATTACHMENT_FILE_SIZE_BYTES;
  readonly MAX_COUNT = MAX_ATTACHMENTS_PER_PARENT;
  readonly ACCEPTED_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.png,.jpg,.jpeg,.csv,.md';

  // ─── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAttachments();
  }

  // ─── Data Loading ──────────────────────────────────────────
  loadAttachments(): void {
    this.isLoading.set(true);
    this.attachmentsService
      .listForInstructor(this.courseId, this.sectionId, this.lessonId)
      .subscribe({
        next: (list) => {
          this.attachments.set(list);
          this.isLoading.set(false);
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
    return this.attachments().length >= this.MAX_COUNT;
  }

  get isLessonLevel(): boolean {
    return this.parentType === AttachmentParentType.LESSON;
  }

  get countLabel(): string {
    return `${this.attachments().length}/${this.MAX_COUNT}`;
  }

  // ─── File Selection ────────────────────────────────────────
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
    if (!editing && !file) return; // New upload requires file

    this.isUploading.set(true);
    this.fileError.set(null);

    // If there's a new file (create or edit)
    if (file) {
      const folder = this.buildFolder();
      this.cloudinaryService.uploadAttachment(file, folder).subscribe({
        next: (cloudRes) => {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          
          if (editing) {
            // EDIT MODE WITH NEW FILE
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
                this.attachments.update((list) =>
                  list.map((a) => (a.id === editing.id ? updatedAttachment : a))
                );
                this.isUploading.set(false);
                this.cancelPending();
                this.toastr.success(`"${title}" updated successfully`);
                this.cdr.markForCheck();
              },
              error: (err) => {
                this.cloudinaryService.deleteAttachmentAsset(cloudRes.public_id).subscribe();
                this.isUploading.set(false);
                const msg = err?.error?.message || 'Failed to update attachment';
                this.toastr.error(msg);
                this.cdr.markForCheck();
              },
            });
          } else {
            // CREATE MODE
            const payload: CreateAttachmentPayload = {
              title,
              originalFilename: file.name,
              fileUrl: cloudRes.secure_url,
              filePublicId: cloudRes.public_id,
              fileType: cloudRes.format || ext,
              fileSize: cloudRes.bytes || file.size,
              isPublic: this.isLessonLevel ? false : this.isPublicToggle(),
            };

            this.attachmentsService
              .create(this.courseId, payload, this.sectionId, this.lessonId)
              .subscribe({
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
                  const msg = err?.error?.message || 'Failed to save attachment';
                  this.toastr.error(msg);
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
      // EDIT MODE, NO NEW FILE
      const payload: Partial<Attachment> = {
        title,
        isPublic: this.isLessonLevel ? false : this.isPublicToggle(),
      };

      this.attachmentsService.update(editing.id, payload).subscribe({
        next: (updatedAttachment) => {
          this.attachments.update((list) =>
            list.map((a) => (a.id === editing.id ? updatedAttachment : a))
          );
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
  private buildFolder(): string {
    const base = `edugenie/courses/attachments/${this.courseId}`;
    if (this.sectionId && this.lessonId) {
      return `${base}/sections/${this.sectionId}/lessons/${this.lessonId}`;
    }
    if (this.sectionId) {
      return `${base}/sections/${this.sectionId}`;
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

  private truncateName(name: string, maxLength: number = 40): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }
}
