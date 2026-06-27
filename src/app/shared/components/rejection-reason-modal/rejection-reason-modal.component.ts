import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RejectionReasonModalData {
  reason: string;
  mode: 'admin' | 'instructor';
  title?: string;
}

@Component({
  selector: 'app-rejection-reason-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-container rejection-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-header-icon">
            <mat-icon>cancel</mat-icon>
          </div>
          <div class="modal-header-text">
            <h3>{{ data.title || 'Reason of Rejection' }}</h3>
          </div>
          <button class="modal-close" (click)="close()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="modal-body">
          @if (data.mode === 'admin') {
            <p class="reject-description">
              Please provide a reason for rejection. This feedback will help the instructor improve the course.
            </p>
            <div class="field-group">
              <label class="field-label" for="rejectReason">
                Reason of Rejection <span class="field-required">*</span>
              </label>
              <textarea
                id="rejectReason"
                class="reject-textarea"
                [class.field-error]="reasonTouched && !reason.trim()"
                [(ngModel)]="reason"
                (blur)="reasonTouched = true"
                placeholder="e.g. Course description is incomplete. Please add detailed module outlines and learning objectives."
                rows="4">
              </textarea>
              @if (reasonTouched && !reason.trim()) {
                <span class="field-error-msg">
                  <mat-icon>error_outline</mat-icon>
                  Rejection reason is required.
                </span>
              }
            </div>
          } @else {
            <div class="rejection-reason-box readonly">
              <div class="rejection-reason-label">
                <mat-icon class="rejection-reason-icon">cancel</mat-icon>
                Reason of Rejection
              </div>
              <div class="rejection-reason-content">{{ data.reason }}</div>
            </div>
          }
        </div>

        <div class="modal-footer">
          @if (data.mode === 'admin') {
            <button class="btn-cancel" (click)="close()">
              Cancel
            </button>
            <button
              class="btn-confirm-reject"
              (click)="confirmReject()"
              [disabled]="!reason.trim()">
              <mat-icon>cancel</mat-icon>
              Reject Course
            </button>
          } @else {
            <button class="btn-cancel" (click)="close()">
              Close
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      background: #ffffff;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      gap: 16px;
    }

    .modal-header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .modal-header-icon mat-icon {
      color: #ffffff;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .modal-header-text {
      flex: 1;
    }

    .modal-header-text h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
    }

    .modal-header-text p {
      margin: 4px 0 0;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .reject-description {
      margin: 0 0 16px;
      font-size: 0.9375rem;
      color: #4b5563;
      line-height: 1.5;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .field-required {
      color: #ef4444;
    }

    .reject-textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-family: inherit;
      resize: vertical;
      min-height: 100px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }

    .reject-textarea:focus {
      outline: none;
      border-color: #3b1892;
      box-shadow: 0 0 0 3px rgba(59, 24, 146, 0.1);
    }

    .reject-textarea.field-error {
      border-color: #ef4444;
    }

    .field-error-msg {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8125rem;
      color: #ef4444;
    }

    .field-error-msg mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Readonly mode styles */
    .rejection-reason-box {
      margin-top: 4px;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      overflow: hidden;
    }

    .rejection-reason-label {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 14px;
      background: #fef2f2;
      border-bottom: 1px solid #fecaca;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #991b1b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .rejection-reason-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #dc2626;
    }

    .rejection-reason-content {
      padding: 12px 14px;
      background: #fff5f5;
      font-size: 0.9375rem;
      line-height: 1.55;
      color: #7f1d1d;
      font-family: inherit;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .btn-cancel {
      padding: 10px 20px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn-confirm-reject {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: #ef4444;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-confirm-reject:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn-confirm-reject:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-confirm-reject mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class RejectionReasonModalComponent {
  reason: string = '';
  reasonTouched = false;

  constructor(
    public dialogRef: MatDialogRef<RejectionReasonModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RejectionReasonModalData
  ) {
    this.reason = data.reason || '';
  }

  close(): void {
    this.dialogRef.close();
  }

  confirmReject(): void {
    this.reasonTouched = true;
    if (this.reason.trim()) {
      this.dialogRef.close(this.reason.trim());
    }
  }
}