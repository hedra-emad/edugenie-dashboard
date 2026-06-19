import {
  Component, EventEmitter, Input, Output,
  OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CourseApproval, ApprovalStatus } from '../../models/course-approval.model';
import { ApprovalRowComponent } from '../approval-row/approval-row.component';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-approvals-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, ApprovalRowComponent],
  templateUrl: './approvals-table.component.html',
  styleUrl: './approvals-table.component.css'
})
export class ApprovalsTableComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() courses: CourseApproval[] = [];
  @Input() actionLoading: Record<string, boolean> = {};
  @Input() selectedIds = new Set<string>();

  @Output() viewDetails = new EventEmitter<CourseApproval>();
  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();
  @Output() selectionChange = new EventEmitter<Set<string>>();

  currentFilter: FilterType = 'pending';
  searchQuery = '';
  private debouncedSearchQuery = '';
  private searchSubject = new Subject<string>();
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.debouncedSearchQuery = query;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  onRowClick(course: CourseApproval): void {
    this.router.navigate(['/admin/courses', course.id]);
  }

  // --- Filter Counts ---
  get pendingCount(): number  { return this.courses.filter(c => c.status === 'pending').length; }
  get approvedCount(): number { return this.courses.filter(c => c.status === 'approved').length; }
  get rejectedCount(): number { return this.courses.filter(c => c.status === 'rejected').length; }
  get totalCount(): number    { return this.courses.length; }

  get badgeCount(): number {
    switch (this.currentFilter) {
      case 'pending':  return this.pendingCount;
      case 'approved': return this.approvedCount;
      case 'rejected': return this.rejectedCount;
      default:         return this.totalCount;
    }
  }

  get cardTitle(): string {
    switch (this.currentFilter) {
      case 'pending':  return 'Pending Review';
      case 'approved': return 'Approved Courses';
      case 'rejected': return 'Rejected Courses';
      default:         return 'All Courses';
    }
  }

  // --- Filtered Courses ---
  get filteredCourses(): CourseApproval[] {
    let result = this.courses;

    if (this.currentFilter !== 'all') {
      result = result.filter(c => c.status === this.currentFilter);
    }

    const q = this.debouncedSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.instructorName.toLowerCase().includes(q) ||
        (c.category as string).toLowerCase().includes(q)
      );
    }

    return result;
  }

  // --- Selection ---
  get allSelected(): boolean {
    const fc = this.filteredCourses;
    return fc.length > 0 && fc.every(c => this.selectedIds.has(c.id));
  }

  get someSelected(): boolean {
    return this.filteredCourses.some(c => this.selectedIds.has(c.id)) && !this.allSelected;
  }

  toggleAll(): void {
    const newSelection = new Set(this.selectedIds);
    if (this.allSelected) {
      this.filteredCourses.forEach(c => newSelection.delete(c.id));
    } else {
      this.filteredCourses.forEach(c => newSelection.add(c.id));
    }
    this.selectionChange.emit(newSelection);
  }

  toggleRow(id: string): void {
    const newSelection = new Set(this.selectedIds);
    newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
    this.selectionChange.emit(newSelection);
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  trackByCourseId(_index: number, course: CourseApproval): string {
    return course.id;
  }
}
