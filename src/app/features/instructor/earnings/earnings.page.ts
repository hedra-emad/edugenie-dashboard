import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { EarningsService } from './earnings.service';
import { EarningsPayoutResponse, StripeConnectInfo } from './earnings.models';

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
  isConnecting = false;
  isOpeningDashboard = false;
  data: EarningsPayoutResponse | null = null;

  ngOnInit() {
    this.loadPayouts();
  }

  get stripe(): StripeConnectInfo | null {
    return this.data?.stripe ?? null;
  }

  /** Whether the instructor can request a payout (onboarded + enough pending). */
  get payoutsEnabled(): boolean {
    return !!this.data?.stripe?.payoutsEnabled;
  }

  /** Start / resume Stripe Connect onboarding, then redirect to Stripe. */
  connectStripe() {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.cdr.detectChanges();

    this.earningsService.connectOnboard().subscribe({
      next: (res) => {
        // Full-page redirect to Stripe's hosted onboarding.
        window.location.href = res.url;
      },
      error: (err) => {
        this.isConnecting = false;
        this.cdr.detectChanges();
        const msg = err?.error?.message || 'Could not start Stripe onboarding';
        this.snackBar.open(Array.isArray(msg) ? msg[0] : msg, 'Close', {
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
   * Guarantees the full shape even if the API returns an older/partial payload,
   * so the template never reads properties off `undefined`.
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
      stripe: {
        hasAccount: r.stripe?.hasAccount ?? false,
        detailsSubmitted: r.stripe?.detailsSubmitted ?? false,
        chargesEnabled: r.stripe?.chargesEnabled ?? false,
        payoutsEnabled: r.stripe?.payoutsEnabled ?? false,
        balanceAvailable: r.stripe?.balanceAvailable ?? 0,
        balancePending: r.stripe?.balancePending ?? 0,
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

  /** Open the instructor's Stripe Express dashboard (balance + payout history). */
  openStripeDashboard() {
    if (this.isOpeningDashboard) return;
    this.isOpeningDashboard = true;
    this.cdr.detectChanges();

    this.earningsService.connectDashboard().subscribe({
      next: (res) => {
        this.isOpeningDashboard = false;
        this.cdr.detectChanges();
        window.open(res.url, '_blank', 'noopener');
      },
      error: (err) => {
        this.isOpeningDashboard = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Could not open Stripe dashboard';
        this.snackBar.open(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg, 'Close', {
          duration: 4000,
          panelClass: ['bg-red-600', 'text-white'],
        });
      },
    });
  }
}
