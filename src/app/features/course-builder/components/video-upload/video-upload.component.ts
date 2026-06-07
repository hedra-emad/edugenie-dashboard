import { Component, Input, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UploadStatusComponent } from '../upload-status/upload-status.component';

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, UploadStatusComponent],
  templateUrl: './video-upload.component.html',
  styleUrl: './video-upload.component.css'
})
export class VideoUploadComponent {
  @Input({ required: true }) lessonForm!: FormGroup;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private uploadIntervalId: any = null;

  get status(): 'idle' | 'uploading' | 'success' | 'error' | 'videoTooLong' {
    return this.lessonForm.get('uploadStatus')?.value || 'idle';
  }

  get progress(): number {
    return this.lessonForm.get('uploadProgress')?.value || 0;
  }

  get fileName(): string | null {
    return this.lessonForm.get('videoFile')?.value || null;
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.startSimulatedUpload(file.name);
    }
  }

  // Simulations
  setIdle() {
    this.clearSimulation();
    this.lessonForm.patchValue({
      videoFile: null,
      uploadStatus: 'idle',
      uploadProgress: 0
    });
    this.lessonForm.markAsDirty();
  }

  startSimulatedUpload(name: string = 'intro-to-angular.mp4') {
    this.clearSimulation();
    this.lessonForm.patchValue({
      videoFile: name,
      uploadStatus: 'uploading',
      uploadProgress: 0
    });
    this.lessonForm.markAsDirty();

    let currentProgress = 0;
    this.uploadIntervalId = setInterval(() => {
      currentProgress += 10;
      this.lessonForm.patchValue({ uploadProgress: currentProgress });
      if (currentProgress >= 100) {
        this.clearSimulation();
        this.lessonForm.patchValue({ uploadStatus: 'success' });
      }
    }, 250);
  }

  setErrorState() {
    this.clearSimulation();
    this.lessonForm.patchValue({
      videoFile: 'intro-to-angular.mp4',
      uploadStatus: 'error',
      uploadProgress: 0
    });
    this.lessonForm.markAsDirty();
  }

  setTooLongState() {
    this.clearSimulation();
    this.lessonForm.patchValue({
      videoFile: 'large-course-video.mp4',
      uploadStatus: 'videoTooLong',
      uploadProgress: 0
    });
    this.lessonForm.markAsDirty();
  }

  setSuccessDirectly() {
    this.clearSimulation();
    this.lessonForm.patchValue({
      videoFile: 'intro-to-angular.mp4',
      uploadStatus: 'success',
      uploadProgress: 100
    });
    this.lessonForm.markAsDirty();
  }

  private clearSimulation() {
    if (this.uploadIntervalId) {
      clearInterval(this.uploadIntervalId);
      this.uploadIntervalId = null;
    }
  }
}
