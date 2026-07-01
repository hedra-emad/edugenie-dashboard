import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Reusable pagination bar — matches the Categories page design exactly.
 *
 * Usage:
 * <app-pagination
 *   [pageIndex]="pageIndex"          <!-- 0-based current page -->
 *   [totalPages]="totalPages"
 *   [pageFrom]="pageFrom"            <!-- 1-based item start -->
 *   [pageTo]="pageTo"                <!-- 1-based item end -->
 *   [totalItems]="totalFiltered"
 *   [pageSizeOptions]="[10,25,50]"   <!-- omit to hide per-page control -->
 *   [pageSize]="pageSize"
 *   (pageChange)="setPage($event)"   <!-- emits 0-based page index -->
 *   (pageSizeChange)="setPageSize($event)">
 * </app-pagination>
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (totalPages > 1 || (pageSizeOptions && pageSizeOptions.length > 0 && totalItems > 0)) {
    <div class="pagination-bar">

      <!-- Info -->
      <div class="pagination-info">
        Showing {{ pageFrom }}–{{ pageTo }} of {{ totalItems }}
      </div>

      <!-- Page buttons -->
      <div class="pagination-controls">
        <button class="page-btn" (click)="prev()" [disabled]="pageIndex === 0" aria-label="Previous page">
          <mat-icon>chevron_left</mat-icon>
        </button>

        @for (p of visiblePages; track p) {
          <button
            class="page-btn"
            [class.page-btn--active]="p === pageIndex"
            (click)="goTo(p)">
            {{ p + 1 }}
          </button>
        }

        <button class="page-btn" (click)="next()" [disabled]="pageIndex >= totalPages - 1" aria-label="Next page">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <!-- Per-page -->
      @if (pageSizeOptions && pageSizeOptions.length > 0) {
      <div class="page-size-wrapper">
        <span class="page-size-label">Per page</span>
        @for (size of pageSizeOptions; track size) {
          <button
            class="page-size-btn"
            [class.page-size-btn--active]="pageSize === size"
            (click)="changeSize(size)">
            {{ size }}
          </button>
        }
      </div>
      }

    </div>
    }
  `,
  styles: [`
    .pagination-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; border-top: 1px solid var(--color-border, #e5e7eb);
      background: #f9fafb; gap: 12px; flex-wrap: wrap;
    }
    .pagination-info { font-size: 0.875rem; color: #6b7280; white-space: nowrap; }
    .pagination-controls { display: flex; align-items: center; gap: 4px; }

    .page-btn {
      min-width: 34px; height: 34px; padding: 0 8px; border-radius: 8px;
      border: 1px solid var(--color-border, #e5e7eb); background: white;
      font-size: 0.875rem; font-weight: 500; color: #374151; cursor: pointer;
      transition: all 0.15s; display: flex; align-items: center; justify-content: center;
    }
    .page-btn:hover:not(:disabled) {
      border-color: #5b3db8; color: var(--color-primary, #3b1892); background: #f5f3ff;
    }
    .page-btn--active {
      background: var(--color-primary, #3b1892); color: white;
      border-color: var(--color-primary, #3b1892);
    }
    .page-btn--active:hover { background: #2d1073; }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .page-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .page-size-wrapper { display: flex; align-items: center; gap: 6px; }
    .page-size-label { font-size: 0.8125rem; color: #6b7280; white-space: nowrap; }
    .page-size-btn {
      padding: 4px 10px; border-radius: 6px;
      border: 1px solid var(--color-border, #e5e7eb);
      background: white; font-size: 0.8125rem; font-weight: 500;
      color: #374151; cursor: pointer; transition: all 0.15s;
    }
    .page-size-btn:hover { border-color: #5b3db8; color: var(--color-primary, #3b1892); }
    .page-size-btn--active {
      background: var(--color-primary, #3b1892); color: white;
      border-color: var(--color-primary, #3b1892);
    }

    @media (max-width: 640px) {
      .pagination-bar { flex-direction: column; align-items: stretch; gap: 10px; }
      .pagination-controls { justify-content: center; }
      .page-size-wrapper { justify-content: center; }
      .pagination-info { text-align: center; }
    }
  `]
})
export class PaginationComponent implements OnChanges {
  /** 0-based current page index */
  @Input() pageIndex = 0;
  @Input() totalPages = 1;
  /** 1-based start of the current slice */
  @Input() pageFrom = 1;
  /** 1-based end of the current slice */
  @Input() pageTo = 10;
  @Input() totalItems = 0;
  /** Pass [] or omit to hide the per-page control */
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Input() pageSize = 10;

  /** Emits 0-based page index */
  @Output() pageChange = new EventEmitter<number>();
  /** Emits the selected page size */
  @Output() pageSizeChange = new EventEmitter<number>();

  visiblePages: number[] = [];
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    this.visiblePages = this.buildPages();
    this.cdr.markForCheck();
  }

  private buildPages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const cur = this.pageIndex;
    let start = Math.max(0, cur - 2);
    let end = Math.min(total - 1, start + 4);
    if (end - start < 4) start = Math.max(0, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  prev(): void  { if (this.pageIndex > 0) this.pageChange.emit(this.pageIndex - 1); }
  next(): void  { if (this.pageIndex < this.totalPages - 1) this.pageChange.emit(this.pageIndex + 1); }
  goTo(p: number): void { this.pageChange.emit(p); }
  changeSize(size: number): void { this.pageSizeChange.emit(size); }
}
