import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { PendingPayoutListItem, PayoutProcessResponse } from '../../models/superadmin.models';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-payouts',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule, PaginationComponent],
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

  // Modal State
  showProcessModal = false;
  selectedPayout: PendingPayoutListItem | null = null;
  isProcessing = false;

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

  openProcessModal(payout: PendingPayoutListItem) {
    this.selectedPayout = payout;
    this.showProcessModal = true;
  }

  closeProcessModal() {
    if (this.isProcessing) return;
    this.showProcessModal = false;
    this.selectedPayout = null;
  }

  confirmProcess() {
    if (!this.selectedPayout) return;
    this.isProcessing = true;
    this.cdr.detectChanges();

    this.superadminService.processPayout(this.selectedPayout.instructorId, this.selectedPayout.amount).subscribe({
      next: (res: PayoutProcessResponse) => {
        this.isProcessing = false;
        this.showProcessModal = false;
        this.selectedPayout = null;
        this.cdr.detectChanges();
        this.snackBar.open(`Payout processed (Ref: ${res.reference})`, 'Close', { duration: 4000, panelClass: ['bg-green-600', 'text-white'] });
        this.loadPayouts();
      },
      error: (err) => {
        this.isProcessing = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to process payout';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }
}
