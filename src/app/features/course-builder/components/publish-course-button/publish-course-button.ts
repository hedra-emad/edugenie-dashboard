import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoursesService } from '../../../../core/services/courses';

@Component({
  selector: 'app-publish-course-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './publish-course-button.html',
})
export class PublishCourseButtonComponent {
  private coursesService = inject(CoursesService);

  @Input({ required: true })
  courseId: string | null = null;

  loading = signal(false);

  publishCourse() {
    if (!this.courseId || this.loading()) return;

    this.loading.set(true);

    this.coursesService.submitForReview(this.courseId).subscribe({
      next: (res) => {
        this.loading.set(false);

        alert(res.message);
      },
      error: (err) => {
        this.loading.set(false);

        alert(
          err?.error?.message ||
          'Failed to submit course for review'
        );
      }
    });
  }
}