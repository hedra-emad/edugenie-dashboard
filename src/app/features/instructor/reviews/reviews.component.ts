import { Component, OnInit, inject, signal, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstructorReviewsService, InstructorReview, ReviewsFilterOptions } from '../services/instructor-reviews.service';
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

  reviews = signal<InstructorReview[]>([]);
  isLoading = signal(true);
  hasError = signal(false);
  errorMsg = signal('');

  // Pagination state
  readonly pageSize = 10;
  currentPage = signal(1);

  // Current filter state
  currentFilters = signal<FilterState>({
    searchTerm: '',
    selectedStatuses: [],
    selectedLevels: [],
    selectedPriceFilter: 'all',
    selectedSort: 'newest',
  });

  // Summary stats
  totalReviews = signal(0);
  averageRating = computed(() => {
    const reviews = this.filteredReviews();
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  });

  needsAttentionCount = computed(() => {
    return this.filteredReviews().filter((r) => r.rating <= 2).length;
  });

  // Filter configuration
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

  // Computed filtered reviews
  filteredReviews = computed(() => {
    const filters = this.currentFilters();
    let filtered = this.reviews();

    // Search filter (by student name, course title, or comment)
    const search = filters.searchTerm.toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(
        (review) =>
          review.studentName.toLowerCase().includes(search) ||
          review.courseTitle.toLowerCase().includes(search) ||
          review.comment.toLowerCase().includes(search)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (filters.selectedSort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    return filtered;
  });

  get totalPages(): number {
    return Math.ceil(this.filteredReviews().length / this.pageSize);
  }

  get pagedReviews(): InstructorReview[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredReviews().slice(start, start + this.pageSize);
  }

  getPages(): number[] {
    const total = this.totalPages;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const current = this.currentPage();
    const pages: number[] = [];

    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push(-1); // ellipsis
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push(-1); // ellipsis
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push(-1); // ellipsis
      for (let i = current - 2; i <= current + 2; i++) pages.push(i);
      pages.push(-1); // ellipsis
      pages.push(total);
    }

    return pages;
  }

  loadPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
    const el = document.getElementById('reviews-top');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onFilterChange(filterState: FilterState): void {
    this.currentFilters.set(filterState);
    this.currentPage.set(1);
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
  }

  // Get initials from a full name — safe for templates (no arrow functions allowed)
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase();
  }

  // Get star rating display
  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i < rating ? 1 : 0);
  }

  // Format date
  formatDate(date: any): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Get time ago string
  getTimeAgo(date: any): string {
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

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

  getResultsText(): string {
    const total = this.reviews().length;
    const filtered = this.filteredReviews().length;

    const filters = this.currentFilters();
    const hasActiveFilters =
      filters.searchTerm.trim() ||
      filters.selectedStatuses.length > 0 ||
      filters.selectedLevels.length > 0 ||
      filters.selectedPriceFilter !== 'all';

    if (!hasActiveFilters) {
      return `${total} reviews`;
    }

    return `${filtered} of ${total} reviews`;
  }

  getPaginationInfo(): string {
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, this.filteredReviews().length);
    const total = this.filteredReviews().length;
    return `Showing ${start} to ${end} of ${total} reviews`;
  }

  ngOnInit(): void {
    this.loadReviews();
  }

  private loadReviews(): void {
    this.isLoading.set(true);
    this.reviewsService
      .getReviews({
        page: 1,
        limit: 1000, // Load all for client-side filtering
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data) => {
          this.reviews.set(data.data);
          this.totalReviews.set(data.meta.total);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.hasError.set(true);
          this.errorMsg.set(err?.error?.message ?? 'Failed to load reviews');
        },
      });
  }

  retry(): void {
    this.hasError.set(false);
    this.errorMsg.set('');
    this.loadReviews();
  }
  
}
