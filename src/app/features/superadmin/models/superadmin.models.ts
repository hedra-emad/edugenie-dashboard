export interface SuperAdminDashboardOverviewResponse {
  systemStatus: string;
  platformRevenue: number;
  payoutLiability: number;
  activeAdmins: number;
  pendingPayouts: number;
  criticalAlerts: Array<{
    type: 'webhook_failure' | 'payout_backlog';
    service?: string;
    occurredCount?: number;
    lastOccurredAt?: Date;
    count?: number;
    oldestPendingDate?: Date;
  }>;
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
  instructorId: string;
  instructorName: string;
  amount: number;
  earningsCount: number;
  periodStart: string;
  periodEnd: string;
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

export interface PayoutProcessResponse {
  instructorId: string;
  amount: number;
  status: string;
  processedBy: string;
  processedAt: string;
  reference: string;
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
