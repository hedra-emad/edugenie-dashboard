import { Component, OnInit, inject, signal, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  InstructorReviewsService,
  InstructorReview,
  InstructorReviewsResponse,
} from '../services/instructor-reviews.service';
import { FilterBarComponent, FilterConfig, FilterState } from '../../../shared/components/filter-bar/filter-bar.component';

// Angular Material
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-instructor-reviews',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    FilterBarComponent,
  ],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css'],
})
export class InstructorReviewsComponent implements OnInit {
  private reviewsService = inject(InstructorReviewsService);
  private destroyRef = inject(DestroyRef);

  // ── Data ──────────────────────────────────────────────────────
  reviews = signal<InstructorReview[]>([]);
  isLoading = signal(true);
  hasError = signal(false);
  errorMsg = signal('');

  // ── Server-side pagination ────────────────────────────────────
  readonly pageSize = 10;
  currentPage = signal(1);
  totalReviews = signal(0);
  totalPages = signal(0);

  // ── Stats (from the currently loaded page + totals from meta) ─
  // Average computed from current page data; total from meta
  averageRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return '0.0';
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    return (sum / list.length).toFixed(1);
  });

  needsAttentionCount = computed(() =>
    this.reviews().filter((r) => r.rating <= 2).length
  );

  // ── Filter state ──────────────────────────────────────────────
  currentFilters = signal<FilterState>({
    searchTerm: '',
    selectedStatuses: [],
    selectedLevels: [],
    selectedPriceFilter: 'all',
    selectedSort: 'newest',
  });

  filterConfig: FilterConfig = {
    statusOptions: [],
    levelOptions: [],
    priceOptions: [],
    sortOptions: [
      { value: 'newest', label: 'Newest First' },
      { value: 'oldest', label: 'Oldest First' },
      { value: 'rating_high', label: 'Highest Rating' },
      { value: 'rating_low', label: 'Lowest Rating' },
    ],
  };

  // ── Pagination helpers ────────────────────────────────────────
  getPages(): number[] {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const current = this.currentPage();
    const pages: number[] = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push(-1);
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push(-1);
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push(-1);
      for (let i = current - 2; i <= current + 2; i++) pages.push(i);
      pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  loadPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchReviews();
    const el = document.getElementById('reviews-top');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getPaginationInfo(): string {
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, this.totalReviews());
    return `Showing ${start} to ${end} of ${this.totalReviews()} reviews`;
  }

  // ── Filter / sort ─────────────────────────────────────────────
  onFilterChange(filterState: FilterState): void {
    this.currentFilters.set(filterState);
    this.currentPage.set(1);
    this.fetchReviews();
  }

  onClearFilters(): void {
    this.currentFilters.set({
      searchTerm: '',
      selectedStatuses: [],
      selectedLevels: [],
      selectedPriceFilter: 'all',
      selectedSort: 'newest',
    });
    this.currentPage.set(1);
    this.fetchReviews();
  }

  getResultsText(): string {
    return `${this.totalReviews()} reviews`;
  }

  // ── Template helpers ──────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase();
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < rating ? 1 : 0));
  }

  formatDate(date: unknown): string {
    return new Date(date as string).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getTimeAgo(date: unknown): string {
    const seconds = Math.floor(
      (Date.now() - new Date(date as string).getTime()) / 1000
    );
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return this.formatDate(date);
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.fetchReviews();
  }

  retry(): void {
    this.hasError.set(false);
    this.errorMsg.set('');
    this.fetchReviews();
  }

  // ── API call ──────────────────────────────────────────────────
  private fetchReviews(): void {
    this.isLoading.set(true);

    const filters = this.currentFilters();

    // Map sort option to backend sortBy param
    const sortMap: Record<string, string> = {
      newest: 'newest',
      oldest: 'oldest',
      rating_high: 'rating_high',
      rating_low: 'rating_low',
    };

    this.reviewsService
      .getReviews({
        page: this.currentPage(),
        limit: this.pageSize,
        sortBy: sortMap[filters.selectedSort] as any,
        searchTerm: filters.searchTerm.trim() || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data: InstructorReviewsResponse) => {
          this.reviews.set(data.data);
          this.totalReviews.set(data.meta.total);
          this.totalPages.set(data.meta.totalPages);
        },
        error: (err) => {
          this.hasError.set(true);
          this.errorMsg.set(
            err?.error?.message ?? err?.message ?? 'Failed to load reviews'
          );
        },
      });
  }
}
