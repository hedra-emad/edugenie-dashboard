import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonLoadingComponent } from '../../loading';

@Component({
  selector: 'app-approve-course-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, ButtonLoadingComponent],
  templateUrl: './approve-course-dialog.component.html',
  styleUrl: './approve-course-dialog.component.css'
})
export class ApproveCourseDialogComponent {
  @Input() courseTitle: string | null = null;
  @Input() isBulkMode = false;
  @Input() selectedCount = 0;
  @Input() isLoading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
