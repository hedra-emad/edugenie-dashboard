import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CourseApproval } from '../../models/course-approval.model';

@Component({
  selector: '[app-approval-row]',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './approval-row.component.html',
  styleUrl: './approval-row.component.css'
})
export class ApprovalRowComponent {
  @Input() course!: CourseApproval;
  /** True when THIS course's approve action is in progress */
  @Input() approveLoading = false;
  /** True when THIS course's reject action is in progress */
  @Input() rejectLoading = false;
  @Input() isSelected = false;
  /**
   * When true (Approved / Rejected tabs) the checkbox and action buttons
   * are hidden — the row is read-only.
   */
  @Input() readonly = false;

  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();
  @Output() toggleSelection = new EventEmitter<string>();

  get anyLoading(): boolean {
    return this.approveLoading || this.rejectLoading;
  }

  get instructorInitials(): string {
    if (!this.course?.instructorName) return 'I';
    const parts = this.course.instructorName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }

  onApprove(event: Event): void {
    event.stopPropagation();
    if (!this.anyLoading && this.course.status === 'pending') {
      this.approve.emit(this.course.id);
    }
  }

  onReject(event: Event): void {
    event.stopPropagation();
    if (!this.anyLoading && this.course.status === 'pending') {
      this.reject.emit(this.course.id);
    }
  }
}
