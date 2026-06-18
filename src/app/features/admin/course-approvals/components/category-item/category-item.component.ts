import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Category } from '../../models/course-approval.model';

@Component({
  selector: 'app-category-item',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './category-item.component.html',
  styles: [`
    .category-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 12px;
      background-color: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.2s;
    }

    .category-item:hover {
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
      border-color: #d1d5db;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .drag-handle {
      cursor: grab;
      color: var(--color-text-secondary, #6b7280);
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .category-name-wrapper {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .category-name {
      font-weight: 500;
      color: var(--color-text-primary, #1f2937);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.875rem;
    }

    .course-count {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 9999px;
      font-weight: 500;
    }

    /* Edit Input */
    .edit-input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid var(--color-primary-light, #5b3db8);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--color-text-primary, #1f2937);
      outline: none;
      box-shadow: 0 0 0 3px rgba(91, 61, 184, 0.1);
    }

    /* Item Right Actions */
    .item-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-btn {
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #6b7280);
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background-color: #f3f4f6;
      color: var(--color-text-primary, #1f2937);
    }

    .delete-btn:hover {
      background-color: rgba(239, 68, 68, 0.05);
      color: #ef4444;
    }

    .save-btn:hover {
      background-color: rgba(34, 197, 94, 0.05);
      color: #22c55e;
    }
  `]
})
export class CategoryItemComponent {
  @Input() category!: Category;

  @Output() update = new EventEmitter<{ id: string; name: string }>();
  @Output() delete = new EventEmitter<string>();

  isEditing = false;
  editedName = '';

  startEdit(): void {
    this.editedName = this.category.name;
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  saveEdit(): void {
    if (this.editedName.trim() && this.editedName.trim() !== this.category.name) {
      this.update.emit({ id: this.category.id, name: this.editedName.trim() });
    }
    this.isEditing = false;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.saveEdit();
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }
}
