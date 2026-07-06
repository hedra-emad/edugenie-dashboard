import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { PendingPayoutListItem, PayoutProcessResponse, PayoutMethod } from '../../models/superadmin.models';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule, PaginationComponent],
  templateUrl: './payouts.page.html',
  styleUrl: './payouts.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayoutsPageComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  Math = Math;

  isLoading = true;
  payouts: PendingPayoutListItem[] = [];

  // Pagination
  currentPage = 1;
  totalPages = 1;
  limit = 10;
  totalItems = 0;

  // Approve Modal State
  showApproveModal = false;
  selectedPayout: PendingPayoutListItem | null = null;
  isProcessing = false;
  approveMethod: PayoutMethod = 'paypal';
  approveReference = '';

  // Reject Modal State
  showRejectModal = false;
  rejectReason = '';

  ngOnInit() {
    this.loadPayouts();
  }

  loadPayouts() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.superadminService.getPendingPayouts(this.currentPage, this.limit).subscribe({
      next: (res) => {
        this.payouts = res.data;
        this.totalPages = res.meta.totalPages || 1;
        this.totalItems = res.meta.total || 0;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load pending payouts', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load pending payouts', 'Close', { duration: 3000 });
      }
    });
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadPayouts();
    }
  }

  openApproveModal(payout: PendingPayoutListItem) {
    this.selectedPayout = payout;
    this.approveMethod = 'paypal';
    this.approveReference = '';
    this.showApproveModal = true;
  }

  closeApproveModal() {
    if (this.isProcessing) return;
    this.showApproveModal = false;
    this.selectedPayout = null;
    this.approveMethod = 'paypal';
    this.approveReference = '';
  }

  /**
   * When paying via the automated PayPal gateway, no reference is needed (the
   * gateway generates one). A reference is only required for a MANUAL transfer.
   */
  get canConfirmApprove(): boolean {
    return (
      this.approveMethod === 'paypal' || this.approveReference.trim().length > 0
    );
  }

  confirmApprove() {
    if (!this.selectedPayout || !this.canConfirmApprove) return;
    if (!this.selectedPayout.requestId) {
      this.snackBar.open(
        'This request has no id — the updated backend is not deployed yet. Deploy/point to the new API to process payouts.',
        'Close',
        { duration: 6000, panelClass: ['bg-red-600', 'text-white'] }
      );
      return;
    }
    this.isProcessing = true;
    this.cdr.detectChanges();

    const reference = this.approveReference.trim();
    this.superadminService.approvePayout(this.selectedPayout.requestId, {
      method: this.approveMethod,
      // Omit an empty reference so the API's automated PayPal path takes over.
      ...(reference ? { reference } : {})
    }).subscribe({
      next: (res: PayoutProcessResponse) => {
        this.isProcessing = false;
        this.showApproveModal = false;
        this.selectedPayout = null;
        this.approveMethod = 'paypal';
        this.approveReference = '';
        this.cdr.detectChanges();
        const msg =
          res.status === 'PROCESSING'
            ? `Payout sent to Stripe — it will confirm shortly (Ref: ${res.reference})`
            : `Payout approved${res.reference ? ` (Ref: ${res.reference})` : ''}`;
        this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: ['bg-green-600', 'text-white'] });
        this.loadPayouts();
      },
      error: (err) => {
        this.isProcessing = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to approve payout';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }

  /** Poll PayPal for a processing payout and finalize it (paid or failed). */
  checkStatus(payout: PendingPayoutListItem) {
    if (!payout.requestId || this.isProcessing) return;
    this.isProcessing = true;
    this.cdr.detectChanges();

    this.superadminService.syncPayout(payout.requestId).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.cdr.detectChanges();
        const msg =
          res.status === 'APPROVED'
            ? 'Payout confirmed paid by Stripe ✓'
            : res.status === 'FAILED'
              ? `Payout failed: ${res.detail ?? 'see Stripe'}`
              : `Still processing at Stripe${res.detail ? ` (${res.detail})` : ''}`;
        this.snackBar.open(msg, 'Close', {
          duration: 4000,
          panelClass: [res.status === 'FAILED' ? 'bg-red-600' : 'bg-green-600', 'text-white'],
        });
        this.loadPayouts();
      },
      error: (err) => {
        this.isProcessing = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to check payout status';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      },
    });
  }

  openRejectModal(payout: PendingPayoutListItem) {
    this.selectedPayout = payout;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal() {
    if (this.isProcessing) return;
    this.showRejectModal = false;
    this.selectedPayout = null;
    this.rejectReason = '';
  }

  get canConfirmReject(): boolean {
    return this.rejectReason.trim().length > 0;
  }

  confirmReject() {
    if (!this.selectedPayout || !this.canConfirmReject) return;
    if (!this.selectedPayout.requestId) {
      this.snackBar.open(
        'This request has no id — the updated backend is not deployed yet. Deploy/point to the new API to process payouts.',
        'Close',
        { duration: 6000, panelClass: ['bg-red-600', 'text-white'] }
      );
      return;
    }
    this.isProcessing = true;
    this.cdr.detectChanges();

    this.superadminService.rejectPayout(this.selectedPayout.requestId, {
      reason: this.rejectReason.trim()
    }).subscribe({
      next: () => {
        this.isProcessing = false;
        this.showRejectModal = false;
        this.selectedPayout = null;
        this.rejectReason = '';
        this.cdr.detectChanges();
        this.snackBar.open('Payout request rejected', 'Close', { duration: 4000, panelClass: ['bg-green-600', 'text-white'] });
        this.loadPayouts();
      },
      error: (err) => {
        this.isProcessing = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to reject payout';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }
}
