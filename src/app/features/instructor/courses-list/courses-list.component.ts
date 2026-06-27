import { Component, OnInit, inject, signal, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstructorCoursesService } from '../services/instructor-courses.service';
import { InstructorCourse } from '../models/instructor-course.model';
import { BadgeComponent } from '../../../shared/components/badge-component/badge-component';
import { CourseStatus } from '../../../core/enums/course-status';
import { FilterBarComponent, FilterConfig, FilterState } from '../../../shared/components/filter-bar/filter-bar.component';
import { MainButtonComponent } from '../../../shared/components/main-button/main-button.component';

// Angular Material
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-courses-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    BadgeComponent,
    FilterBarComponent,
    MainButtonComponent,
  ],
  templateUrl: './courses-list.component.html',
  styleUrls: ['./courses-list.component.css'],
})
export class CoursesListComponent implements OnInit {
  private coursesService = inject(InstructorCoursesService);
  private router = inject(Router);

  courses = signal<InstructorCourse[]>([]);
  isLoading = signal(true);
  hasError = signal(false);
  errorMsg = signal('');

  // Current filter state
  currentFilters = signal<FilterState>({
    searchTerm: '',
    selectedStatuses: [],
    selectedLevels: [],
    selectedPriceFilter: 'all',
    selectedSort: 'newest'
  });

  private destroyRef = inject(DestroyRef);

  readonly pageSize = 6;
  currentPage = 1;

  // Filter configuration for the FilterBarComponent
  filterConfig: FilterConfig = {
    statusOptions: [
      { value: 'published', label: 'Published', color: 'success' },
      { value: 'draft', label: 'Draft', color: 'warning' },
      { value: 'under_review', label: 'Under Review', color: 'info' }
    ],
    levelOptions: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ],
    priceOptions: [
      { value: 'all', label: 'All Courses' },
      { value: 'free', label: 'Free Courses' },
      { value: 'paid', label: 'Paid Courses' }
    ],
    sortOptions: [
      { value: 'newest', label: 'Newest First' },
      { value: 'oldest', label: 'Oldest First' },
      { value: 'enrollments_high', label: 'Most Enrollments' },
      { value: 'enrollments_low', label: 'Least Enrollments' },
      { value: 'alphabetical', label: 'A-Z' },
      { value: 'reverse_alphabetical', label: 'Z-A' }
    ]
  };

  // Computed filtered and sorted courses
  filteredCourses = computed(() => {
    const filters = this.currentFilters();
    let filtered = this.courses();

    // Search filter
    const search = filters.searchTerm.toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(search) || 
        course.description.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (filters.selectedStatuses.length > 0) {
      filtered = filtered.filter(course => 
        filters.selectedStatuses.includes(course.courseStatus.toLowerCase())
      );
    }

    // Level filter
    if (filters.selectedLevels.length > 0) {
      filtered = filtered.filter(course => 
        filters.selectedLevels.includes(course.level.toLowerCase())
      );
    }

    // Price filter
    if (filters.selectedPriceFilter === 'free') {
      filtered = filtered.filter(course => course.price === 0);
    } else if (filters.selectedPriceFilter === 'paid') {
      filtered = filtered.filter(course => course.price > 0);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (filters.selectedSort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'enrollments_high':
          return b.totalEnrollments - a.totalEnrollments;
        case 'enrollments_low':
          return a.totalEnrollments - b.totalEnrollments;
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'reverse_alphabetical':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  });

  get totalPages(): number {
    return Math.ceil(this.filteredCourses().length / this.pageSize);
  }

  get pagedCourses(): InstructorCourse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCourses().slice(start, start + this.pageSize);
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  loadPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const el = document.getElementById('page-top');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Handle filter changes from FilterBarComponent
  onFilterChange(filterState: FilterState): void {
    this.currentFilters.set(filterState);
    this.resetPagination();
  }

  // Handle clear filters from FilterBarComponent
  onClearFilters(): void {
    this.currentFilters.set({
      searchTerm: '',
      selectedStatuses: [],
      selectedLevels: [],
      selectedPriceFilter: 'all',
      selectedSort: 'newest'
    });
    this.resetPagination();
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.coursesService
      .getMyCourses()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data) => {
          this.courses.set(data);
          this.currentPage = 1;
        },
        error: (err) => {
          this.hasError.set(true);
          this.errorMsg.set(err?.error?.message ?? 'Failed to load data');
        },
      });
  }

  goToCreateCourse(): void {
    this.router.navigate(['/course-builder']);
  }

  editCourse(id: string) {
    this.router.navigate(['/course-builder', id]);
  }

  getCourseStatus(statusString: string): CourseStatus {
    const statusLower = statusString.toLowerCase();
    switch (statusLower) {
      case 'published':
        return CourseStatus.PUBLISHED;
      case 'under_review':
      case 'under review':
        return CourseStatus.UNDER_REVIEW;
      case 'rejected':
        return CourseStatus.REJECTED;
      case 'archived':
        return CourseStatus.ARCHIVED;
      case 'draft':
      default:
        return CourseStatus.DRAFT;
    }
  }

  formatTotalHours(totalHours: number): string {
    return this.coursesService.formatTotalHours(totalHours);
  }

  getResultsText(): string {
    const total = this.courses().length;
    const filtered = this.filteredCourses().length;
    
    const filters = this.currentFilters();
    const hasActiveFilters = filters.searchTerm.trim() || 
                           filters.selectedStatuses.length > 0 || 
                           filters.selectedLevels.length > 0 || 
                           filters.selectedPriceFilter !== 'all';
    
    if (!hasActiveFilters) {
      return `${total} courses`;
    }
    
    return `${filtered} of ${total} courses`;
  }
}
