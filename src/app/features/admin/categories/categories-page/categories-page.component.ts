import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { CourseApprovalService } from '../../course-approvals/services/course-approval.service';
import { Category } from '../../course-approvals/models/course-approval.model';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.css'
})
export class CategoriesPageComponent implements OnInit, OnDestroy {
  private readonly service = inject(CourseApprovalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  categories: Category[] = [];
  loading = true;

  searchQuery = '';
  
  // Create / Edit state
  showCategoryModal = false;
  modalMode: 'create' | 'edit' = 'create';
  editingCategory: Category | null = null;
  categoryNameInput = '';

  // Delete state
  showDeleteModal = false;
  categoryToDelete: Category | null = null;

  ngOnInit(): void {
    // Rely on service having already loaded or we trigger it
    this.service.loadData();

    combineLatest([
      this.service.categories$,
      this.service.loading$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([categories, loading]) => {
        this.categories = categories;
        this.loading = loading;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredCategories(): Category[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter(c => c.name.toLowerCase().includes(q));
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.editingCategory = null;
    this.categoryNameInput = '';
    this.showCategoryModal = true;
  }

  openEditModal(category: Category): void {
    this.modalMode = 'edit';
    this.editingCategory = category;
    this.categoryNameInput = category.name;
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
  }

  saveCategory(): void {
    const name = this.categoryNameInput.trim();
    if (!name) return;

    if (this.modalMode === 'create') {
      this.service.addCategory(name);
    } else if (this.modalMode === 'edit' && this.editingCategory) {
      this.service.updateCategory(this.editingCategory.id, name);
    }
    
    this.closeCategoryModal();
  }

  openDeleteModal(category: Category): void {
    this.categoryToDelete = category;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.categoryToDelete = null;
  }

  confirmDelete(): void {
    if (this.categoryToDelete) {
      this.service.deleteCategory(this.categoryToDelete.id);
    }
    this.closeDeleteModal();
  }

  trackById(_: number, item: Category): string {
    return item.id;
  }
}
