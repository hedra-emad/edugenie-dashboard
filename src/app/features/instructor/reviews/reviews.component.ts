import { Component, OnInit, inject, signal, DestroyRef, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  InstructorReviewsService,
  InstructorReview,
  InstructorReviewsResponse,
} from '../services/instructor-reviews.service';
import {
  FilterBarComponent,
  FilterConfig,
  FilterState,
} from '../../../shared/components/filter-bar/filter-bar.component';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, catchError, takeUntil } from 'rxjs/operators';

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
  @ViewChild(FilterBarComponent) filterBar!: FilterBarComponent;

  // ── Data ──────────────────────────────────────────────────────
  reviews = signal<InstructorReview[]>([]);
  isLoading = signal(true);
  isFetching = signal(false);
  hasError = signal(false);
  errorMsg = signal('');

  // ── Server-side pagination ─────────────────────────────────────
  readonly pageSize = 10;
  currentPage = signal(1);
  totalReviews = signal(0);
  totalPages = signal(0);

  /**
   * Set to true once on the first load when total === 0.
   * Used by the template to distinguish "never had reviews" from
   * "current filter returned nothing".
   */
  hasNoReviewsAtAll = signal(false);

  // Global stats captured from the first unfiltered load — don't shift on filter
  globalAverage = signal('0.0');

  // Page-level computed (only used to seed globalAverage)
  private averageRatingNow = computed(() => {
    const list = this.reviews();
    if (!list.length) return '0.0';
    return (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1);
  });

  // ── Filter state ───────────────────────────────────────────────
  currentFilters = signal<FilterState>({
    searchTerm: '',
    selectedStatuses: [],   // rating chips: '1'..'5'
    selectedLevels: [],
    selectedPriceFilter: 'all', // 'all' | 'flagged'
    selectedSort: 'newest',
  });

  // True when ANY filter/search is active (decides empty-state copy)
  hasActiveFilters = computed(() => {
    const f = this.currentFilters();
    return (
      f.searchTerm.trim().length > 0 ||
      f.selectedStatuses.length > 0 ||
      f.selectedPriceFilter !== 'all'
    );
  });

  filterConfig: FilterConfig = {
    // statusOptions reused as integer-star rating chips (1–5)
    statusOptions: [
      { value: '5', label: '5 stars' },
      { value: '4', label: '4 stars' },
      { value: '3', label: '3 stars' },
      { value: '2', label: '2 stars' },
      { value: '1', label: '1 star' },
    ],
    levelOptions: [],
    // priceOptions reused as flagged toggle
    priceOptions: [
      { value: 'all',     label: 'All Reviews' },
      { value: 'flagged', label: 'Flagged Only' },
    ],
    sortOptions: [
      { value: 'newest',      label: 'Newest First' },
      { value: 'oldest',      label: 'Oldest First' },
      { value: 'rating_high', label: 'Highest Rating' },
      { value: 'rating_low',  label: 'Lowest Rating' },
    ],
  };

  // ── Pagination helpers ─────────────────────────────────────────
  getPages(): number[] {
    const total = this.totalPages();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.currentPage();
    const pages: number[] = [];
    if (cur <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push(-1, total);
    } else if (cur >= total - 3) {
      pages.push(1, -1);
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, -1);
      for (let i = cur - 2; i <= cur + 2; i++) pages.push(i);
      pages.push(-1, total);
    }
    return pages;
  }

  loadPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchReviews();
    document.getElementById('reviews-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getPaginationInfo(): string {
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, this.totalReviews());
    return `Showing ${start}–${end} of ${this.totalReviews()} reviews`;
  }

  // ── Filter callbacks ───────────────────────────────────────────
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

  // ── Template helpers ───────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < rating ? 1 : 0));
  }

  formatDate(date: unknown): string {
    return new Date(date as string).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  getTimeAgo(date: unknown): string {
    const secs = Math.floor((Date.now() - new Date(date as string).getTime()) / 1000);
    if (secs < 60)  return 'Just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    if (days < 30)  return `${Math.floor(days / 7)}w ago`;
    return this.formatDate(date);
  }

  private fetchTrigger = new Subject<boolean>();
  private isFirstLoad = true;

  // ── Lifecycle ──────────────────────────────────────────────────
  ngOnInit(): void {
    this.fetchTrigger.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(300),
      switchMap((isInitial) => {
        if (isInitial) {
          this.isLoading.set(true);
        } else {
          this.isFetching.set(true);
        }
        this.hasError.set(false);
        const f = this.currentFilters();

        const sortMap: Record<string, string> = {
          newest: 'newest', oldest: 'oldest',
          rating_high: 'rating_high', rating_low: 'rating_low',
        };

        const ratingFilter = f.selectedStatuses.map(Number).filter(n => n >= 1 && n <= 5);
        const flaggedOnly  = f.selectedPriceFilter === 'flagged';

        return this.reviewsService.getReviews({
          page:        this.currentPage(),
          limit:       this.pageSize,
          sortBy:      sortMap[f.selectedSort] || 'newest',
          search:      f.searchTerm.trim() || undefined,
          rating:      ratingFilter.length ? ratingFilter : undefined,
          flaggedOnly: flaggedOnly || undefined,
        }).pipe(
          catchError(err => {
            this.hasError.set(true);
            this.errorMsg.set(err?.error?.message ?? err?.message ?? 'Failed to load reviews');
            return of(null);
          })
        );
      })
    ).subscribe((data) => {
      if (data) {
        this.reviews.set(data.data);
        this.totalReviews.set(data.meta.total);
        this.totalPages.set(data.meta.totalPages);

        if (this.isFirstLoad) {
          this.globalAverage.set(this.averageRatingNow());
          this.hasNoReviewsAtAll.set(data.meta.total === 0);
          this.isFirstLoad = false;
        }
      }
      this.isLoading.set(false);
      this.isFetching.set(false);
    });

    this.fetchReviews(true);
  }

  retry(): void {
    this.hasError.set(false);
    this.errorMsg.set('');
    this.fetchReviews(true);
  }

  // ── API call ───────────────────────────────────────────────────
  private fetchReviews(isInitialLoad = false): void {
    this.fetchTrigger.next(isInitialLoad);
  }
}
