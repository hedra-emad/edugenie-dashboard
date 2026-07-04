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
  approveMethod: PayoutMethod = 'bank_transfer';
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
    this.approveMethod = 'bank_transfer';
    this.approveReference = '';
    this.showApproveModal = true;
  }

  closeApproveModal() {
    if (this.isProcessing) return;
    this.showApproveModal = false;
    this.selectedPayout = null;
    this.approveMethod = 'bank_transfer';
    this.approveReference = '';
  }

  get canConfirmApprove(): boolean {
    return this.approveReference.trim().length > 0;
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

    this.superadminService.approvePayout(this.selectedPayout.requestId, {
      method: this.approveMethod,
      reference: this.approveReference.trim()
    }).subscribe({
      next: (res: PayoutProcessResponse) => {
        this.isProcessing = false;
        this.showApproveModal = false;
        this.selectedPayout = null;
        this.approveMethod = 'bank_transfer';
        this.approveReference = '';
        this.cdr.detectChanges();
        this.snackBar.open(`Payout approved (Ref: ${res.reference})`, 'Close', { duration: 4000, panelClass: ['bg-green-600', 'text-white'] });
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
