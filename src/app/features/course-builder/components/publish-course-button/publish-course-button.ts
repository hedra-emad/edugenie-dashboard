import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoursesService } from '../../../../core/services/courses';
import { ToastrService } from 'ngx-toastr';
import { CourseStatus } from '../../../../core/enums/course-status';

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

  private toastr = inject(ToastrService);

  publishCourse() {
    if (!this.courseId || this.loading()) return;

    this.loading.set(true);

    this.coursesService.submitForReview(this.courseId).subscribe({
      next: (res) => {
        this.loading.set(false);

        this.toastr.success('Your course has been sent for review and will be available once approved.');
        
        if (this.courseId) {
          this.coursesService.notifyCourseStatusChanged(this.courseId, CourseStatus.UNDER_REVIEW);
        }
      },
      error: (err) => {
        this.loading.set(false);

        this.toastr.error(
          err?.error?.message ||
          'Failed to submit course for review'
        );
      }
    });
  }
}