import {
  Component, Input, ChangeDetectionStrategy,
  ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule, TitleCasePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CloudinaryThumbPipe } from '../../../../../shared/pipes/cloudinary-thumb.pipe';

@Component({
  selector: 'app-course-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, TitleCasePipe, DecimalPipe, CloudinaryThumbPipe],
  templateUrl: './course-preview.component.html',
  styleUrl: './course-preview.component.css'
})
export class CoursePreviewComponent {
  @Input() course: any = null;

  isVideoPlaying = false;

  get previewVideo(): string | null {
    return this.course?.previewVideoUrl || this.course?.previewVideo || null;
  }

  get thumbnail(): string | null {
    const t = this.course?.thumbnail;
    if (!t || t === 'video_library') return null;
    if (typeof t === 'string' && t.startsWith('http')) return t;
    if (t?.url) return t.url;
    return null;
  }

  get hasPreview(): boolean {
    return !!(this.previewVideo || this.thumbnail);
  }

  get instructorName(): string {
    const i = this.course?.instructor;
    if (!i) return this.course?.instructorName || 'Unknown';
    if (i.firstName || i.lastName) return `${i.firstName || ''} ${i.lastName || ''}`.trim();
    return i.name || 'Unknown';
  }

  get totalLessons(): number {
    if (this.course?.totalLessons) return this.course.totalLessons;
    return (this.course?.sections || []).reduce(
      (sum: number, s: any) => sum + (s.lessons?.length || 0), 0
    );
  }

  toggleVideo(): void {
    this.isVideoPlaying = !this.isVideoPlaying;
  }
}
