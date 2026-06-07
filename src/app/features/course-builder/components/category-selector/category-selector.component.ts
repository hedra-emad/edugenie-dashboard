import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-category-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './category-selector.component.html',
  styleUrl: './category-selector.component.css'
})
export class CategorySelectorComponent implements OnInit {
  @Input({ required: true }) control!: FormControl<string[]>;

  availableCategories = [
    { id: 'web-dev', name: 'Web Development', icon: 'code' },
    { id: 'mobile-dev', name: 'Mobile Development', icon: 'stay_current_portrait' },
    { id: 'data-science', name: 'Data Science', icon: 'bar_chart' },
    { id: 'machine-learning', name: 'Machine Learning', icon: 'psychology' },
    { id: 'ui-ux', name: 'UI/UX Design', icon: 'palette' },
    { id: 'business', name: 'Business & Marketing', icon: 'trending_up' },
    { id: 'pm', name: 'Project Management', icon: 'assignment_turned_in' },
    { id: 'video-photo', name: 'Photography & Video', icon: 'photo_camera' }
  ];

  selectedIds = signal<string[]>([]);

  ngOnInit() {
    // Sync form control changes with local signal
    const initialValue = this.control.value || [];
    this.selectedIds.set(initialValue);

    this.control.valueChanges.subscribe(val => {
      this.selectedIds.set(val || []);
    });
  }

  toggleCategory(catName: string) {
    const current = [...this.selectedIds()];
    const index = current.indexOf(catName);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(catName);
    }
    this.control.setValue(current);
    this.control.markAsDirty();
    this.control.updateValueAndValidity();
  }

  isSelected(catName: string): boolean {
    return this.selectedIds().includes(catName);
  }
}
