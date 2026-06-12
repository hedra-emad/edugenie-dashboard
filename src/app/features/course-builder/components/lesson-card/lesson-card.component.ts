import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { inject } from '@angular/core';
import { LessonsService } from '../../../../core/services/lessons';
import { ActivatedRoute } from '@angular/router';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { ActionBarComponent } from "../shared/action-bar/action-bar.component";
import { finalize } from 'rxjs/operators';

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

  onVideoSelected(file: File) {
    console.log('START onVideoSelected');

    if (this.isUploading) return;

    this.isUploading = true;
    this.uploadError = false;

    console.log('BEFORE uploadVideo');

    this.cloudinaryService.uploadVideo(file)
      .pipe(
        finalize(() => {
          console.log('FINALIZE FIRED');
          this.isUploading = false;
        })
      )
      .subscribe({
        next: (res) => {
          console.log('UPLOAD SUCCESS');
          console.log(res);

          this.lessonForm.patchValue({
            videoUrl: res.secure_url,
            videoPublicId: res.public_id,
            uploadStatus: 'idle'
          });

          console.log('AFTER PATCH');
          console.log(this.lessonForm.value);
        },
        error: (err) => {
          console.log('UPLOAD ERROR');
          console.error(err);

          this.lessonForm.patchValue({
            uploadStatus: 'error'
          });
        }
      });

    console.log('AFTER uploadVideo');

    this.getVideoDuration(file).then((duration) => {
      console.log('Duration:', duration);

      this.lessonForm.patchValue({
        videoDuration: duration
      });


    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    this.onVideoSelected(file);
    console.log('file selected:', file);
  }

  getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');

      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration || 0));
      };
    });
  }

  saveLesson() {

    if (this.lessonForm.invalid) {
      this.lessonForm.markAllAsTouched();
      return;
    }

    if (this.isUploading) {
      alert('Please wait until video upload finishes');
      return;
    }

    const videoUrl = this.lessonForm.get('videoUrl')?.value;
    const videoPublicId = this.lessonForm.get('videoPublicId')?.value;
    const videoDuration = this.lessonForm.get('videoDuration')?.value;

    console.log('lesson form value', this.lessonForm.value);

    if (
      !videoUrl ||
      !videoPublicId ||
      videoDuration === null ||
      videoDuration === undefined
    ) {
      alert('Please upload a video first');
      return;
    }

    this.isSaving = true;

    const lessonId = this.lessonForm.get('id')?.value;

    const payload = {
      title: this.lessonForm.get('title')?.value,
      videoUrl,
      videoPublicId,
      videoDuration
    };

    console.log('Payload:', payload);
    console.log('courseId:', this.courseId);
    console.log('sectionId:', this.sectionId);

    if (lessonId) {

      this.lessonsService.updateLesson(
        this.courseId,
        this.sectionId,
        lessonId,
        payload
      ).subscribe({
        next: (res) => {
          console.log('Lesson updated successfully', res);
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Update lesson error:', err);
          this.isSaving = false;
        }
      });

    } else {

      this.lessonsService.addLesson(
        this.courseId,
        this.sectionId,
        payload
      ).subscribe({
        next: (res: any) => {

          console.log('Lesson created successfully', res);

          this.lessonForm.patchValue({
            id: res._id
          });



          this.isSaving = false;
        },
        error: (err) => {
          console.error('Create lesson error:', err);
          this.isSaving = false;
        }
      });

    }
  }

  deleteLesson() {
    const lessonId = this.lessonForm.get('id')?.value;

    console.log('isUploading =', this.isUploading);
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

  onMoveUp(event: Event) {
    event.stopPropagation();
    this.moveUp.emit();
  }

  onMoveDown(event: Event) {
    event.stopPropagation();
    this.moveDown.emit();
  }
}
