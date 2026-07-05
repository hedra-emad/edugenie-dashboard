export interface EarningsConfig {
  instructorSharePercent: number;
  platformFeePercent: number;
  minimumPayoutThreshold: number;
}

export interface EarningsTotals {
  totalEarned: number;
  pending: number;
  inReview: number;
  paidOut: number;
}

export type PayoutRequestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED';

/** The instructor's saved PayPal payout destination (email is masked). */
export interface PayoutMethodResponse {
  paypalEmail: string | null;
  updatedAt: string | null;
}

export interface OpenPayoutRequest {
  id: string;
  amount: number;
  earningsCount: number;
  status: PayoutRequestStatus;
  requestedAt: string;
}

export interface EarningsBreakdown {
  fromFullCourses: number;
  fromSections: number;
}

export interface PayoutRequestItem {
  id: string;
  amount: number;
  earningsCount: number;
  status: PayoutRequestStatus;
  method: string | null;
  reference: string | null;
  gatewayReference?: string | null;
  failureReason?: string | null;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export type EarningsHistoryStatus = 'PENDING' | 'CLEARED' | 'REQUESTED' | 'PAID_OUT';
export type EarningsHistoryType = 'full_course' | 'section';

export interface EarningsHistoryItem {
  date: string;
  amount: number;
  status: EarningsHistoryStatus;
  type: EarningsHistoryType;
  courseTitle: string;
  sectionTitle: string | null;
  orderId: string;
}

export interface EarningsPayoutResponse {
  config: EarningsConfig;
  totals: EarningsTotals;
  /** back-compat alias for totals.totalEarned */
  totalEarned: number;
  /** back-compat alias for totals.pending */
  pendingPayout: number;
  canRequest: boolean;
  openRequest: OpenPayoutRequest | null;
  breakdown: EarningsBreakdown;
  requests: PayoutRequestItem[];
  history: EarningsHistoryItem[];
}

export interface RequestPayoutResponse {
  id: string;
  amount: number;
  earningsCount: number;
  status: PayoutRequestStatus;
  requestedAt: string;
}
