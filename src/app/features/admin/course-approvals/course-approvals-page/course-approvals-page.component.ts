import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { CourseApprovalService } from '../services/course-approval.service';
import { CourseApproval, Category } from '../models/course-approval.model';
import { ApprovalsTableComponent } from '../components/approvals-table/approvals-table.component';
import { CategoriesPanelComponent } from '../components/categories-panel/categories-panel.component';

@Component({
  selector: 'app-course-approvals-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, ApprovalsTableComponent, CategoriesPanelComponent],
  templateUrl: './course-approvals-page.component.html',
  styleUrl: './course-approvals-page.component.css'
})
export class CourseApprovalsPageComponent implements OnInit, OnDestroy {
  private readonly service = inject(CourseApprovalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  courses: CourseApproval[] = [];
  categories: Category[] = [];
  loading = false;
  actionLoading: Record<string, boolean> = {};
  successMessage: string | null = null;
  errorMessage: string | null = null;

  private successTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Load initial data
    this.service.loadData();

    // Subscribe to all state streams
    combineLatest([
      this.service.courses$,
      this.service.categories$,
      this.service.loading$,
      this.service.actionLoading$,
      this.service.success$,
      this.service.error$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([courses, categories, loading, actionLoading, success, error]) => {
        this.courses = courses;
        this.categories = categories;
        this.loading = loading;
        this.actionLoading = actionLoading;

        if (success) {
          this.successMessage = success;
          this.errorMessage = null;
          // Auto-clear after 3s
          if (this.successTimeout) clearTimeout(this.successTimeout);
          this.successTimeout = setTimeout(() => {
            this.successMessage = null;
            this.service.clearSuccess();
            this.cdr.markForCheck();
          }, 3000);
        }

        if (error) {
          this.errorMessage = error;
          this.successMessage = null;
        }

        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.successTimeout) clearTimeout(this.successTimeout);
  }

  onApprove(courseId: string): void {
    this.service.approveCourse(courseId).pipe(takeUntil(this.destroy$)).subscribe();
  }

  onReject(courseId: string): void {
    this.service.rejectCourse(courseId).pipe(takeUntil(this.destroy$)).subscribe();
  }

  onAddCategory(name: string): void {
    this.service.addCategory(name);
  }

  onUpdateCategory(event: { id: string; name: string }): void {
    this.service.updateCategory(event.id, event.name);
  }

  onDeleteCategory(id: string): void {
    this.service.deleteCategory(id);
  }

  onReorderCategories(categories: Category[]): void {
    this.service.updateCategoriesList(categories);
  }

  get pendingCount(): number {
    return this.courses.filter(c => c.status === 'pending').length;
  }

  dismissSuccess(): void {
    this.successMessage = null;
    this.service.clearSuccess();
  }

  dismissError(): void {
    this.errorMessage = null;
    this.service.clearError();
  }
}
