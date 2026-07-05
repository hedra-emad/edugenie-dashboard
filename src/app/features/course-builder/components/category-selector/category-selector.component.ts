import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  effect,
  ElementRef,
  HostListener,
  ViewChild,
  ViewChildren,
  QueryList,
  DestroyRef,
  forwardRef,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoriesService } from '../../../../core/services/categories';
import { Category } from '../../../../core/models/category.model';

@Component({
  selector: 'app-category-selector',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './category-selector.component.html',
  styleUrl: './category-selector.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategorySelectorComponent),
      multi: true,
    },
  ],
})
export class CategorySelectorComponent implements OnInit, ControlValueAccessor {
  private categoriesService = inject(CategoriesService);
  private destroyRef = inject(DestroyRef);
  private elementRef = inject(ElementRef);
  private injector = inject(Injector);

@ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
@ViewChildren('optionItem') optionItems!: QueryList<ElementRef<HTMLButtonElement>>;
  // Signals
  availableCategories = signal<Category[]>([]);
  filteredCategories = signal<Category[]>([]);
  selectedCategoryId = signal<string | null>(null);
  isOpen = signal(false);
  isLoadingCategories = signal(false);
  isDisabled = signal(false);
  activeIndex = signal(-1);
  searchTerm = signal('');
  pendingValue = signal<string | null>(null);

  // Computed
  selectedCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return '';
    const cat = this.availableCategories().find((c) => c.id === id);
    return cat?.name || '';
  });

  isTouched = signal(false);

  // CVA callbacks
  private onChange: ((value: string | null) => void) | null = null;
  private onTouched: (() => void) | null = null;

  // Search subject
  private searchSubject = new Subject<string>();

  constructor() {
    // Delay NgControl injection to avoid circular dependency
    // This is a standard pattern for self-provided CVA components
    effect(
      () => {
        // This runs after construction to safely access NgControl
        const ngControl = this.injector.get(NgControl, null);
        if (ngControl) {
          ngControl.valueAccessor = this;
        }
      },
      { allowSignalWrites: true }
    );

    // Effect to resolve pendingValue once categories are loaded
    effect(
      () => {
        const pending = this.pendingValue();
        const categories = this.availableCategories();
        if (pending && categories.length > 0) {
          // If we have a pending value and categories are now loaded,
          // set the selected ID
          this.selectedCategoryId.set(pending);
          this.pendingValue.set(null);
        }
      },
      { allowSignalWrites: true }
    );
    // Effect to scroll the active option into view on keyboard navigation
effect(() => {
  const index = this.activeIndex();
  if (index >= 0 && this.optionItems) {
    const el = this.optionItems.toArray()[index]?.nativeElement;
    el?.scrollIntoView({ block: 'nearest' });
  }
});
  }

  ngOnInit() {
    // Fetch categories once
    this.isLoadingCategories.set(true);
    this.categoriesService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats: Category[]) => {
          this.availableCategories.set(cats);
          this.isLoadingCategories.set(false);
          // If we have a pending value, the effect will resolve it
          if (this.pendingValue()) {
            this.selectedCategoryId.set(this.pendingValue()!);
          }
        },
        error: (err) => {
          console.error('Categories error:', err);
          this.isLoadingCategories.set(false);
        },
      });

    // Setup search filtering pipeline
    this.searchSubject
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((term: string) => {
        this.filterCategories(term);
      });
  }

  setActiveIndex(index: number) {
  this.activeIndex.set(index);
}

  private filterCategories(term: string) {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) {
      // If search is empty, show all categories
      this.filteredCategories.set(this.availableCategories());
    } else {
      // Filter based on the search term
      const filtered = this.availableCategories().filter((cat) =>
        cat.name.toLowerCase().includes(trimmed)
      );
      this.filteredCategories.set(filtered);
    }
    // Reset active index when filter changes
    this.activeIndex.set(-1);
  }

  /**
   * ControlValueAccessor: Called by Angular when the form value is set programmatically
   */
  writeValue(value: string | null): void {
    if (value === null || value === undefined) {
      this.selectedCategoryId.set(null);
      this.pendingValue.set(null);
      this.searchTerm.set('');
    } else {
      // Check if categories are already loaded
      const cat = this.availableCategories().find((c) => c.id === value);
      if (cat) {
        // Categories loaded, set directly
        this.selectedCategoryId.set(value);
        this.pendingValue.set(null);
      } else {
        // Categories not loaded yet, store as pending
        this.pendingValue.set(value);
        this.selectedCategoryId.set(null);
      }
    }
  }

  /**
   * ControlValueAccessor: Register the onChange callback
   */
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  /**
   * ControlValueAccessor: Register the onTouched callback
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * ControlValueAccessor: Set the disabled state
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  selectCategory(cat: Category) {
    this.selectedCategoryId.set(cat.id);
    this.searchTerm.set('');
    this.isOpen.set(false);
    this.activeIndex.set(-1);

    // Call onChange to update the parent form
    if (this.onChange) {
      this.onChange(cat.id);
    }
  }

  clearSelection(event: Event) {
    event.stopPropagation();
    this.selectedCategoryId.set(null);
    this.searchTerm.set('');

    // Call onChange to update the parent form
    if (this.onChange) {
      this.onChange(null);
    }
  }

  toggleOpen() {
    if (this.isDisabled()) return;

    if (this.isOpen()) {
      this.isOpen.set(false);
      this.searchTerm.set('');
      this.filteredCategories.set(this.availableCategories());
      this.activeIndex.set(-1);
    } else {
      this.isOpen.set(true);
      this.filteredCategories.set(this.availableCategories());
      this.activeIndex.set(-1);

      // Auto-focus the in-panel search input
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
      }, 0);
    }
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const term = input.value;
    this.searchTerm.set(term);
    this.searchSubject.next(term);
  }

  clearSearch() {
    this.searchTerm.set('');
    this.filteredCategories.set(this.availableCategories());
    this.activeIndex.set(-1);
    this.searchInput?.nativeElement.focus();
  }

  onBlur() {
    // Close dropdown on blur (slight delay allows click on option to fire first)
    setTimeout(() => {
      if (!this.elementRef.nativeElement.contains(document.activeElement)) {
        this.isOpen.set(false);
        this.isTouched.set(true);
        this.searchTerm.set('');
        if (this.onTouched) this.onTouched();
      }
    }, 150);
  }

  onEscape() {
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.activeIndex.set(-1);
  }

 onArrowDown(event: Event) {
  event.preventDefault();
  if (!this.isOpen()) {
    this.isOpen.set(true);
    this.filteredCategories.set(this.availableCategories());
    return;
  }

  const current = this.activeIndex();
  const max = this.filteredCategories().length - 1;
  if (current < max) {
    this.activeIndex.set(current + 1);
  } else {
    this.activeIndex.set(0);
  }
}

onArrowUp(event: Event) {
  event.preventDefault();
  if (!this.isOpen()) {
    this.isOpen.set(true);
    this.filteredCategories.set(this.availableCategories());
    return;
  }

  const current = this.activeIndex();
  const max = this.filteredCategories().length - 1;
  if (current > 0) {
    this.activeIndex.set(current - 1);
  } else {
    this.activeIndex.set(max);
  }
}

  onEnter() {
    if (!this.isOpen()) return;

    const index = this.activeIndex();
    if (index >= 0 && index < this.filteredCategories().length) {
      const cat = this.filteredCategories()[index];
      this.selectCategory(cat);
    }
  }

  /**
   * Close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target as HTMLElement)) {
      this.isOpen.set(false);
    }
  }

  /**
   * Track by id for *ngFor
   */
  trackByCategoryId(index: number, cat: Category): string {
    return cat.id;
  }

  /**
   * Helper to check if form control is touched and invalid
   */
  get isTouchedAndInvalid(): boolean {
    return this.isTouched() && this.selectedCategoryId() === null;
  }

  /**
   * Helper to check if form control is valid and touched
   */
  get isTouchedAndValid(): boolean {
    return this.isTouched() && this.selectedCategoryId() !== null;
  }
}
