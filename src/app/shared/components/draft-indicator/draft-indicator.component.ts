import { Component, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DraftStateService } from '../../../core/services/draft-state.service';
import { Subject, takeUntil } from 'rxjs';

export type DraftIndicatorType = 'unsaved' | 'modified' | 'uploading' | 'error' | 'uploaded_unsaved';

@Component({
  selector: 'app-draft-indicator',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <div *ngIf="shouldShow" 
         [class]="getIndicatorClass()"
         [matTooltip]="getTooltipText()"
         matTooltipPosition="above"
         matTooltipShowDelay="500"
         matTooltipHideDelay="200"
         [attr.aria-label]="getTooltipText()">
    </div>
  `,
  styles: [`
    /* Base indicator styles */
    .draft-indicator {
      position: relative;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    /* Unsaved state (Blue) */
    .draft-indicator--unsaved {
      background: linear-gradient(135deg, #2563EB, #3B82F6);
      box-shadow: 0 0 6px rgba(37, 99, 235, 0.4), 0 0 12px rgba(37, 99, 235, 0.2);
    }

    .draft-indicator--unsaved::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, transparent 70%);
      animation: pulse-glow-blue 2s ease-in-out infinite;
      z-index: -1;
    }

    @keyframes pulse-glow-blue {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }

    .draft-indicator--unsaved:hover {
      transform: scale(1.15);
      background: linear-gradient(135deg, #1D4ED8, #2563EB);
      box-shadow: 0 0 8px rgba(37, 99, 235, 0.6), 0 0 16px rgba(37, 99, 235, 0.3);
    }

    /* Uploaded but Unsaved state (Emerald Green to Sky Blue) */
    .draft-indicator--uploaded_unsaved {
      background: linear-gradient(135deg, #10B981, #0EA5E9);
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.4), 0 0 12px rgba(14, 165, 233, 0.2);
    }

    .draft-indicator--uploaded_unsaved::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
      animation: pulse-glow-uploaded 2s ease-in-out infinite;
      z-index: -1;
    }

    @keyframes pulse-glow-uploaded {
      0%, 100% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }

    .draft-indicator--uploaded_unsaved:hover {
      transform: scale(1.15);
      background: linear-gradient(135deg, #059669, #0284C7);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6), 0 0 16px rgba(14, 165, 233, 0.3);
    }

    /* Modified state (Purple) */
    .draft-indicator--modified {
      background: linear-gradient(135deg, #A855F7, #D946EF);
      box-shadow: 0 0 6px rgba(168, 85, 247, 0.4), 0 0 12px rgba(168, 85, 247, 0.2);
    }

    .draft-indicator--modified::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
      animation: pulse-glow-purple 2s ease-in-out infinite;
      z-index: -1;
    }

    @keyframes pulse-glow-purple {
      0%, 100% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(1.15); opacity: 0.7; }
    }

    .draft-indicator--modified:hover {
      transform: scale(1.15);
      background: linear-gradient(135deg, #9333EA, #A855F7);
      box-shadow: 0 0 8px rgba(168, 85, 247, 0.6), 0 0 16px rgba(168, 85, 247, 0.3);
    }

    /* Uploading state (Blue with spinning) */
    .draft-indicator--uploading {
      background: linear-gradient(135deg, #0EA5E9, #06B6D4);
      box-shadow: 0 0 6px rgba(14, 165, 233, 0.4), 0 0 12px rgba(14, 165, 233, 0.2);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .draft-indicator--uploading:hover {
      transform: scale(1.15) rotate(0deg);
      background: linear-gradient(135deg, #0284C7, #0EA5E9);
      animation: spin 0.5s linear infinite;
    }

    /* Error state (Red) */
    .draft-indicator--error {
      background: linear-gradient(135deg, #EF4444, #DC2626);
      box-shadow: 0 0 6px rgba(239, 68, 68, 0.4), 0 0 12px rgba(239, 68, 68, 0.2);
    }

    .draft-indicator--error::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);
      animation: pulse-glow-red 1.5s ease-in-out infinite;
      z-index: -1;
    }

    @keyframes pulse-glow-red {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.1); opacity: 0.6; }
    }

    .draft-indicator--error:hover {
      transform: scale(1.15);
      background: linear-gradient(135deg, #DC2626, #B91C1C);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6), 0 0 16px rgba(239, 68, 68, 0.3);
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
      .draft-indicator {
        width: 6px;
        height: 6px;
      }
      
      .draft-indicator:hover {
        transform: scale(1.1);
      }
    }
  `]
})
export class DraftIndicatorComponent implements OnInit, OnDestroy {
  @Input() draftId: string = '';
  @Input() type: DraftIndicatorType = 'unsaved';
  @Input() customTooltip?: string;
  @Input() autoDetect: boolean = false; // Auto-detect state from draft service

  private draftStateService = inject(DraftStateService);
  private destroy$ = new Subject<void>();

  shouldShow = false;
  currentType: DraftIndicatorType = 'unsaved';

  ngOnInit() {
    if (this.autoDetect && this.draftId) {
      this.setupAutoDetection();
    } else {
      this.currentType = this.type;
      this.shouldShow = true;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupAutoDetection() {
    this.draftStateService.getDraftChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateIndicatorState();
      });

    // Initial check
    this.updateIndicatorState();
  }

  private updateIndicatorState() {
    const draft = this.draftStateService.getDraft(this.draftId);

    if (!draft) {
      this.shouldShow = false;
      return;
    }

    // Check for upload status first
    if (draft.files && draft.files.length > 0) {
      const hasUploading = draft.files.some(f => f.status === 'uploading');
      const hasError = draft.files.some(f => f.status === 'error');

      if (hasUploading) {
        this.currentType = 'uploading';
        this.shouldShow = true;
        return;
      }

      if (hasError) {
        this.currentType = 'error';
        this.shouldShow = true;
        return;
      }
    }

    // Check if asset is uploaded to Cloudinary but not yet linked to DB
    const hasCloudinaryData = draft.data?.videoUrl && draft.data?.videoPublicId;
    if (hasCloudinaryData && (this.draftStateService.isDraftId(this.draftId) || draft.isDirty)) {
      this.currentType = 'uploaded_unsaved';
      this.shouldShow = true;
      return;
    }

    // Check draft state
    if (this.draftStateService.isDraftId(this.draftId)) {
      this.currentType = 'unsaved';
      this.shouldShow = true;
    } else if (draft.isDirty) {
      this.currentType = 'modified';
      this.shouldShow = true;
    } else {
      this.shouldShow = false;
    }
  }

  getIndicatorClass(): string {
    return `draft-indicator draft-indicator--${this.currentType}`;
  }

  getTooltipText(): string {
    if (this.customTooltip) {
      return this.customTooltip;
    }

    switch (this.currentType) {
      case 'unsaved':
        return 'This item is not saved yet';
      case 'uploaded_unsaved':
        return 'Video uploaded successfully, but not yet saved to database';
      case 'modified':
        return 'You have unsaved changes';
      case 'uploading':
        return 'File is uploading...';
      case 'error':
        return 'Upload failed. Click to retry.';
      default:
        return 'Draft state';
    }
  }
}