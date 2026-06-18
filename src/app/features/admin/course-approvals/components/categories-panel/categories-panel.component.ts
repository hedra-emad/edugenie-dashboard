import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { Category } from '../../models/course-approval.model';
import { CategoryItemComponent } from '../category-item/category-item.component';

@Component({
  selector: 'app-categories-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, MatIconModule, CategoryItemComponent],
  templateUrl: './categories-panel.component.html',
  styles: [`
    .categories-card {
      background-color: var(--color-surface, #ffffff);
      border-radius: var(--radius-md, 12px);
      box-shadow: var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.08));
      border: 1px solid var(--color-border, #e5e7eb);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .card-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary, #1f2937);
    }

    .add-category-form {
      display: flex;
      gap: 10px;
    }

    .add-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s;
    }

    .add-input:focus {
      border-color: var(--color-primary-light, #5b3db8);
      box-shadow: 0 0 0 3px rgba(91, 61, 184, 0.1);
    }

    .add-btn {
      padding: 10px 16px;
      background-color: var(--color-primary, #3b1892);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      box-shadow: 0 4px 10px rgba(59, 24, 146, 0.2);
    }

    .add-btn:hover {
      background-color: var(--color-primary-light, #5b3db8);
      box-shadow: 0 6px 14px rgba(59, 24, 146, 0.3);
    }

    .add-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .categories-list-container {
      max-height: 400px;
      overflow-y: auto;
      padding-right: 4px;
    }

    /* CDK Drag & Drop styles */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.15);
      background-color: #ffffff;
      opacity: 0.9;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
      border: 2px dashed var(--color-primary-light, #5b3db8) !important;
      background-color: #f5f3ff !important;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .category-item {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .drag-placeholder {
      min-height: 52px;
      background-color: #f5f3ff;
      border: 2px dashed var(--color-primary-light, #5b3db8);
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .empty-categories {
      text-align: center;
      color: var(--color-text-secondary, #6b7280);
      font-size: 0.875rem;
      padding: 24px 0;
      margin: 0;
    }

    /* Scrollbars */
    .categories-list-container::-webkit-scrollbar {
      width: 4px;
    }

    .categories-list-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .categories-list-container::-webkit-scrollbar-thumb {
      background-color: rgba(59, 24, 146, 0.1);
      border-radius: 2px;
    }
  `]
})
export class CategoriesPanelComponent {
  @Input() categories: Category[] = [];

  @Output() add = new EventEmitter<string>();
  @Output() update = new EventEmitter<{ id: string; name: string }>();
  @Output() delete = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<Category[]>();

  newCategoryName = '';

  onAddCategory(): void {
    if (this.newCategoryName.trim()) {
      this.add.emit(this.newCategoryName.trim());
      this.newCategoryName = '';
    }
  }

  drop(event: CdkDragDrop<Category[]>): void {
    const cloned = [...this.categories];
    moveItemInArray(cloned, event.previousIndex, event.currentIndex);
    this.reorder.emit(cloned);
  }

  trackById(_: number, cat: Category): string {
    return cat.id;
  }
}
