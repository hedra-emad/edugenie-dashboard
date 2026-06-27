import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-approve-course-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './approve-course-dialog.component.html',
  styleUrl: './approve-course-dialog.component.css'
})
export class ApproveCourseDialogComponent {
  @Input() courseTitle: string | null = null;
  @Input() isBulkMode = false;
  @Input() selectedCount = 0;
  @Input() isLoading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
