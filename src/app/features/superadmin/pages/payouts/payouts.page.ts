import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { InstructorStripeBalance } from '../../models/superadmin.models';

@Component({
  selector: 'app-payouts',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './payouts.page.html',
  styleUrl: './payouts.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayoutsPageComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  balances: InstructorStripeBalance[] = [];

  ngOnInit() {
    this.loadBalances();
  }

  loadBalances() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.superadminService.getInstructorStripeBalances().subscribe({
      next: (res) => {
        this.balances = res.data ?? [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load instructor Stripe balances', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load instructor balances', 'Close', { duration: 3000 });
      }
    });
  }

  /** Total available balance across all payout-ready instructors (header stat). */
  get totalAvailable(): number {
    return this.balances.reduce((sum, b) => sum + (b.balanceAvailable || 0), 0);
  }

  statusLabel(status: InstructorStripeBalance['status']): string {
    return status === 'enabled'
      ? 'Payouts enabled'
      : status === 'onboarding'
        ? 'Onboarding'
        : 'Not connected';
  }
}
