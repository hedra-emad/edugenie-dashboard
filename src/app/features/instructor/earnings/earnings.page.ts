import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { EarningsService } from './earnings.service';
import { EarningsPayoutResponse, PayoutMethodResponse } from './earnings.models';

@Component({
  selector: 'app-instructor-earnings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './earnings.page.html',
  styleUrl: './earnings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstructorEarningsPageComponent implements OnInit {
  private readonly earningsService = inject(EarningsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  isRequesting = false;
  data: EarningsPayoutResponse | null = null;

  // PayPal payout destination
  payoutMethod: PayoutMethodResponse | null = null;
  isEditingEmail = false;
  emailInput = '';
  isSavingEmail = false;

  ngOnInit() {
    this.loadPayouts();
    this.loadPayoutMethod();
  }

  get hasPayoutEmail(): boolean {
    return !!this.payoutMethod?.paypalEmail;
  }

  loadPayoutMethod() {
    this.earningsService.getPayoutMethod().subscribe({
      next: (res) => {
        this.payoutMethod = res;
        // Open the editor automatically when nothing is saved yet.
        this.isEditingEmail = !res?.paypalEmail;
        this.cdr.detectChanges();
      },
      error: () => {
        this.payoutMethod = { paypalEmail: null, updatedAt: null };
        this.isEditingEmail = true;
        this.cdr.detectChanges();
      },
    });
  }

  startEditEmail() {
    this.emailInput = '';
    this.isEditingEmail = true;
    this.cdr.detectChanges();
  }

  cancelEditEmail() {
    if (this.isSavingEmail) return;
    // Only allow cancel when an email already exists to fall back to.
    if (this.hasPayoutEmail) {
      this.isEditingEmail = false;
      this.emailInput = '';
      this.cdr.detectChanges();
    }
  }

  savePayoutEmail() {
    const email = this.emailInput.trim();
    if (!email || this.isSavingEmail) return;
    this.isSavingEmail = true;
    this.cdr.detectChanges();

    this.earningsService.setPayoutMethod(email).subscribe({
      next: (res) => {
        this.payoutMethod = res;
        this.isEditingEmail = false;
        this.emailInput = '';
        this.isSavingEmail = false;
        this.cdr.detectChanges();
        this.snackBar.open('PayPal email saved', 'Close', {
          duration: 3000,
          panelClass: ['bg-green-600', 'text-white'],
        });
      },
      error: (err) => {
        this.isSavingEmail = false;
        this.cdr.detectChanges();
        const msg = err?.error?.message || 'Failed to save PayPal email';
        this.snackBar.open(Array.isArray(msg) ? msg[0] : msg, 'Close', {
          duration: 4000,
          panelClass: ['bg-red-600', 'text-white'],
        });
      },
    });
  }

  clearPayoutEmail() {
    if (this.isSavingEmail) return;
    this.isSavingEmail = true;
    this.cdr.detectChanges();

    this.earningsService.clearPayoutMethod().subscribe({
      next: () => {
        this.payoutMethod = { paypalEmail: null, updatedAt: null };
        this.isEditingEmail = true;
        this.emailInput = '';
        this.isSavingEmail = false;
        this.cdr.detectChanges();
        this.snackBar.open('PayPal email removed', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.isSavingEmail = false;
        this.cdr.detectChanges();
        const msg = err?.error?.message || 'Failed to remove PayPal email';
        this.snackBar.open(msg, 'Close', {
          duration: 4000,
          panelClass: ['bg-red-600', 'text-white'],
        });
      },
    });
  }

  loadPayouts() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.earningsService.getMyPayouts().subscribe({
      next: (res) => {
        this.data = this.normalize(res);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load earnings', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load earnings', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Guarantees the full shape even if the API returns an older/partial payload
   * (e.g. before the new backend is deployed), so the template never reads
   * properties off `undefined`. Real values flow through once the new API is live.
   */
  private normalize(res: EarningsPayoutResponse): EarningsPayoutResponse {
    const r = (res ?? {}) as Partial<EarningsPayoutResponse> & {
      totalEarned?: number;
      pendingPayout?: number;
    };
    const totalEarned = r.totals?.totalEarned ?? r.totalEarned ?? 0;
    const pending = r.totals?.pending ?? r.pendingPayout ?? 0;
    return {
      config: {
        instructorSharePercent: r.config?.instructorSharePercent ?? 80,
        platformFeePercent: r.config?.platformFeePercent ?? 20,
        minimumPayoutThreshold: r.config?.minimumPayoutThreshold ?? 50,
      },
      totals: {
        totalEarned,
        pending,
        inReview: r.totals?.inReview ?? 0,
        paidOut: r.totals?.paidOut ?? 0,
      },
      totalEarned,
      pendingPayout: pending,
      canRequest: r.canRequest ?? false,
      openRequest: r.openRequest ?? null,
      breakdown: {
        fromFullCourses: r.breakdown?.fromFullCourses ?? 0,
        fromSections: r.breakdown?.fromSections ?? 0,
      },
      requests: Array.isArray(r.requests) ? r.requests : [],
      history: Array.isArray(r.history)
        ? r.history.map((h) => ({
            date: h.date,
            amount: h.amount ?? 0,
            status: h.status ?? 'PENDING',
            type: h.type ?? 'full_course',
            courseTitle: h.courseTitle ?? 'Course',
            sectionTitle: h.sectionTitle ?? null,
            orderId: h.orderId ?? '',
          }))
        : [],
    };
  }

  requestPayout() {
    if (!this.data?.canRequest || this.isRequesting) return;
    if (!this.hasPayoutEmail) {
      this.snackBar.open('Add a PayPal payout email first.', 'Close', {
        duration: 4000,
        panelClass: ['bg-red-600', 'text-white'],
      });
      return;
    }
    this.isRequesting = true;
    this.cdr.detectChanges();

    this.earningsService.requestPayout().subscribe({
      next: () => {
        this.isRequesting = false;
        this.cdr.detectChanges();
        this.snackBar.open('Payout requested', 'Close', { duration: 4000, panelClass: ['bg-green-600', 'text-white'] });
        this.loadPayouts();
      },
      error: (err) => {
        this.isRequesting = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to request payout';
        this.snackBar.open(errorMsg, 'Close', { duration: 4000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }
}
