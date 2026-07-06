export interface SuperAdminDashboardOverviewResponse {
  systemStatus: string;
  platformRevenue: number;
  grossSales: number;
  instructorPayouts: number;
  stripeFees: number;
  payoutLiability: number;
  activeAdmins: number;
  pendingPayouts: number;
  revenueGrowthPercent: number;
  revenueChart: {
    labels: string[];
    data: number[];
  };
  criticalAlerts: {
    type: 'webhook_failure' | 'payout_backlog';
    service?: string;
    occurredCount?: number;
    lastOccurredAt?: Date;
    count?: number;
    oldestPendingDate?: Date;
  }[];
}

export interface SystemHealthResponse {
  apiStatus: string;
  averageResponseTimeMs: number | null;
  errorRateLast24h: number | null;
  webhookFailuresLast24h: number;
  lastWebhookFailure: {
    service: string;
    endpoint: string;
    errorMessage: string;
    occurredAt: Date;
  } | null;
}

export interface AdminListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string; // 'active' | 'deactivated'
  lastActiveAt: string | null;
  actionsThisMonth: number;
}

export interface InviteAdminPayload {
  firstName: string;
  lastName: string;
  email: string;
}

export interface InviteAdminResponse {
  message: string;
  email: string;
  expiresAt: string;
  emailSent: boolean;
  inviteUrl?: string;
}

export interface AdminActivityItem {
  action: string;
  targetId: string;
  targetLabel: string;
  createdAt: string;
}

export interface AdminActivityPaginatedResponse {
  data: AdminActivityItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PendingPayoutListItem {
  requestId: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  amount: number;
  earningsCount: number;
  requestedAt: string;
  /** The instructor's PayPal payout email (snapshot), if provided. */
  paypalEmail?: string | null;
  /** 'PENDING' (new), 'PROCESSING' (gateway payout in flight) or 'FAILED'. */
  status?: string;
  /** Why a gateway payout failed (present when status is FAILED). */
  failureReason?: string | null;
  /** PayPal payout batch id — shown for verification / status checks. */
  gatewayReference?: string | null;
}

export interface SyncPayoutResponse {
  requestId: string;
  status: string;
  detail?: string;
}

export interface PendingPayoutPaginatedResponse {
  data: PendingPayoutListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export type PayoutMethod = 'bank_transfer' | 'paypal';

/**
 * Both fields are optional: when the PayPal gateway is configured on the API,
 * the payout is automated and these are derived from the gateway. They are only
 * needed for the MANUAL fallback (gateway off) — the API enforces that.
 */
export interface ApprovePayoutPayload {
  method?: PayoutMethod;
  reference?: string;
}

export interface RejectPayoutPayload {
  reason: string;
}

export interface PayoutProcessResponse {
  requestId: string;
  instructorId: string;
  amount: number;
  status: string;
  processedBy: string;
  processedAt: string;
  reference?: string;
  note?: string;
}

export interface PlatformConfigResponse {
  platformFeePercent: number;
  instructorSharePercent: number;
  maintenanceMode: boolean;
  minimumPayoutThreshold: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface UpdatePlatformConfigDto {
  platformFeePercent?: number;
  maintenanceMode?: boolean;
  minimumPayoutThreshold?: number;
}

export interface AuditLogItem {
  id: string;
  action: string;
  performedBy: { id: string; name: string };
  targetUser: { id: string; name: string };
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogPaginatedResponse {
  data: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
