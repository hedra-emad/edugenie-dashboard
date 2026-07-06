import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { EarningsService } from '../earnings/earnings.service';
import { StripeConnectInfo } from '../earnings/earnings.models';

/**
 * Landing page Stripe returns to after Connect onboarding. Reads the live
 * connection status and tells the instructor whether payouts are now enabled.
 */
@Component({
  selector: 'app-stripe-callback',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-lg mx-auto mt-10">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-4">
        @if (loading()) {
        <mat-icon class="animate-spin text-slate-400 !w-10 !h-10 !text-[40px]">autorenew</mat-icon>
        <p class="text-slate-600">Checking your Stripe status…</p>
        } @else if (status()?.payoutsEnabled) {
        <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <mat-icon class="!w-8 !h-8 !text-[32px]">check_circle</mat-icon>
        </div>
        <h1 class="text-xl font-bold text-slate-800">Payouts enabled 🎉</h1>
        <p class="text-slate-500">Your Stripe account is ready. You can now request payouts.</p>
        } @else {
        <div class="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
          <mat-icon class="!w-8 !h-8 !text-[32px]">hourglass_top</mat-icon>
        </div>
        <h1 class="text-xl font-bold text-slate-800">Almost there</h1>
        <p class="text-slate-500">
          Stripe hasn't finished verifying your account yet. Reopen setup from the Earnings
          page to complete the remaining steps.
        </p>
        }
        <a routerLink="/earnings" class="btn-primary mt-2">
          <mat-icon class="!w-4 !h-4 !text-[16px]">arrow_back</mat-icon>
          Back to Earnings
        </a>
      </div>
    </div>
  `,
})
export class StripeCallbackPageComponent implements OnInit {
  private readonly earnings = inject(EarningsService);

  loading = signal(true);
  status = signal<StripeConnectInfo | null>(null);

  ngOnInit() {
    this.earnings.connectStatus().subscribe({
      next: (s) => {
        this.status.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
