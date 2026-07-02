import {
  Component, EventEmitter, Input, Output,
  OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ApprovalRowComponent } from '../approval-row/approval-row.component';
import { CourseApprovalService } from '../../services/course-approval.service';
import { CourseApproval } from '../../models/course-approval.model';

export type FilterType = 'all' | 'pending' | 'published' | 'rejected';

@Component({
  selector: 'app-approvals-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, ApprovalRowComponent],
  templateUrl: './approvals-table.component.html',
  styleUrl: './approvals-table.component.css'
})
export class ApprovalsTableComponent implements OnInit, OnDestroy {
  private readonly router  = inject(Router);
  private readonly cdr     = inject(ChangeDetectorRef);
  private readonly service = inject(CourseApprovalService);
  private readonly destroy$ = new Subject<void>();

  @Input() courses: CourseApproval[] = [];

  @Input() set actionLoading(val: Record<string, boolean>) {
    this._actionLoading = val;
    for (const id of Object.keys(this._approveLoading)) {
      if (!val[id]) delete this._approveLoading[id];
    }
    for (const id of Object.keys(this._rejectLoading)) {
      if (!val[id]) delete this._rejectLoading[id];
    }
  }
  get actionLoading(): Record<string, boolean> { return this._actionLoading; }
  private _actionLoading: Record<string, boolean> = {};

  _approveLoading: Record<string, boolean> = {};
  _rejectLoading:  Record<string, boolean> = {};

  @Input() selectedIds = new Set<string>();

  @Output() viewDetails    = new EventEmitter<CourseApproval>();
  @Output() approve        = new EventEmitter<string>();
  @Output() reject         = new EventEmitter<string>();
  @Output() selectionChange = new EventEmitter<Set<string>>();
  @Output() filterChange    = new EventEmitter<FilterType>();

  @Input() currentFilter: FilterType = 'pending';
  searchQuery = '';
  private debouncedSearchQuery = '';
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // ── Pagination ─────────────────────────────────────────────────────────────
  pageSize  = 10;
  pageIndex = 0;
  readonly pageSizeOptions = [10, 25, 50];

  /**
   * For the pending tab, total comes from the backend response.
   * For all other tabs, total is computed from the local filtered list.
   */
  private pendingTotal = 0;   // populated from pendingPage$ subscription
  private rejectedTotal = 0;  // populated from stats$ subscription

  ngOnInit(): void {
    // Debounced search
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.debouncedSearchQuery = query;
      this.pageIndex = 0;
      if (this.currentFilter === 'pending') {
        this.service.loadPendingPage(1, this.pageSize, query);
      }
      this.cdr.markForCheck();
    });

    // Track backend pending-page metadata
    this.service.pendingPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(meta => {
        this.pendingTotal = meta.total;
        this.cdr.markForCheck();
      });

    // Track backend stats for rejected total
    this.service.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        if (stats) {
          this.rejectedTotal = stats.rejected;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  onRowClick(course: CourseApproval): void {
    this.router.navigate(['/admin/courses', course.id]);
  }

  onApprove(courseId: string): void {
    this.approve.emit(courseId);
  }

  onReject(courseId: string): void {
    this.reject.emit(courseId);
  }

  @Input() set rejectConfirmedId(id: string | null) {
    if (id) {
      this._rejectLoading[id] = true;
      this.cdr.markForCheck();
    }
  }

  @Input() set approveConfirmedId(id: string | null) {
    if (id) {
      this._approveLoading[id] = true;
      this.cdr.markForCheck();
    }
  }

  isApproveLoading(courseId: string): boolean { return !!this._approveLoading[courseId]; }
  isRejectLoading(courseId: string):  boolean { return !!this._rejectLoading[courseId]; }

  // ── Filter counts (from full in-memory list) ──────────────────────────────
  get pendingCount():  number { return this.courses.filter(c => c.status === 'pending').length; }
  get publishedCount(): number { return this.courses.filter(c => c.status === 'published').length; }
  get rejectedCount(): number { return this.rejectedTotal; }
  get totalCount():    number { return this.courses.length; }

  get badgeCount(): number {
    switch (this.currentFilter) {
      case 'pending':  return this.pendingTotal || this.pendingCount;
      case 'published': return this.publishedCount;
      case 'rejected': return this.rejectedCount;
      default:         return this.totalCount;
    }
  }

  get cardTitle(): string {
    switch (this.currentFilter) {
      case 'pending':  return 'Pending Review';
      case 'published': return 'Published Courses';
      case 'rejected': return 'Rejected Courses';
      default:         return 'All Courses';
    }
  }

  // ── Local filtered list (non-pending tabs + frontend search) ──────────────
  get filteredCourses(): CourseApproval[] {
    let result = this.courses;
    if (this.currentFilter !== 'all') {
      result = result.filter(c => c.status === this.currentFilter);
    }
    const q = this.debouncedSearchQuery.trim().toLowerCase();
    if (q && this.currentFilter !== 'pending') {
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.instructorName.toLowerCase().includes(q) ||
        (c.category as string).toLowerCase().includes(q)
      );
    }
    return result;
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  /** Total courses for the current filter/page context */
  get totalFiltered(): number {
    return this.currentFilter === 'pending'
      ? (this.pendingTotal || this.pendingCount)
      : this.filteredCourses.length;
  }

  get totalPages(): number { return Math.ceil(this.totalFiltered / this.pageSize); }
  get pageFrom():   number { return this.totalFiltered === 0 ? 0 : this.pageIndex * this.pageSize + 1; }
  get pageTo():     number { return Math.min((this.pageIndex + 1) * this.pageSize, this.totalFiltered); }

  /**
   * For pending tab: the service already delivers the correct page slice into courses$.
   * For other tabs: slice locally.
   */
  get pagedCourses(): CourseApproval[] {
    if (this.currentFilter === 'pending') {
      // The service puts exactly the current page's pending courses into courses$
      return this.courses.filter(c => c.status === 'pending');
    }
    const start = this.pageIndex * this.pageSize;
    return this.filteredCourses.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const cur   = this.pageIndex;
    let start = Math.max(0, cur - 2);
    const end   = Math.min(total - 1, start + 4);
    if (end - start < 4) start = Math.max(0, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  setPage(p: number): void {
    if (p < 0 || p >= this.totalPages) return;
    this.pageIndex = p;

    if (this.currentFilter === 'pending') {
      this.service.loadPendingPage(p + 1, this.pageSize, this.debouncedSearchQuery);
    }
    this.cdr.markForCheck();
  }

  setPageSize(size: number): void {
    this.pageSize  = size;
    this.pageIndex = 0;

    if (this.currentFilter === 'pending') {
      this.service.loadPendingPage(1, size, this.debouncedSearchQuery);
    }
    this.cdr.markForCheck();
  }

  // ── Filter tabs ────────────────────────────────────────────────────────────
  /** Selection (checkbox + bulk actions) is ONLY valid on the pending tab */
  get isReadonlyTab(): boolean {
    return this.currentFilter !== 'pending';
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.pageIndex     = 0;
    this.filterChange.emit(filter);

    if (filter === 'pending') {
      this.service.loadPendingPage(1, this.pageSize, this.debouncedSearchQuery);
    }
    this.cdr.markForCheck();
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  get allSelected(): boolean {
    const fc = this.pagedCourses;
    return fc.length > 0 && fc.every(c => this.selectedIds.has(c.id));
  }

  get someSelected(): boolean {
    return this.pagedCourses.some(c => this.selectedIds.has(c.id)) && !this.allSelected;
  }

  get selectedCount(): number { return this.selectedIds.size; }

  toggleAll(): void {
    const newSelection = new Set(this.selectedIds);
    if (this.allSelected) {
      this.pagedCourses.forEach(c => newSelection.delete(c.id));
    } else {
      this.pagedCourses.forEach(c => newSelection.add(c.id));
    }
    this.selectionChange.emit(newSelection);
  }

  toggleRow(id: string): void {
    const newSelection = new Set(this.selectedIds);
    newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
    this.selectionChange.emit(newSelection);
  }

  trackByCourseId(_index: number, course: CourseApproval): string { return course.id; }
}
