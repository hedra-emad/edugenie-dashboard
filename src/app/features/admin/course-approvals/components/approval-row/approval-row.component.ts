import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CourseApproval } from '../../models/course-approval.model';
import { ApprovalStatusBadgeComponent } from '../approval-status-badge/approval-status-badge.component';

@Component({
  selector: '[app-approval-row]',
  standalone: true,
  imports: [CommonModule, MatIconModule, ApprovalStatusBadgeComponent],
  templateUrl: './approval-row.component.html',
  styles: [`
    :host {
      display: table-row;
      vertical-align: middle;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
      transition: background-color 0.2s;
    }

    :host:hover {
      background-color: #f9fafb;
    }

    td {
      padding: 16px 20px;
      vertical-align: middle;
      color: var(--color-text-primary, #1f2937);
      font-size: 0.875rem;
    }

    .course-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .thumbnail-container {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--color-primary-light, #5b3db8), var(--color-primary, #3b1892));
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(91, 61, 184, 0.15);
    }

    .thumbnail-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .course-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .course-title {
      font-weight: 600;
      color: var(--color-text-primary, #1f2937);
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.3;
    }

    .course-category {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
      background-color: #f3f4f6;
      padding: 2px 8px;
      border-radius: 4px;
      align-self: flex-start;
    }

    .instructor-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .instructor-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }

    .instructor-initials {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: #ede9fe;
      color: var(--color-primary, #3b1892);
      font-weight: 700;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }

    .instructor-name {
      font-weight: 500;
      color: var(--color-text-primary, #1f2937);
    }

    /* Video duration warnings */
    .duration-text {
      font-weight: 500;
      color: var(--color-text-secondary, #6b7280);
    }

    .warning-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: rgba(245, 158, 11, 0.1);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.2);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .warning-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #f59e0b;
    }

    /* Actions styling */
    .actions-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: flex-end;
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.25s ease;
      background: transparent;
      outline: none;
    }

    .approve-btn {
      background-color: var(--color-primary, #3b1892);
      color: #ffffff;
      border: none;
      box-shadow: 0 4px 10px rgba(59, 24, 146, 0.2);
    }

    .approve-btn:hover:not(:disabled) {
      background-color: var(--color-primary-light, #5b3db8);
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(59, 24, 146, 0.3);
    }

    .reject-btn {
      border: 1.5px solid var(--color-border, #e5e7eb);
      color: var(--color-text-secondary, #6b7280);
    }

    .reject-btn:hover:not(:disabled) {
      border-color: #ef4444;
      color: #ef4444;
      background-color: rgba(239, 68, 68, 0.05);
      transform: translateY(-2px);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.8s linear infinite;
    }

    .reject-spinner {
      border-color: rgba(239, 68, 68, 0.1);
      border-top-color: #ef4444;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Mobile Responsive Cards */
    @media (max-width: 767px) {
      :host {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 12px;
        margin-bottom: 16px;
        background-color: #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        border-bottom: 1px solid var(--color-border, #e5e7eb) !important;
      }
      
      :host:last-child {
        margin-bottom: 0;
      }

      td {
        display: flex;
        align-items: center;
        padding: 14px 16px;
        border-bottom: 1px solid #f3f4f6;
        width: 100%;
        box-sizing: border-box;
      }

      td:last-child {
        border-bottom: none;
      }

      td::before {
        content: attr(data-label);
        font-weight: 600;
        color: var(--color-text-secondary);
        font-size: 0.75rem;
        text-transform: uppercase;
        margin-right: 16px;
        flex-shrink: 0;
        width: 100px;
      }

      .course-info {
        flex: 1;
        min-width: 0;
      }
      
      .instructor-container {
        flex: 1;
      }
      
      .actions-cell {
        flex: 1;
        justify-content: flex-start;
      }
    }
  `]
})
export class ApprovalRowComponent {
  @Input() course!: CourseApproval;
  @Input() actionLoading = false;

  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  get instructorInitials(): string {
    if (!this.course.instructorName) return 'I';
    const parts = this.course.instructorName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }

  onApprove(): void {
    if (!this.actionLoading && this.course.status === 'pending') {
      this.approve.emit(this.course.id);
    }
  }

  onReject(): void {
    if (!this.actionLoading && this.course.status === 'pending') {
      this.reject.emit(this.course.id);
    }
  }
}
