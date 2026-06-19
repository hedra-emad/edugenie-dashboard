import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { CourseApprovalService } from '../../course-approvals/services/course-approval.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-course-details-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FormsModule, DatePipe, TitleCasePipe],
  templateUrl: './course-details-page.component.html',
  styleUrl: './course-details-page.component.css'
})
export class CourseDetailsPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CourseApprovalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();

  courseId: string | null = null;
  course: any = null;
  loading = true;
  error = false;
  actionLoading = false;

  showRejectModal = false;
  rejectReason = '';

  expandedSections: Record<number, boolean> = {};
  playingVideoLessonId: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.courseId = params.get('id');
      if (this.courseId) {
        this.loadCourse(this.courseId);
      } else {
        this.router.navigate(['/admin/course-approvals']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCourse(id: string): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();

    this.service.getCourseById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.course = data;
        // Auto-expand first section
        if (this.course?.sections?.length > 0) {
          this.expandedSections[0] = true;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.toastr.error('Failed to load course details');
        this.cdr.markForCheck();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/course-approvals']);
  }

  toggleSection(index: number): void {
    this.expandedSections[index] = !this.expandedSections[index];
    this.cdr.markForCheck();
  }

  toggleVideoPreview(lessonKey: string): void {
    this.playingVideoLessonId = this.playingVideoLessonId === lessonKey ? null : lessonKey;
    this.cdr.markForCheck();
  }

  getTotalLessons(): number {
    if (!this.course?.sections) return 0;
    return this.course.sections.reduce(
      (total: number, section: any) => total + (section.lessons?.length || 0), 0
    );
  }

  approveCourse(): void {
    if (!this.courseId || this.actionLoading) return;
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.service.approveCourse(this.courseId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (success) => {
        this.actionLoading = false;
        if (success) {
          this.course = { ...this.course, status: 'approved' };
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectReason = '';
    this.cdr.markForCheck();
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.cdr.markForCheck();
  }

  confirmReject(): void {
    if (!this.courseId || !this.rejectReason.trim() || this.actionLoading) return;
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.service.rejectCourse(this.courseId, this.rejectReason.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.actionLoading = false;
          if (success) {
            this.showRejectModal = false;
            this.course = { ...this.course, status: 'rejected' };
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.actionLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  getInstructorInitials(): string {
    if (!this.course?.instructor) return 'I';
    const first = this.course.instructor.firstName?.charAt(0) || '';
    const last = this.course.instructor.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'I';
  }

  getInstructorName(): string {
    if (!this.course?.instructor) return 'Unknown Instructor';
    const { firstName, lastName, name } = this.course.instructor;
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    return name || 'Unknown Instructor';
  }
}
