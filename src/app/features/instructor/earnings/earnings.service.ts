import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EarningsPayoutResponse, RequestPayoutResponse } from './earnings.models';

@Injectable({
  providedIn: 'root'
})
export class EarningsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/earnings';

  /** Instructor's own earnings summary, payout state, history and requests. */
  getMyPayouts(): Observable<EarningsPayoutResponse> {
    return this.http.get<EarningsPayoutResponse>(`${this.baseUrl}/my-payouts`);
  }

  /** Request a payout of the currently-available (cleared) share. */
  requestPayout(): Observable<RequestPayoutResponse> {
    return this.http.post<RequestPayoutResponse>(`${this.baseUrl}/request-payout`, {});
  }
}
