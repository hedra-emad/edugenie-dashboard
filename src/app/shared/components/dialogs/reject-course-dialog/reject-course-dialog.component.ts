import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ButtonLoadingComponent } from '../loading';

@Component({
  selector: 'app-reject-course-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ButtonLoadingComponent],
  templateUrl: './reject-course-dialog.component.html',
  styleUrl: './reject-course-dialog.component.css'
})
export class RejectCourseDialogComponent {
  @Input() courseTitle: string | null = null;
  @Input() isBulkMode = false;
  @Input() selectedCount = 0;
  @Input() isLoading = false;

  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  rejectReason = '';
  rejectReasonTouched = false;

  onConfirm() {
    this.rejectReasonTouched = true;
    const reason = this.rejectReason.trim();
    if (reason && !this.isLoading) {
      this.confirm.emit(reason);
    }
  }
}
