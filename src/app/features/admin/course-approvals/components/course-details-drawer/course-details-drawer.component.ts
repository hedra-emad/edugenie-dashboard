import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { UnifiedCourse } from '../../models/course-approval.model';
import { ApprovalStatusBadgeComponent } from '../approval-status-badge/approval-status-badge.component';

@Component({
  selector: 'app-course-details-drawer',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ApprovalStatusBadgeComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-details-drawer.component.html',
  styleUrl: './course-details-drawer.component.css'
})
export class CourseDetailsDrawerComponent {
  @Input() course!: UnifiedCourse;
  @Input() isOpen = false;
  @Input() actionLoading: Record<string, boolean> = {};

  @Output() closeDrawer = new EventEmitter<void>();
  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<{ id: string; reason: string }>();

  showRejectModal = false;
  rejectReason = '';

  get isLoading(): boolean {
    return !!this.actionLoading[this.course?.id];
  }

  onApprove(): void {
    if (!this.course || this.isLoading) return;
    this.approve.emit(this.course.id);
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectReason = '';
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  confirmReject(): void {
    if (!this.course || !this.rejectReason.trim() || this.isLoading) return;
    this.reject.emit({ id: this.course.id, reason: this.rejectReason.trim() });
    this.closeRejectModal();
  }

  onClose(): void {
    this.closeDrawer.emit();
  }
}
