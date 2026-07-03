import { Component, Input, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CoursesService } from '../../../../core/services/courses';
import { ToastrService } from 'ngx-toastr';
import { CourseStatus } from '../../../../core/enums/course-status';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-publish-course-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './publish-course-button.html',
})
export class PublishCourseButtonComponent {
  private coursesService = inject(CoursesService);
  private toastr = inject(ToastrService);

  @Input({ required: true })
  courseId: string | null = null;

  @Input()
  set course(value: Course | null) {
    this._course.set(value);
  }
  get course(): Course | null {
    return this._course();
  }

  private _course = signal<Course | null>(null);

  loading = signal(false);

  constructor() {
    // Effect to log course changes
    effect(() => {
      const course = this._course();
      console.log('🔄 Course Updated:', course);
      if (course) {
        console.log('📊 Course Status:', course.courseStatus);
      }
    });
  }

  // Computed signal to check if button should be disabled
  isDisabled = computed(() => {
    if (!this.courseId || this.loading()) return true;
    const course = this._course();
    if (!course) return true;
    
    const { canSubmit } = this.coursesService.canSubmitForReview(course);
    return !canSubmit;
  });

  // Computed signal to check course status
  courseStatus = computed(() => {
    const course = this._course();
    const status = course?.courseStatus?.trim().toUpperCase() || 'DRAFT';
    console.log('🔍 Publish Button - Course Status Check:', {
      rawStatus: course?.courseStatus,
      normalizedStatus: status,
      courseId: course?.id,
      fullCourse: course
    });
    return status;
  });

  // Check if course is published
  isPublished = computed(() => {
    const status = this.courseStatus();
    const result = status === 'PUBLISHED';
    console.log('✅ Is Published:', result, 'Status:', status);
    return result;
  });

  // Check if course is under review
  isUnderReview = computed(() => {
    const status = this.courseStatus();
    const result = status === 'UNDER_REVIEW' || status === 'UNDER REVIEW' || status === 'UNDERREVIEW';
    console.log('⏳ Is Under Review:', result, 'Status:', status);
    return result;
  });

  // Check if button should be shown
  shouldShowButton = computed(() => {
    return !this.isPublished() && !this.isUnderReview();
  });

  // Helper text based on course status
  helperText = computed(() => {
    if (this.isPublished()) {
      return 'Your course has been published and is now live for students to enroll.';
    }
    
    if (this.isUnderReview()) {
      return 'Your course is currently under review by an administrator. You will be notified once it is approved or if changes are needed.';
    }
    
    // Draft status - check if can submit
    const course = this._course();
    if (!course) {
      return 'Ready to submit your course? Ensure all sections have approved quizzes. Your course will be reviewed by an administrator before it is published.';
    }

    const { canSubmit, missingQuizSections, hasNoLessons } = this.coursesService.canSubmitForReview(course);
    
    if (hasNoLessons) {
      return 'Add at least one lesson to your course and create approved quizzes for all sections to enable submission. Your course will be reviewed by an administrator before it is published.';
    }
    
    if (!canSubmit && missingQuizSections.length > 0) {
      return 'Ensure all sections have approved quizzes before submitting your course for review. Your course will be reviewed by an administrator before it is published.';
    }
    
    return 'Ready to submit your course? Ensure all sections have approved quizzes. Your course will be reviewed by an administrator before it is published.';
  });

  // Computed signal to get missing sections message
  missingQuizMessage = computed(() => {
    const course = this._course();
    if (!course) return null;
    
    const { canSubmit, missingQuizSections, hasNoLessons } = this.coursesService.canSubmitForReview(course);
    
    if (canSubmit) return null;
    
    if (hasNoLessons) {
      return 'Please add at least one lesson to your course before submitting for review';
    }
    
    if (missingQuizSections.length > 0) {
      const sectionList = missingQuizSections.map(s => `"${s}"`).join(', ');
      return `Please add and approve quizzes for: ${sectionList}`;
    }
    
    return 'Please ensure all sections have approved quizzes';
  });

  publishCourse() {
    if (!this.courseId || this.loading() || this.isDisabled()) return;

    this.loading.set(true);

    this.coursesService.submitForReview(this.courseId).subscribe({
      next: () => {
        this.loading.set(false);

        this.toastr.success('Your course has been sent for review and will be available once approved.');
        
        // Update the local course object status immediately
        const currentCourse = this._course();
        if (currentCourse) {
          this._course.set({
            ...currentCourse,
            courseStatus: 'UNDER_REVIEW'
          });
        }
        
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