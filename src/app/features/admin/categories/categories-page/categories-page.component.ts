import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { CourseApprovalService } from '../../course-approvals/services/course-approval.service';
import { Category } from '../../course-approvals/models/course-approval.model';

type SortOption = 'newest' | 'oldest' | 'az' | 'za';

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Component({
  selector: 'app-categories-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FormsModule, DatePipe],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.css'
})
export class CategoriesPageComponent implements OnInit, OnDestroy {
  private readonly service = inject(CourseApprovalService);
  private readonly cdr     = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  categories: Category[] = [];
  loading = true;

  // ── Search & Sort ──────────────────────────────────────────────────────────
  searchQuery = '';
  sortOption: SortOption = 'newest';
  showSortDropdown = false;

  // ── Pagination ─────────────────────────────────────────────────────────────
  pageSize  = 10;
  pageIndex = 0;
  readonly pageSizeOptions = [10, 25, 50];

  // ── Modals ─────────────────────────────────────────────────────────────────
  showCategoryModal  = false;
  modalMode: 'create' | 'edit' = 'create';
  editingCategory: Category | null = null;
  isSubmitting = false;

  catName            = '';
  catSlug            = '';
  catNameTouched     = false;
  catSlugTouched     = false;
  slugManuallyEdited = false;

  showDeleteModal    = false;
  categoryToDelete: Category | null = null;
  isDeleting         = false;

  ngOnInit(): void {
    this.service.loadData();

    combineLatest([
      this.service.categories$,
      this.service.loading$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([categories, loading]) => {
        this.categories = categories;
        this.loading    = loading;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  get totalCategories(): number { return this.categories.length; }

  get addedThisMonth(): number {
    const now = new Date();
    return this.categories.filter(c => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }

  // ── Computed list ──────────────────────────────────────────────────────────
  get filteredSorted(): Category[] {
    const q = this.searchQuery.trim().toLowerCase();
    let result = q
      ? this.categories.filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.slug || '').toLowerCase().includes(q))
      : [...this.categories];

    switch (this.sortOption) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); break;
      case 'az':     result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'za':     result.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return result;
  }

  get totalFiltered(): number { return this.filteredSorted.length; }

  get pagedCategories(): Category[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredSorted.slice(start, start + this.pageSize);
  }

  get totalPages():  number { return Math.ceil(this.totalFiltered / this.pageSize); }
  get pageFrom():    number { return this.totalFiltered === 0 ? 0 : this.pageIndex * this.pageSize + 1; }
  get pageTo():      number { return Math.min((this.pageIndex + 1) * this.pageSize, this.totalFiltered); }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const cur   = this.pageIndex;
    let start = Math.max(0, cur - 2);
    let end   = Math.min(total - 1, start + 4);
    if (end - start < 4) start = Math.max(0, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  onSearchChange():              void { this.pageIndex = 0; }
  setSort(opt: SortOption):      void { this.sortOption = opt; this.showSortDropdown = false; this.pageIndex = 0; }
  setPage(p: number):            void { if (p >= 0 && p < this.totalPages) this.pageIndex = p; }
  setPageSize(size: number):     void { this.pageSize = size; this.pageIndex = 0; }

  get sortLabel(): string {
    const labels: Record<SortOption, string> = {
      newest: 'Newest First', oldest: 'Oldest First', az: 'Name A→Z', za: 'Name Z→A'
    };
    return labels[this.sortOption];
  }

  // ── Create / Edit modal ────────────────────────────────────────────────────
  openCreateModal(): void {
    this.modalMode          = 'create';
    this.editingCategory    = null;
    this.catName            = '';
    this.catSlug            = '';
    this.catNameTouched     = false;
    this.catSlugTouched     = false;
    this.slugManuallyEdited = false;
    this.isSubmitting       = false;
    this.showCategoryModal  = true;
  }

  openEditModal(category: Category): void {
    this.modalMode          = 'edit';
    this.editingCategory    = category;
    this.catName            = category.name;
    this.catSlug            = category.slug || generateSlug(category.name);
    this.catNameTouched     = false;
    this.catSlugTouched     = false;
    this.slugManuallyEdited = false;
    this.isSubmitting       = false;
    this.showCategoryModal  = true;
  }

  closeCategoryModal(): void {
    if (this.isSubmitting) return;
    this.showCategoryModal = false;
  }

  onNameChange(): void {
    if (!this.slugManuallyEdited) this.catSlug = generateSlug(this.catName);
  }

  onSlugChange(): void {
    this.slugManuallyEdited = true;
    this.catSlug = this.catSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  get nameError(): string | null {
    if (!this.catNameTouched) return null;
    if (!this.catName.trim()) return 'Category name is required.';
    return null;
  }

  get slugError(): string | null {
    if (!this.catSlugTouched) return null;
    if (!this.catSlug.trim()) return 'Slug is required.';
    if (!SLUG_PATTERN.test(this.catSlug)) return 'Only lowercase letters, numbers and hyphens are allowed.';
    return null;
  }

  get formValid(): boolean {
    return !!this.catName.trim() && !!this.catSlug.trim() && SLUG_PATTERN.test(this.catSlug);
  }

  saveCategory(): void {
    this.catNameTouched = true;
    this.catSlugTouched = true;
    if (!this.formValid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.cdr.markForCheck();

    const isCreate = this.modalMode === 'create';
    const op$ = isCreate
      ? this.service.addCategory(this.catName.trim(), this.catSlug.trim())
      : this.service.updateCategory(this.editingCategory!.id, this.catName.trim(), this.catSlug.trim());

    op$.pipe(takeUntil(this.destroy$)).subscribe({
      next: success => {
        // categories$ will emit and the combineLatest subscription calls markForCheck()
        // so the table updates automatically. Just close the modal.
        if (success) {
          this.showCategoryModal = false;
        }
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Delete modal ───────────────────────────────────────────────────────────
  openDeleteModal(category: Category): void {
    this.categoryToDelete = category;
    this.isDeleting       = false;
    this.showDeleteModal  = true;
  }

  closeDeleteModal(): void {
    if (this.isDeleting) return;
    this.showDeleteModal  = false;
    this.categoryToDelete = null;
  }

  confirmDelete(): void {
    if (!this.categoryToDelete || this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.markForCheck();

    this.service.deleteCategory(this.categoryToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting       = false;
          this.showDeleteModal  = false;
          this.categoryToDelete = null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isDeleting = false;
          this.cdr.markForCheck();
        }
      });
  }

  trackById(_: number, item: Category): string { return item.id; }
}
