import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';

// Shared Components
import { MainButtonComponent } from '../../../../../shared/components/main-button/main-button.component';
import { SubButtonComponent } from '../../../../../shared/components/sub-button/sub-button.component';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface QuestionFilterConfig {
  typeOptions?: FilterOption[];
  sourceOptions?: FilterOption[];
  sortOptions?: FilterOption[];
}

export interface QuestionFilterState {
  searchTerm: string;
  selectedTypes: string[];
  selectedSources: string[];
  selectedSort: string;
}

@Component({
  selector: 'app-question-filter-bar',
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
  templateUrl: './question-filter-bar.component.html',
  styleUrl: './question-filter-bar.component.css'
})
export class QuestionFilterBarComponent {
  @Input() config: QuestionFilterConfig = {
    typeOptions: [],
    sourceOptions: [],
    sortOptions: []
  };
  @Input() placeholder = 'Search questions...';
  
  @Output() filterChange = new EventEmitter<QuestionFilterState>();
  @Output() clearFilters = new EventEmitter<void>();

  // Internal state
  searchTerm = signal('');
  selectedTypes = signal<string[]>([]);
  selectedSources = signal<string[]>([]);
  selectedSort = signal<string>('newest');
  
  // Drawer state
  isDrawerOpen = signal(false);
  
  // Dropdowns state
  sortDropdownOpen = signal(false);

  // Computed active filters count
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchTerm().trim()) count++;
    if (this.selectedTypes().length > 0) count++;
    if (this.selectedSources().length > 0) count++;
    return count;
  });

  // Get current filter state
  get currentFilterState(): QuestionFilterState {
    return {
      searchTerm: this.searchTerm(),
      selectedTypes: this.selectedTypes(),
      selectedSources: this.selectedSources(),
      selectedSort: this.selectedSort()
    };
  }

  // Set filter state from parent
  setFilterState(state: Partial<QuestionFilterState>): void {
    if (state.searchTerm !== undefined) this.searchTerm.set(state.searchTerm);
    if (state.selectedTypes !== undefined) this.selectedTypes.set(state.selectedTypes);
    if (state.selectedSources !== undefined) this.selectedSources.set(state.selectedSources);
    if (state.selectedSort !== undefined) this.selectedSort.set(state.selectedSort);
  }

  // Handle search input change
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.emitFilterChange();
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

  // Toggle type filter
  toggleTypeFilter(type: string): void {
    const current = this.selectedTypes();
    const index = current.indexOf(type);
    if (index >= 0) {
      this.selectedTypes.set(current.filter(t => t !== type));
    } else {
      this.selectedTypes.set([...current, type]);
    }
    this.emitFilterChange();
  }

  // Toggle source filter
  toggleSourceFilter(source: string): void {
    const current = this.selectedSources();
    const index = current.indexOf(source);
    if (index >= 0) {
      this.selectedSources.set(current.filter(s => s !== source));
    } else {
      this.selectedSources.set([...current, source]);
    }
    this.emitFilterChange();
  }

  // Clear all filters
  clearAllFilters(): void {
    this.searchTerm.set('');
    this.selectedTypes.set([]);
    this.selectedSources.set([]);
    this.selectedSort.set('newest');
    this.clearFilters.emit();
    this.emitFilterChange();
  }

  // Check if type is selected
  isTypeSelected(type: string): boolean {
    return this.selectedTypes().includes(type);
  }

  // Check if source is selected
  isSourceSelected(source: string): boolean {
    return this.selectedSources().includes(source);
  }

  // Get selected sort label
  getSelectedSortLabel(): string {
    const selected = this.config.sortOptions?.find(opt => opt.value === this.selectedSort());
    return selected ? selected.label : 'Sort by';
  }

  // Emit filter change
  private emitFilterChange(): void {
    this.filterChange.emit(this.currentFilterState);
  }
}
