import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { CourseApprovalService } from '../services/course-approval.service';
import { CourseApproval, AdminStats } from '../models/course-approval.model';
import { ApprovalsTableComponent } from '../components/approvals-table/approvals-table.component';

@Component({
  selector: 'app-course-approvals-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, ApprovalsTableComponent],
  templateUrl: './course-approvals-page.component.html',
  styleUrl: './course-approvals-page.component.css'
})
export class CourseApprovalsPageComponent implements OnInit, OnDestroy {
  private readonly service = inject(CourseApprovalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  courses: CourseApproval[] = [];
  stats: AdminStats | null = null;
  loading = false;
  actionLoading: Record<string, boolean> = {};

  // Bulk selection
  selectedCourseIds = new Set<string>();
  isBulkActionLoading = false;
  showSelectedModal = false;

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
        this.courses = courses;
        this.stats = stats;
        this.loading = loading;
        this.actionLoading = actionLoading;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Single Actions ---
  onViewCourse(course: CourseApproval): void {
    this.router.navigate(['/admin/courses', course.id]);
  }

  onApprove(courseId: string): void {
    this.service.approveCourse(courseId).pipe(takeUntil(this.destroy$)).subscribe();
  }

  onReject(event: { id: string; reason: string }): void {
    this.service.rejectCourse(event.id, event.reason).pipe(takeUntil(this.destroy$)).subscribe();
  }

  // --- Selection ---
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

  // --- Selected Modal ---
  openSelectedModal(): void {
    this.showSelectedModal = true;
    this.cdr.markForCheck();
  }

  closeSelectedModal(): void {
    this.showSelectedModal = false;
    this.cdr.markForCheck();
  }

  removeFromSelection(courseId: string): void {
    const newSet = new Set(this.selectedCourseIds);
    newSet.delete(courseId);
    this.selectedCourseIds = newSet;
    this.cdr.markForCheck();
    if (this.selectedCourseIds.size === 0) {
      this.closeSelectedModal();
    }
  }

  // --- Bulk Actions (forkJoin — parallel execution) ---
  bulkApprove(): void {
    if (this.selectedCourseIds.size === 0) return;
    this.isBulkActionLoading = true;
    this.cdr.markForCheck();

    forkJoin(Array.from(this.selectedCourseIds).map(id => this.service.approveCourse(id)))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isBulkActionLoading = false;
          this.selectedCourseIds = new Set();
          this.closeSelectedModal();
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  bulkReject(): void {
    if (this.selectedCourseIds.size === 0) return;
    this.isBulkActionLoading = true;
    this.cdr.markForCheck();

    forkJoin(Array.from(this.selectedCourseIds).map(id =>
      this.service.rejectCourse(id, 'Bulk rejection by admin')
    ))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isBulkActionLoading = false;
          this.selectedCourseIds = new Set();
          this.closeSelectedModal();
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }
}
