import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategoriesService } from '../../../../core/services/categories';

@Component({
  selector: 'app-category-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './category-selector.component.html',
  styleUrl: './category-selector.component.css'
})
export class CategorySelectorComponent implements OnInit {

  private categoriesService = inject(CategoriesService);

  @Input({ required: true }) control!: FormControl<string>;

  availableCategories: any[] = [];

  selectedCategory = signal<string | null>(null);

  openCategory = false;

  ngOnInit() {
    // 1. load categories from backend
    this.categoriesService.getCategories().subscribe({
      next: (cats) => {
        this.availableCategories = cats;
      },
      error: (err) => {
        console.error('Categories error:', err);
      }
    });

    // 2. sync with form control
    this.selectedCategory.set(this.control.value || null);

    this.control.valueChanges.subscribe((val) => {
      this.selectedCategory.set(val || null);
    });
  }

  selectCategory(catId: string) {
    this.control.setValue(catId);
    this.control.markAsDirty();
    this.control.updateValueAndValidity();

    this.openCategory = false;
  }

  get selectedCategoryName(): string {
    return (
      this.availableCategories.find(
        c => c._id === this.control.value
      )?.name || ''
    );
  }
}