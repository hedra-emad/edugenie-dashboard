import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { LessonsService } from '../../../../core/services/lessons';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { ActionBarComponent } from "../shared/action-bar/action-bar.component";

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
    ActionBarComponent
  ],
  templateUrl: './lesson-card.component.html',
  styleUrl: './lesson-card.component.css'
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

  private lessonsService = inject(LessonsService);
  private cloudinaryService = inject(CloudinaryService);

  isSaving = false;
  isUploading = false;

  uploadError = false;

  readonly MAX_DURATION = 10 * 60;

  selectedVideoFile: File | null = null;
  selectedVideoUrl: string | null = null;

  videoErrorMessage = '';

  videoState: VideoState = 'empty';

  get isVideoValid(): boolean {
    const hasExistingVideo = !!this.lessonForm.get('videoUrl')?.value;
    return !!this.selectedVideoFile || hasExistingVideo;
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

        this.videoErrorMessage = 'Video must not exceed 10 seconds';
        this.videoState = 'error';

        input.value = '';
        return;
      }

      this.selectedVideoFile = file;

      this.lessonForm.patchValue({
        videoDuration: duration
      });

      this.videoState = 'selected';

    } catch (err) {
      console.error(err);

      this.selectedVideoFile = null;
      this.selectedVideoUrl = null;

      this.videoState = 'error';

      input.value = '';
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
}

  // ---------------- SAVE ----------------
  saveLesson() {

    if (this.isUploading || this.isSaving) return;

    this.lessonForm.markAllAsTouched();

    if (this.lessonForm.invalid) return;

    if (!this.isVideoValid) {
      this.videoErrorMessage = 'Video is required';
      return;
    }

    if (this.videoErrorMessage) return;

    this.uploadAndSave();
  }

  // ---------------- UPLOAD ----------------
  private uploadAndSave() {

    if (this.selectedVideoFile) {

      this.getVideoDuration(this.selectedVideoFile).then(duration => {

        if (duration > this.MAX_DURATION) {
          this.videoErrorMessage = 'Video must not exceed limit';
          this.selectedVideoFile = null;
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

    this.cloudinaryService.uploadVideo(this.selectedVideoFile!)
      .subscribe({
        next: (res) => {

          this.isUploading = false;

          this.lessonForm.patchValue({
            videoUrl: res.secure_url,
            videoPublicId: res.public_id
          });

          this.selectedVideoFile = null;
          this.selectedVideoUrl = null;

          this.videoState = 'uploaded';

          this.createOrUpdateLesson();
        },
        error: (err) => {
          console.error(err);
          this.isUploading = false;
          this.videoState = 'error';
          this.uploadError = true;
        }
      });
  }

  // ---------------- CREATE / UPDATE ----------------
  private createOrUpdateLesson() {

    const lessonId = this.lessonForm.get('id')?.value;

    const payload = {
      title: this.lessonForm.get('title')?.value,
      videoUrl: this.lessonForm.get('videoUrl')?.value,
      videoPublicId: this.lessonForm.get('videoPublicId')?.value,
      videoDuration: this.lessonForm.get('videoDuration')?.value
    };

    this.isSaving = true;

    const req = lessonId
      ? this.lessonsService.updateLesson(this.courseId, this.sectionId, lessonId, payload)
      : this.lessonsService.addLesson(this.courseId, this.sectionId, payload);

    req.subscribe({
      next: (res: any) => {
        this.isSaving = false;

        if (!lessonId) {
          this.lessonForm.patchValue({ id: res._id });
        }

        this.selectedVideoFile = null;
        this.videoState = 'uploaded';
      },
      error: (err) => {
        console.error(err);
        this.isSaving = false;
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

    this.lessonsService.deleteLesson(
      this.courseId,
      this.sectionId,
      lessonId
    ).subscribe({
      next: () => this.delete.emit()
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
}