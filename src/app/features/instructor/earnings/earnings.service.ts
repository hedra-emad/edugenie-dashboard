import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EarningsPayoutResponse,
  ConnectOnboardResponse,
  StripeConnectInfo,
  RequestPayoutResponse,
} from './earnings.models';

@Injectable({
  providedIn: 'root',
})
export class EarningsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/earnings';

  /** Instructor's own earnings summary, Stripe balance, history and requests. */
  getMyPayouts(): Observable<EarningsPayoutResponse> {
    return this.http.get<EarningsPayoutResponse>(`${this.baseUrl}/my-payouts`);
  }

  /** Request a payout of the currently-pending share (superadmin approves). */
  requestPayout(): Observable<RequestPayoutResponse> {
    return this.http.post<RequestPayoutResponse>(
      `${this.baseUrl}/request-payout`,
      {},
    );
  }

  /** Start / resume Stripe Connect onboarding — returns a hosted link URL. */
  connectOnboard(): Observable<ConnectOnboardResponse> {
    return this.http.post<ConnectOnboardResponse>(
      `${this.baseUrl}/connect/onboard`,
      {},
    );
  }

  /** Current Stripe Connect onboarding + balance status. */
  connectStatus(): Observable<StripeConnectInfo> {
    return this.http.get<StripeConnectInfo>(`${this.baseUrl}/connect/status`);
  }

  /** One-time link to the instructor's Stripe Express dashboard (payout history). */
  connectDashboard(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/connect/dashboard`);
  }
}
