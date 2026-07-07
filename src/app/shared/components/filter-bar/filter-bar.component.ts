import { Component, Input, Output, EventEmitter, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';

// Shared Components
import { MainButtonComponent } from '../main-button/main-button.component';
import { SubButtonComponent } from '../sub-button/sub-button.component';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterConfig {
  statusOptions: FilterOption[];
  levelOptions: FilterOption[];
  priceOptions: FilterOption[];
  sortOptions: FilterOption[];
}

export interface FilterState {
  searchTerm: string;
  selectedStatuses: string[];
  selectedLevels: string[];
  selectedPriceFilter: string;
  selectedSort: string;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MainButtonComponent,
    SubButtonComponent,
  ],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.css'
})
export class FilterBarComponent implements OnDestroy {
  @Input() config: FilterConfig = {
    statusOptions: [],
    levelOptions: [],
    priceOptions: [],
    sortOptions: []
  };
  @Input() placeholder = 'Search...';
  
  @Output() filterChange = new EventEmitter<FilterState>();
  @Output() clearFilters = new EventEmitter<void>();

  // Internal state
  searchTerm = signal('');
  selectedStatuses = signal<string[]>([]);
  selectedLevels = signal<string[]>([]);
  selectedPriceFilter = signal<string>('all');
  selectedSort = signal<string>('newest');
  
  // Drawer state
  isDrawerOpen = signal(false);
  
  // Dropdowns state
  sortDropdownOpen = signal(false);

  // Debounce search
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.emitFilterChange());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Computed active filters count
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchTerm().trim()) count++;
    if (this.selectedStatuses().length > 0) count++;
    if (this.selectedLevels().length > 0) count++;
    if (this.selectedPriceFilter() !== 'all') count++;
    return count;
  });

  // Get current filter state
  get currentFilterState(): FilterState {
    return {
      searchTerm: this.searchTerm(),
      selectedStatuses: this.selectedStatuses(),
      selectedLevels: this.selectedLevels(),
      selectedPriceFilter: this.selectedPriceFilter(),
      selectedSort: this.selectedSort()
    };
  }

  // Set filter state from parent
  setFilterState(state: Partial<FilterState>): void {
    if (state.searchTerm !== undefined) this.searchTerm.set(state.searchTerm);
    if (state.selectedStatuses !== undefined) this.selectedStatuses.set(state.selectedStatuses);
    if (state.selectedLevels !== undefined) this.selectedLevels.set(state.selectedLevels);
    if (state.selectedPriceFilter !== undefined) this.selectedPriceFilter.set(state.selectedPriceFilter);
    if (state.selectedSort !== undefined) this.selectedSort.set(state.selectedSort);
  }

  // Handle search input change — debounced via Subject
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  // Toggle drawer
  toggleDrawer(): void {
    this.isDrawerOpen.set(!this.isDrawerOpen());
  }

  // Close drawer
  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.sortDropdownOpen.set(false);
  }

  // Toggle sort dropdown
  toggleSortDropdown(): void {
    this.sortDropdownOpen.set(!this.sortDropdownOpen());
  }

  // Select sort option
  selectSort(sortValue: string): void {
    this.selectedSort.set(sortValue);
    this.sortDropdownOpen.set(false);
    this.emitFilterChange();
  }

  // Toggle status filter
  toggleStatusFilter(status: string): void {
    const current = this.selectedStatuses();
    const index = current.indexOf(status);
    if (index >= 0) {
      this.selectedStatuses.set(current.filter(s => s !== status));
    } else {
      this.selectedStatuses.set([...current, status]);
    }
    this.emitFilterChange();
  }

  // Toggle level filter
  toggleLevelFilter(level: string): void {
    const current = this.selectedLevels();
    const index = current.indexOf(level);
    if (index >= 0) {
      this.selectedLevels.set(current.filter(l => l !== level));
    } else {
      this.selectedLevels.set([...current, level]);
    }
    this.emitFilterChange();
  }

  // Select price filter
  selectPriceFilter(price: string): void {
    this.selectedPriceFilter.set(price);
    this.emitFilterChange();
  }

  // Clear all filters
  clearAllFilters(): void {
    this.searchTerm.set('');
    this.selectedStatuses.set([]);
    this.selectedLevels.set([]);
    this.selectedPriceFilter.set('all');
    this.selectedSort.set('newest');
    this.clearFilters.emit();
    this.emitFilterChange();
  }

  // Check if status is selected
  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status);
  }

  // Check if level is selected
  isLevelSelected(level: string): boolean {
    return this.selectedLevels().includes(level);
  }

  // Get selected sort label
  getSelectedSortLabel(): string {
    const selected = this.config.sortOptions.find(opt => opt.value === this.selectedSort());
    return selected ? selected.label : 'Sort by';
  }

  // Emit filter change
  private emitFilterChange(): void {
    this.filterChange.emit(this.currentFilterState);
  }
}