import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, withLatestFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { CourseApprovalService } from '../../course-approvals/services/course-approval.service';
import { ToastrService } from 'ngx-toastr';
import { ApproveCourseDialogComponent } from '../../../../shared/components/dialogs/approve-course-dialog/approve-course-dialog.component';
import { RejectCourseDialogComponent } from '../../../../shared/components/dialogs/reject-course-dialog/reject-course-dialog.component';

@Component({
  selector: 'app-course-details-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    RouterModule,
    MatIconModule,
    MatTabsModule,
    FormsModule, 
    DatePipe, 
    TitleCasePipe,
    ApproveCourseDialogComponent,
    RejectCourseDialogComponent
  ],
  templateUrl: './course-details-page.component.html',
  styleUrl: './course-details-page.component.css'
})
export class CourseDetailsPageComponent implements OnInit, OnDestroy {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly service = inject(CourseApprovalService);
  private readonly cdr     = inject(ChangeDetectorRef);
  private readonly toastr  = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();

  courseId: string | null = null;
  course:   any = null;
  loading  = true;
  error    = false;

  // ── Per-button loading — independent flags ────────────────────────────────
  approveLoading = false;
  rejectLoading  = false;

  // ── Approve modal ──────────────────────────────────────────────────────────
  showApproveModal = false;

  // ── Reject modal ──────────────────────────────────────────────────────────
  showRejectModal      = false;

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
    this.error   = false;
    this.cdr.markForCheck();

    this.service.getCourseById(id).pipe(
      withLatestFrom(this.service.courses$),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([data, courses]) => {
        const cached = courses.find(c => c.id === id);
        this.course = { 
          ...data, 
          status: cached?.status || this.service.normalizeStatus(data),
          rejectionReason: cached?.rejectionReason || data.rejectionReason,
          rejectedBy: cached?.rejectedBy || data.rejectedBy,
          rejectedAt: cached?.rejectedAt || data.rejectedAt
        };
        if (this.course?.sections?.length > 0) {
          this.expandedSections[0] = true;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = true;
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
    this.playingVideoLessonId =
      this.playingVideoLessonId === lessonKey ? null : lessonKey;
    this.cdr.markForCheck();
  }

  getTotalLessons(): number {
    if (!this.course?.sections) return 0;
    return this.course.sections.reduce(
      (total: number, section: any) => total + (section.lessons?.length || 0), 0
    );
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'under_review': return 'Pending Review'; // fallback
      case 'published': return 'Published';
      case 'rejected': return 'Rejected';
      case 'draft': return 'Draft';
      case 'archived': return 'Archived';
      default: return 'Pending Review';
    }
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  openApproveModal(): void {
    if (this.approveLoading || this.rejectLoading) return;
    this.showApproveModal = true;
    this.cdr.markForCheck();
  }

  closeApproveModal(): void {
    if (this.approveLoading) return;
    this.showApproveModal = false;
    this.cdr.markForCheck();
  }

  confirmApprove(): void {
    if (!this.courseId || this.approveLoading || this.rejectLoading) return;
    this.approveLoading = true;
    this.cdr.markForCheck();

    this.service.approveCourse(this.courseId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.approveLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(success => {
        if (success) {
          this.showApproveModal = false;
          this.course = { ...this.course, status: 'published' };
          this.cdr.markForCheck();
        }
      });
  }

  // ── Reject modal ──────────────────────────────────────────────────────────

  /** Open modal — no loading starts here */
  openRejectModal(): void {
    if (this.approveLoading || this.rejectLoading) return;
    this.showRejectModal     = true;
    this.cdr.markForCheck();
  }

  /** Close modal — allowed any time unless API is in-flight */
  closeRejectModal(): void {
    if (this.rejectLoading) return;
    this.showRejectModal     = false;
    this.cdr.markForCheck();
  }

  /** Confirm rejection — loading starts only here, after admin submits */
  confirmReject(reason: string): void {
    if (!this.courseId || this.rejectLoading) return;

    this.rejectLoading = true;
    this.cdr.markForCheck();

    this.service.rejectCourse(this.courseId, reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.rejectLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(success => {
        if (success) {
          this.showRejectModal = false;
          this.course = { ...this.course, status: 'rejected', rejectionReason: reason };
          this.cdr.markForCheck();
        }
      });
  }

  getInstructorInitials(): string {
    if (!this.course?.instructor) return 'I';
    const first = this.course.instructor.firstName?.charAt(0) || '';
    const last  = this.course.instructor.lastName?.charAt(0)  || '';
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

  getInstructorEmail(): string {
    if(!this.course?.instructor) return 'Unknown Instructor';
    const { email } = this.course.instructor;
    console.log(this.course);
    console.log(this.course.instructor);
    if(email) return email
    return 'No email provided';
  }
}
