import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { CourseApprovalService } from '../../services/course-approval.service';
import { RejectedCourse, PageMeta, UnifiedCourse } from '../../models/course-approval.model';

@Component({
  selector: 'app-rejected-courses-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, DatePipe],
  templateUrl: './rejected-courses-table.component.html',
  styleUrl: './rejected-courses-table.component.css'
})
export class RejectedCoursesTableComponent implements OnInit, OnDestroy {
  private readonly service = inject(CourseApprovalService);
  private readonly router  = inject(Router);
  private readonly cdr     = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  courses: RejectedCourse[] = [];
  meta: PageMeta = {
    total: 0, page: 1, limit: 10,
    totalPages: 1, hasNextPage: false, hasPrevPage: false
  };
  loading = false;

  readonly pageSizeOptions = [10, 25, 50];

  ngOnInit(): void {
    // Subscribe to rejected courses (filter from unified courses$ stream)
    this.service.courses$
      .pipe(
        map((courses: UnifiedCourse[]) =>
          courses
            .filter(c => c.status === 'rejected')
            .map(c => ({
              courseId: c.id,
              title: c.title,
              instructorId: '',
              instructorName: c.instructorName,
              rejectionReason: c.rejectionReason || '',
              rejectedBy: c.rejectedBy || '',
              rejectedAt: c.rejectedAt || ''
            } as RejectedCourse))
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((courses: RejectedCourse[]) => {
        this.courses = courses;
        this.cdr.markForCheck();
      });

    this.service.rejectedPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((meta: PageMeta) => {
        this.meta = meta;
        this.cdr.markForCheck();
      });

    this.service.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading: boolean) => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    // Trigger initial load
    this.service.loadRejectedPage(1, this.meta.limit);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  navigateToCourse(course: RejectedCourse): void {
    this.router.navigate(['/admin/courses', course.courseId]);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.meta.totalPages;
    const cur   = this.meta.page - 1;   // 0-based for display logic
    let start = Math.max(0, cur - 2);
    let end   = Math.min(total - 1, start + 4);
    if (end - start < 4) start = Math.max(0, end - 4);
    for (let i = start; i <= end; i++) pages.push(i + 1);   // return 1-based
    return pages;
  }

  get pageFrom(): number {
    return this.meta.total === 0 ? 0 : (this.meta.page - 1) * this.meta.limit + 1;
  }

  get pageTo(): number {
    return Math.min(this.meta.page * this.meta.limit, this.meta.total);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.meta.totalPages) return;
    this.service.loadRejectedPage(page, this.meta.limit);
  }

  setPageSize(size: number): void {
    this.service.loadRejectedPage(1, size);
  }

  trackByCourseId(_index: number, course: RejectedCourse): string {
    return course.courseId;
  }
}
