import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';

import { LessonsService } from '../../../../core/services/lessons';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { ActionBarComponent } from "../shared/action-bar/action-bar.component";
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { ExpansionPanelComponent } from '../shared/expansion-panel/expansion-panel.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';
import { SubButtonComponent } from '../../../../shared/components/sub-button/sub-button.component';

type VideoState =
  | 'empty'
  | 'selected'
  | 'uploading'
  | 'uploaded'
  | 'error';

@Component({
  selector: 'app-lesson-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    ActionBarComponent,
    ExpansionPanelComponent,
    AppLoader,
    SubButtonComponent
  ],
  templateUrl: './lesson-card.component.html',
  styleUrl: './lesson-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonCardComponent {

  @Input({ required: true }) lessonForm!: FormGroup;
  @Input() index = 0;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input({ required: true }) courseId!: string;
  @Input({ required: true }) sectionId!: string;

  @Output() delete = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() durationChanged = new EventEmitter<void>();
  @Output() lessonCreated = new EventEmitter<{ index: number, id: string }>();

  private lessonsService = inject(LessonsService);
  private cloudinaryService = inject(CloudinaryService);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  isSaving = false;
  isUploading = false;
  private saveLock = false;

  uploadError = false;

  readonly MAX_DURATION = 10 * 60;

  selectedVideoFile: File | null = null;
  selectedVideoUrl: string | null = null;

  private toastr = inject(ToastrService);

  videoErrorMessage = '';

  videoState: VideoState = 'empty';

  get isUpdateMode(): boolean {
    const value = this.lessonForm.get('id')?.value;
    return !!value;
  }

  get isVideoValid(): boolean {
    const hasExistingVideo = !!this.lessonForm.get('videoUrl')?.value;
    return !!this.selectedVideoFile || hasExistingVideo;
  }

  get isFormChanged(): boolean {
    return this.lessonForm.dirty || !!this.selectedVideoFile;
  }

  get showActionBar(): boolean {
    if (this.isUpdateMode) return true;
    return !!(this.lessonForm.get('title')?.valid && this.isVideoValid);
  }

  get isActionDisabled(): boolean {
    if (this.lessonForm.invalid || !this.isVideoValid || this.isUploading || this.isSaving) {
      return true;
    }
    if (this.isUpdateMode && !this.isFormChanged) {
      return true;
    }
    return false;
  }

  // ---------------- FILE CHANGE ----------------
  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    const file = input.files[0];

    this.videoErrorMessage = '';
    this.uploadError = false;

    // reset previous preview
    if (this.selectedVideoUrl) {
      URL.revokeObjectURL(this.selectedVideoUrl);
    }

    this.selectedVideoUrl = URL.createObjectURL(file);

    try {
      const duration = await this.getVideoDuration(file);

      if (duration > this.MAX_DURATION) {
        this.selectedVideoFile = null;
        this.selectedVideoUrl = null;
        this.lessonForm.patchValue({ videoDuration: 0 });

        this.videoErrorMessage = 'Video must not exceed 10 minutes';
        this.videoState = 'error';

        input.value = '';
        this.cdr.markForCheck();
        return;
      }

      console.log('VIDEO SELECTED', file);
      console.log('PREVIEW URL', this.selectedVideoUrl);

      this.selectedVideoFile = file;

      this.lessonForm.patchValue({
        videoDuration: duration
      });

      this.videoState = 'selected';
      this.cdr.markForCheck();

    } catch (err) {
      console.error(err);

      this.selectedVideoFile = null;
      this.selectedVideoUrl = null;

      this.videoState = 'error';

      input.value = '';
      this.cdr.markForCheck();
    }
  }

  // ---------------- GET DURATION ----------------
  getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');

      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);

        resolve(Math.round(video.duration || 0));
      };

      video.onerror = () => resolve(0);
    });
  }

  // ---------------- REMOVE ----------------
  removeSelectedVideo() {
    this.selectedVideoFile = null;

    if (this.selectedVideoUrl) {
      URL.revokeObjectURL(this.selectedVideoUrl);
    }

    this.selectedVideoUrl = null;

    this.videoErrorMessage = '';

    this.videoState = 'empty';
    this.cdr.markForCheck();
  }

  // ---------------- SAVE ----------------
  saveLesson() {
    // Protection against repeated clicks during upload or save
    if (this.saveLock || this.isUploading) return;

    if (this.isUpdateMode && !this.isFormChanged) return;

    this.saveLock = true;
    this.lessonForm.markAllAsTouched();

    if (this.lessonForm.invalid || !this.isVideoValid) {
      this.saveLock = false;
      return;
    }

    this.uploadAndSave();
  }

  // ---------------- UPLOAD ----------------
  private uploadAndSave() {

    if (this.selectedVideoFile) {

      this.getVideoDuration(this.selectedVideoFile).then(duration => {

        if (duration > this.MAX_DURATION) {
          this.videoErrorMessage = 'Video must not exceed limit';
          this.selectedVideoFile = null;
          this.saveLock = false;
          this.cdr.markForCheck();
          return;
        }

        this.startUpload();
      });

    } else {
      this.createOrUpdateLesson();
    }
  }

  private startUpload() {
    this.isUploading = true;
    this.videoState = 'uploading';
    this.cdr.markForCheck();

    const lessonId = this.lessonForm.get('id')?.value ?? 'new';

    this.cloudinaryService.uploadVideo(
      this.selectedVideoFile!,
      this.courseId,
      this.sectionId,
    )
      .pipe(
        finalize(() => {
          this.isUploading = false;
          this.cdr.markForCheck();
        })
      )

      .subscribe({
        next: (res) => {
          console.log('UPLOAD SUCCESS', res);

          this.isUploading = false;

          const patchData: any = {
            videoUrl: res.secure_url,
            videoPublicId: res.public_id
          };

          if (res.duration && isFinite(res.duration)) {
            patchData.videoDuration = Math.max(1, Math.round(res.duration));
          }

          this.lessonForm.patchValue(patchData);
          this.durationChanged.emit();

          this.selectedVideoFile = null;
          this.selectedVideoUrl = null;

          this.videoState = 'uploaded';
          this.cdr.markForCheck();

          this.createOrUpdateLesson();
        },
        error: (err) => {
          console.log('UPLOAD FAILED', err);
          console.error(err);
          this.isUploading = false;
          this.videoState = 'error';
          this.uploadError = true;
          this.saveLock = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ---------------- CREATE / UPDATE ----------------
  private createOrUpdateLesson() {
    const lessonId = this.lessonForm.get('id')?.value;

    let dur = Number(this.lessonForm.get('videoDuration')?.value);
    if (!isFinite(dur) || isNaN(dur)) dur = 0;
    const finalDuration = Math.max(1, Math.round(dur));

    const payload = {
      title: this.lessonForm.get('title')?.value,
      videoUrl: this.lessonForm.get('videoUrl')?.value,
      videoPublicId: this.lessonForm.get('videoPublicId')?.value,
      videoDuration: finalDuration,
      duration: finalDuration,
      isFree: false
    };

    console.log('CREATE LESSON PAYLOAD', payload);

    this.isSaving = true;
    this.cdr.markForCheck();

    const req = lessonId
      ? this.lessonsService.updateLesson(this.courseId, this.sectionId, lessonId, payload)
      : this.lessonsService.addLesson(this.courseId, this.sectionId, payload);

    req.pipe(
      finalize(() => {
        this.isSaving = false;
        this.saveLock = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res: any) => {
        const currentSection = res.find(
          (section: any) => section._id === this.sectionId
        );



        const lessons = currentSection?.lessons || [];



        if (!lessonId) {
          const createdLesson = lessons[lessons.length - 1];
          const incomingId = createdLesson?._id;

          if (incomingId) {
            this.lessonForm.patchValue({
              id: incomingId
            });

            this.lessonForm.get('id')?.updateValueAndValidity();

            this.lessonCreated.emit({
              index: this.index,
              id: incomingId
            });
          }
        }

        this.lessonForm.markAsPristine();
        this.lessonForm.markAsUntouched();

        this.toastr.success(
          lessonId
            ? 'Lesson updated successfully'
            : 'Lesson created successfully'
        );

        this.cdr.detectChanges();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Something went wrong');
      }
    });
  }

  // ---------------- DELETE ----------------
  deleteLesson() {
    const lessonId = this.lessonForm.get('id')?.value;

    if (!lessonId) {
      this.delete.emit();
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Lesson?', message: 'This cannot be undone.' }
    });

    ref.afterClosed().subscribe(result => {
      if (result !== 'confirm') return;
      this.lessonsService.deleteLesson(this.courseId, this.sectionId, lessonId)
        .subscribe({ next: () => this.delete.emit() });
    });
  }

  onMoveUp(e: Event) {
    e.stopPropagation();
    this.moveUp.emit();
  }

  onMoveDown(e: Event) {
    e.stopPropagation();
    this.moveDown.emit();
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  isExpanded(): boolean {
    return this.lessonForm.get('expanded')?.value;
  }

  setExpanded(value: boolean) {
    this.lessonForm.get('expanded')?.setValue(value);
  }


}