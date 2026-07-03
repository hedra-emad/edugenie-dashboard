import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EarningsService } from './earnings.service';
import { EarningsPayoutResponse } from './earnings.models';

@Component({
  selector: 'app-instructor-earnings',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
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

  ngOnInit() {
    this.loadPayouts();
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
