import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { CourseApprovalService } from '../services/course-approval.service';
import { CourseApproval, AdminStats } from '../models/course-approval.model';
import { ApprovalsTableComponent, FilterType } from '../components/approvals-table/approvals-table.component';

@Component({
  selector: 'app-course-approvals-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, ApprovalsTableComponent],
  templateUrl: './course-approvals-page.component.html',
  styleUrl: './course-approvals-page.component.css'
})
export class CourseApprovalsPageComponent implements OnInit, OnDestroy {
  private readonly service = inject(CourseApprovalService);
  private readonly cdr     = inject(ChangeDetectorRef);
  private readonly router  = inject(Router);
  private readonly destroy$ = new Subject<void>();

  courses: CourseApproval[] = [];
  /** Tracks the active filter tab in the table so the page can gate the bulk toolbar */
  activeTableFilter: FilterType = 'pending';
  stats: AdminStats | null = null;
  loading = false;
  private initialTabSet = false;
  actionLoading: Record<string, boolean> = {};

  // ── Bulk selection ────────────────────────────────────────────────────────
  selectedCourseIds  = new Set<string>();
  bulkApproveLoading = false;   // independent flag for Approve All button
  bulkRejectLoading  = false;   // independent flag for Reject All button
  showSelectedModal  = false;

  // ── Reject modal (shared by single-course AND bulk reject) ────────────────
  showRejectModal     = false;
  rejectTargetId:      string | null = null;  // null when bulk
  rejectTargetTitle    = '';
  rejectReason         = '';
  rejectReasonTouched  = false;
  isRejectLoading      = false;
  /** true → modal is operating on all selected courses, not a single one */
  isBulkRejectMode     = false;

  ngOnInit(): void {
    this.service.loadData();

    combineLatest([
      this.service.courses$,
      this.service.stats$,
      this.service.loading$,
      this.service.actionLoading$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([courses, stats, loading, actionLoading]) => {
        this.courses      = courses;
        this.stats        = stats;
        this.loading      = loading;
        this.actionLoading = actionLoading;

        if (stats && !this.initialTabSet) {
          this.activeTableFilter = stats.underReview > 0 ? 'pending' : 'all';
          this.initialTabSet = true;
        }

        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Single actions ────────────────────────────────────────────────────────
  onViewCourse(course: CourseApproval): void {
    this.router.navigate(['/admin/courses', course.id]);
  }

  onApprove(courseId: string): void {
    this.service.approveCourse(courseId).pipe(takeUntil(this.destroy$)).subscribe();
  }

  /** Table reject button → open modal (no loading yet) */
  onRejectRequest(courseId: string): void {
    const course = this.courses.find(c => c.id === courseId);
    this.rejectTargetId     = courseId;
    this.rejectTargetTitle  = course?.title ?? '';
    this.rejectReason       = '';
    this.rejectReasonTouched = false;
    this.isBulkRejectMode   = false;
    this.showRejectModal    = true;
    this.cdr.markForCheck();
  }

  // ── Reject modal shared logic ─────────────────────────────────────────────
  closeRejectModal(): void {
    if (this.isRejectLoading) return;          // block close while in-flight
    this.showRejectModal     = false;
    this.rejectTargetId      = null;
    this.rejectReason        = '';
    this.rejectReasonTouched = false;
    this.isBulkRejectMode    = false;
    this.cdr.markForCheck();
  }

  confirmReject(): void {
    this.rejectReasonTouched = true;
    const reason = this.rejectReason.trim();
    if (!reason || this.isRejectLoading) return;
    if (!this.isBulkRejectMode && !this.rejectTargetId) return;

    this.isRejectLoading = true;
    this.cdr.markForCheck();

    if (this.isBulkRejectMode) {
      // ── Bulk reject path ──────────────────────────────────────────────────
      const ids = Array.from(this.selectedCourseIds);
      forkJoin(ids.map(id => this.service.rejectCourse(id, reason)))
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isRejectLoading = false;
            this.bulkRejectLoading = false;
            this.rejectTargetId = null;
            this.cdr.markForCheck();
          })
        )
        .subscribe(() => {
          this.selectedCourseIds = new Set();
          this.showRejectModal    = false;
          this.rejectReason       = '';
          this.rejectReasonTouched = false;
          this.isBulkRejectMode   = false;
          this.closeSelectedModal();
          this.cdr.markForCheck();
        });
    } else {
      // ── Single reject path ────────────────────────────────────────────────
      const courseId = this.rejectTargetId!;
      this.service.rejectCourse(courseId, reason)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isRejectLoading = false;
            this.rejectTargetId  = null;       // clears row loading indicator
            this.cdr.markForCheck();
          })
        )
        .subscribe(success => {
          if (success) {
            this.showRejectModal     = false;
            this.rejectReason        = '';
            this.rejectReasonTouched = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  onSelectionChange(selectedIds: Set<string>): void {
    this.selectedCourseIds = selectedIds;
    this.cdr.markForCheck();
  }

  get selectedCourses(): CourseApproval[] {
    return this.courses.filter(c => this.selectedCourseIds.has(c.id));
  }

  clearSelection(): void {
    this.selectedCourseIds = new Set();
    this.cdr.markForCheck();
  }

  // ── Selected-courses modal ────────────────────────────────────────────────
  openSelectedModal(): void {
    this.showSelectedModal = true;
    this.cdr.markForCheck();
  }

  closeSelectedModal(): void {
    this.showSelectedModal = false;
    this.cdr.markForCheck();
  }

  removeFromSelection(courseId: string): void {
    const next = new Set(this.selectedCourseIds);
    next.delete(courseId);
    this.selectedCourseIds = next;
    this.cdr.markForCheck();
    if (next.size === 0) this.closeSelectedModal();
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  bulkApprove(): void {
    if (this.selectedCourseIds.size === 0) return;
    this.bulkApproveLoading = true;
    this.cdr.markForCheck();

    forkJoin(Array.from(this.selectedCourseIds).map(id => this.service.approveCourse(id)))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.bulkApproveLoading = false;
          this.selectedCourseIds  = new Set();
          this.closeSelectedModal();
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  /**
   * Bulk reject — opens the confirmation modal instead of firing immediately.
   * Loading starts only after the admin confirms in the modal.
   */
  bulkRejectRequest(): void {
    if (this.selectedCourseIds.size === 0) return;
    this.rejectReason        = '';
    this.rejectReasonTouched = false;
    this.rejectTargetId      = null;
    this.rejectTargetTitle   = '';
    this.isBulkRejectMode    = true;
    this.showRejectModal     = true;
    this.cdr.markForCheck();
  }
}
