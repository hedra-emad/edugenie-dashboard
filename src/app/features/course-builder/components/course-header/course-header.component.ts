import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BadgeComponent } from '../../../../shared/components/badge-component/badge-component';
import { CourseStatus } from '../../../../core/enums/course-status';

@Component({
  selector: 'app-course-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, BadgeComponent],
  templateUrl: './course-header.component.html',
  styleUrl: './course-header.component.css'
})
export class CourseHeaderComponent {
  @Input() courseStatus: CourseStatus = CourseStatus.DRAFT;
  @Input() hasUnsavedChanges = false;
  @Input() courseTitle: string | null = null;
  @Input() courseId: string | null = null;
  @Input() courseDuration: number = 0;
  @Input() canPublish: boolean = false;

  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}h ${m}m total length`;
    } else if (m > 0) {
      return `${m}m ${s}s total length`;
    } else {
      return `${s}s total length`;
    }
  }
}
